import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.unstubAllGlobals()
})

describe('slash deployment transport', () => {
  it('deploys slash commands through the Discord REST client', async () => {
    const put = vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }])
    const setToken = vi.fn().mockReturnValue({ put })

    vi.doMock('../lib/cli.js', () => ({
      slashCommands: [{ toJSON: () => ({ name: 'hello' }) }],
    }))
    vi.doMock('discord.js', () => ({
      REST: vi.fn(() => ({ setToken })),
      Routes: {
        applicationGuildCommands: (clientId: string, guildId: string) =>
          `/applications/${clientId}/guilds/${guildId}/commands`,
      },
    }))

    const { deploySlash } = await import('../lib/slashdeploy.js')
    const result = await deploySlash('guild-1')

    expect(put).toHaveBeenCalledWith(
      '/applications/292300900209524746/guilds/guild-1/commands',
      { body: [{ name: 'hello' }] }
    )
    expect(result).toContain('Successfully reloaded 2')
  })

  it('undeploys existing slash commands through the Discord REST client', async () => {
    const get = vi.fn().mockResolvedValue([{ id: 'cmd-1' }, { id: 'cmd-2' }])
    const del = vi.fn().mockResolvedValue(undefined)
    const setToken = vi.fn().mockReturnValue({ get, delete: del })

    vi.doMock('../lib/cli.js', () => ({ slashCommands: [] }))
    vi.doMock('discord.js', () => ({
      REST: vi.fn(() => ({ setToken })),
      Routes: {
        applicationGuildCommands: (clientId: string, guildId: string) =>
          `/applications/${clientId}/guilds/${guildId}/commands`,
      },
    }))

    const { undeploySlash } = await import('../lib/slashdeploy.js')
    const result = await undeploySlash('guild-2')

    expect(get).toHaveBeenCalledWith(
      '/applications/292300900209524746/guilds/guild-2/commands'
    )
    expect(del).toHaveBeenNthCalledWith(
      1,
      '/applications/292300900209524746/guilds/guild-2/commands/cmd-1'
    )
    expect(del).toHaveBeenNthCalledWith(
      2,
      '/applications/292300900209524746/guilds/guild-2/commands/cmd-2'
    )
    expect(result).toBe('Slash commands unregistered')
  })
})

describe('webserver transport', () => {
  it('registers command and user routes and forwards command requests', async () => {
    const routes = {
      get: new Map<string, (req: unknown, res: unknown) => void>(),
      post: new Map<string, (req: unknown, res: unknown) => void>(),
    }
    const use = vi.fn()
    const listen = vi.fn((_port: number, cb: () => void) => cb())

    const expressApp = {
      use,
      get: vi.fn(
        (path: string, handler: (req: unknown, res: unknown) => void) => {
          routes.get.set(path, handler)
        }
      ),
      post: vi.fn(
        (path: string, handler: (req: unknown, res: unknown) => void) => {
          routes.post.set(path, handler)
        }
      ),
      listen,
    }

    const expressMock = Object.assign(
      vi.fn(() => expressApp),
      { static: vi.fn(() => 'static-middleware') }
    )

    const sendCommand = vi.fn().mockResolvedValue('hello from cli')
    const commands = vi.fn().mockReturnValue({ hello: { name: 'hello' } })
    const find = vi.fn((_query, _projection, cb) =>
      cb(null, [{ _id: 'u1', username: 'user one' }])
    )
    const findOne = vi.fn((query, cb) =>
      cb(
        null,
        query._id === 'missing'
          ? null
          : { _id: query._id, username: 'known', crew: [] }
      )
    )

    vi.doMock('express', () => ({ default: expressMock }))
    vi.doMock('body-parser', () => ({
      default: { json: vi.fn(() => 'json-middleware') },
    }))
    vi.doMock('../lib/cli.js', () => ({ sendCommand, commands }))
    vi.doMock('../lib/crewdb.js', () => ({
      users: { find, findOne },
    }))

    await import('../lib/webserver.js')

    expect(routes.get.has('/')).toBe(true)
    expect(routes.get.has('/users')).toBe(true)
    expect(routes.get.has('/user/:userId')).toBe(true)
    expect(routes.get.has('/commands')).toBe(true)
    expect(routes.post.has('/command')).toBe(true)

    const commandRes = { json: vi.fn() }
    await routes.post.get('/command')!(
      { body: { command: 'hello' } },
      commandRes
    )
    expect(sendCommand).toHaveBeenCalledWith(
      '-dev bot hello',
      expect.objectContaining({
        fleetId: '-1',
        author: { username: 'test', id: '-1' },
      })
    )
    expect(commandRes.json).toHaveBeenCalledWith({
      message: 'hello from cli',
      embed: undefined,
    })

    const userRes = { json: vi.fn() }
    routes.get.get('/user/:userId')!({ params: { userId: 'missing' } }, userRes)
    expect(userRes.json).toHaveBeenCalledWith({
      _id: 'missing',
      username: 'anonymous',
      crew: [],
    })

    const commandsRes = { json: vi.fn() }
    routes.get.get('/commands')!({}, commandsRes)
    expect(commandsRes.json).toHaveBeenCalledWith({ hello: { name: 'hello' } })
  })
})

