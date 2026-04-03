import { describe, expect, it } from 'vitest'
import assert from 'assert'
import * as cli from '../lib/cli.js'
import * as api from '../lib/Interfaces.js'
import * as db from '../lib/crewdb.js'
import cfg from '../config.js'

function defaultContext(
  userId = '-100',
  username = 'refactor-test',
  extras: Partial<api.Context> = {}
): api.Context {
  const channel: Record<string, unknown> = {
    id: userId,
    name: 'test channel',
    send: () => {},
  }

  return {
    author: { username, id: userId },
    channel: channel as unknown as api.CommandChannel,
    fleetId: userId,
    isEntitled: () => true,
    emojify: (x: string) => x,
    boldify: (x: string) => x,
    sender: channel as unknown as api.CommandChannel,
    ...extras,
  }
}

function sendCommand(cmd: string, context?: api.Context): Promise<string> {
  assert(cli.isCliSentence(cmd))
  return cli.sendCommand(cmd, context ?? defaultContext())
}

async function getUserDoc(userId: string): Promise<any> {
  return new Promise((resolve) => {
    db.users.findOne({ _id: userId }, (_err: unknown, doc: unknown) => {
      resolve(doc)
    })
  })
}

describe('refactor safety net', () => {
  it('registers expected slash commands and excludes hidden ones', () => {
    const slashNames = cli.slashCommands.map((command) => command.name)

    expect(slashNames).toContain('hello')
    expect(slashNames).toContain('setup')
    expect(slashNames).toContain('boss')
    expect(slashNames).toContain('estats')
    expect(slashNames).not.toContain('++')
  })

  it('supports the plusplus command through the cli registry', async () => {
    const data = await sendCommand('-dev bot ++')
    expect(data).toContain(`<@${cfg.adminId}> ++ deserves the karma`)
  })

  it('updates fleet and personal bonuses', async () => {
    const ctx = defaultContext('-201', 'bonus-test')

    let data = await sendCommand('-dev bot bonus fleetbase 1 2 3 4 5 6', ctx)
    expect(data).toContain('Starbase bonus at')
    expect(data).toContain('cmd+1%')
    expect(data).toContain('sci+6%')

    data = await sendCommand('-dev bot bonus mybase 7 8 9 10 11 12', ctx)
    expect(data).toContain('Personal base bonus at')
    expect(data).toContain('cmd+7%')
    expect(data).toContain('sci+12%')
  })

  it('updates crew stats for owned crew', async () => {
    const ctx = defaultContext('-202', 'crewstat-test')

    let data = await sendCommand('-dev bot crew add rog win -s2', ctx)
    expect(data).toContain('Rogue Kai Winn')

    data = await sendCommand('-dev bot crewstat cmd 999 111 222 rog win', ctx)
    expect(data).toContain(
      'I have updated cmd for Rogue Kai Winn to 999+(111-222)'
    )

    const doc = await getUserDoc('-202')
    const char = doc.crew.find(
      (entry: { name: string }) => entry.name === 'Rogue Kai Winn'
    )
    expect(char.cmd.base).toBe(999)
    expect(char.cmd.minroll).toBe(111)
    expect(char.cmd.maxroll).toBe(222)
  })

  it('reports mission drop information', async () => {
    const ctx = defaultContext('-203', 'drop-test')
    const data = await sendCommand(
      '-dev bot drop "Assault and Battery" elite',
      ctx
    )

    expect(data).toContain('Wiki provided drop rates')
    expect(data).toContain('Assault and Battery')
  })

  it('blocks setup for non-admin users', async () => {
    const ctx = defaultContext('-204', 'setup-test')
    const data = await sendCommand('-dev bot setup', ctx)

    expect(data).toContain('Only the server administrator can perform setup')
  })

  it('lists deployments when whereami receives a bot context', async () => {
    const botServer = {
      members: {
        fetch: async (_id?: string) => ({ displayName: 'Owner Name' }),
        cache: {
          has: (id: string) => id === 'owner-1',
        },
      },
    }

    const fakeBot = {
      guilds: {
        fetch: async (id: string) => {
          expect(id).toBe(cfg.botServer)
          return botServer
        },
        cache: {
          size: 2,
          map: (
            fn: (guild: {
              name: string
              ownerId: string
              members: {
                fetch: (id: string) => Promise<{ displayName: string }>
              }
            }) => Promise<string>
          ) =>
            [
              {
                name: 'Alpha Fleet',
                ownerId: 'owner-1',
                members: {
                  fetch: async () => ({ displayName: 'Alpha Owner' }),
                },
              },
              {
                name: 'Beta Fleet',
                ownerId: 'owner-2',
                members: { fetch: async () => ({ displayName: 'Beta Owner' }) },
              },
            ].map(fn),
        },
      },
    }

    const ctx = defaultContext('-205', 'where-test', {
      bot: fakeBot as unknown as api.Context['bot'],
    })
    const data = await sendCommand('-dev bot whereami', ctx)

    expect(data).toContain('I am in the following 2 servers')
    expect(data).toContain('✓ Alpha Fleet - Alpha Owner')
    expect(data).toContain('❌ Beta Fleet - Beta Owner')
  })
})