describe('discord runtime transport', () => {
  async function loadIndexHarness() {
    const handlers = new Map<string, (arg: unknown) => void>()
    const login = vi.fn().mockResolvedValue(undefined)
    const helloFn = vi.fn().mockResolvedValue('slash-response')
    const estatsFn = vi.fn(
      async (_argv: unknown, context: { embed?: { title: string } }) => {
        context.embed = { title: 'embed-title' }
        return 'EMBED'
      }
    )
    const commandsMap = {
      hello: {
        fn: helloFn,
        args: [{ name: 'name', type: 'string', required: false }],
        flags: {
          loud: {
            name: 'loud',
            type: 'boolean',
            default: false,
            required: false,
          },
        },
      },
      estats: {
        fn: estatsFn,
        args: [],
        flags: {},
      },
    }
    const clientInstance = {
      on: vi.fn((event: string, handler: (arg: unknown) => void) => {
        handlers.set(event, handler)
      }),
      login,
      guilds: {
        cache: {
          get: vi.fn(() => ({
            members: { cache: { has: vi.fn(() => true) } },
          })),
        },
        fetch: vi.fn().mockResolvedValue({
          members: { fetch: vi.fn().mockResolvedValue(undefined) },
        }),
      },
      channels: {
        fetch: vi.fn(),
        cache: { get: vi.fn() },
      },
      emojis: { cache: { find: vi.fn(() => null) } },
      user: { id: 'bot-user' },
    }

    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      () => 0 as unknown as ReturnType<typeof setTimeout>
    )

    vi.doMock('../lib/webserver.js', () => ({
      dummyChannel: {
        id: '-2',
        name: 'dummy',
        send: vi.fn(),
      },
      default: {},
    }))
    vi.doMock('../lib/cli.js', () => ({
      isCliSentence: vi.fn((content: string) => content.startsWith('-dev bot')),
      sendCommand: vi.fn().mockResolvedValue('trimmed-response'),
      commands: vi.fn(() => commandsMap),
    }))
    vi.doMock('../lib/fleetdb.js', () => ({
      get: vi.fn().mockResolvedValue({ prefix: '-fleet bot' }),
    }))
    vi.doMock('winston', () => ({
      default: {
        loggers: {
          has: vi.fn(() => true),
          add: vi.fn(() => ({ info: vi.fn() })),
          get: vi.fn(() => ({ info: vi.fn() })),
        },
        transports: { File: vi.fn() },
      },
    }))
    vi.doMock('mkdirp', () => ({
      mkdirp: vi.fn().mockResolvedValue(undefined),
    }))
    vi.doMock('moment', () => ({
      default: vi.fn(() => ({ format: () => 'time' })),
    }))
    vi.doMock('node-schedule', () => ({
      default: { scheduleJob: vi.fn() },
    }))
    vi.doMock('child_process', () => ({
      spawn: vi.fn(() => ({
        stdout: { pipe: vi.fn() },
        on: vi.fn(),
      })),
    }))
    vi.doMock('fs', () => ({
      createWriteStream: vi.fn(() => ({ write: vi.fn() })),
    }))
    vi.doMock('discord.js', () => {
      class Client {
        constructor() {
          return clientInstance
        }
      }

      return {
        Client,
        GatewayIntentBits: {
          Guilds: 1,
          GuildMembers: 2,
          DirectMessages: 3,
          MessageContent: 4,
          GuildMessages: 5,
        },
        Partials: { Channel: 'Channel' },
        Events: { InteractionCreate: 'interactionCreate' },
      }
    })

    await import('../lib/index.js')
    const cliModule = await import('../lib/cli.js')

    return {
      handlers,
      clientInstance,
      cliModule,
      commandsMap,
    }
  }

  it('routes prefixed messages through the CLI command path', async () => {
    const { handlers, cliModule } = await loadIndexHarness()
    const send = vi.fn()

    const msg = {
      content: '-fleet bot hello',
      cleanContent: '-fleet bot hello',
      author: { username: 'tester', id: 'user-1' },
      channel: {
        name: 'general',
        guild: {
          id: 'fleet-1',
          name: 'Test Fleet',
          emojis: { cache: { find: vi.fn(() => null) } },
        },
        send,
      },
      guild: { id: 'fleet-1', name: 'Test Fleet' },
      client: { emojis: { cache: { find: vi.fn(() => null) } } },
      mentions: { has: vi.fn(() => false), everyone: false },
      inGuild: () => true,
    }

    await handlers.get('messageCreate')!(msg)
    await Promise.resolve()
    await Promise.resolve()

    expect(cliModule.sendCommand).toHaveBeenCalledWith(
      '-dev bot hello',
      expect.objectContaining({ fleetId: 'fleet-1' })
    )
    expect(send).toHaveBeenCalledWith('trimmed-response')
  })

  it('translates slash command options into CLI argv and edits the reply', async () => {
    const { handlers, commandsMap } = await loadIndexHarness()
    const editReply = vi.fn()
    const deferReply = vi.fn().mockResolvedValue(undefined)

    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'hello',
      user: { username: 'slash-user', id: 'user-2' },
      channel: {
        isSendable: () => true,
        guild: {
          id: 'fleet-2',
          emojis: { cache: { find: vi.fn(() => null) } },
        },
      },
      guild: { id: 'fleet-2' },
      client: { emojis: { cache: { find: vi.fn(() => null) } } },
      inGuild: () => true,
      options: {
        getString: vi.fn((name: string) => (name === 'name' ? 'Spock' : null)),
        getNumber: vi.fn(() => null),
        getBoolean: vi.fn((name: string) => (name === 'loud' ? true : null)),
        getSubcommand: vi.fn(),
      },
      deferReply,
      editReply,
    }

    await handlers.get('interactionCreate')!(interaction)

    expect(commandsMap.hello.fn).toHaveBeenCalledWith(
      {
        args: { name: 'Spock' },
        flags: { loud: true },
      },
      expect.objectContaining({ fleetId: 'fleet-2' })
    )
    expect(deferReply).toHaveBeenCalled()
    expect(editReply).toHaveBeenCalledWith('slash-response')
  })

  it('sends embeds for slash commands that return EMBED', async () => {
    const { handlers } = await loadIndexHarness()
    const editReply = vi.fn()

    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'estats',
      user: { username: 'slash-user', id: 'user-3' },
      channel: {
        isSendable: () => true,
        guild: {
          id: 'fleet-3',
          emojis: { cache: { find: vi.fn(() => null) } },
        },
      },
      guild: { id: 'fleet-3' },
      client: { emojis: { cache: { find: vi.fn(() => null) } } },
      inGuild: () => true,
      options: {
        getString: vi.fn(() => null),
        getNumber: vi.fn(() => null),
        getBoolean: vi.fn(() => null),
        getSubcommand: vi.fn(),
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply,
    }

    await handlers.get('interactionCreate')!(interaction)

    expect(editReply).toHaveBeenCalledWith({
      embeds: [{ title: 'embed-title' }],
    })
  })
})
