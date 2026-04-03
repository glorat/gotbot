import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Clapp from '../lib/modules/clapp/index.js'

const noop = () => ''

afterEach(() => {
  vi.useRealTimers()
})

describe('Clapp.App', () => {
  it('creates apps, supports versions, and adds commands', () => {
    const foo = new Clapp.Command({
      name: 'foo',
      desc: 'desc',
      fn: noop,
    })
    const bar = new Clapp.Command({
      name: 'bar',
      desc: 'desc',
      fn: noop,
    })

    const app = new Clapp.App({
      name: 'test',
      desc: 'desc',
      prefix: '/app',
      version: '1.0',
      onReply: () => {},
      commands: [foo],
    })

    app.addCommand(bar)

    expect(app).toBeInstanceOf(Clapp.App)
    expect(app.version).toBe('1.0')
    expect(app.commands.foo).toBeInstanceOf(Clapp.Command)
    expect(app.commands.bar).toBeInstanceOf(Clapp.Command)
  })

  it('supports custom separators and custom strings', () => {
    let executed = false
    let response = ''

    const app = new Clapp.App({
      name: 'test',
      desc: 'desc',
      prefix: '/',
      separator: '',
      strings: {
        help_usage: 'CUSTOM_STRING',
      },
      onReply: (msg) => {
        response = msg
      },
    })

    app.addCommand(
      new Clapp.Command({
        name: 'foo',
        desc: 'desc',
        fn: () => {
          executed = true
          return ''
        },
      })
    )

    app.parseInput('/foo')
    expect(executed).toBe(true)

    app.parseInput('/')
    expect(response).toContain('CUSTOM_STRING')
  })

  describe('#parseInput()', () => {
    it('executes commands and passes flags and arguments', () => {
      let executed = false
      let passedArgv: Clapp.Argv | undefined

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: () => {},
        commands: [
          new Clapp.Command({
            name: 'foo',
            desc: 'desc',
            fn: (argv) => {
              executed = true
              passedArgv = argv
              return ''
            },
            args: [
              {
                name: 'testarg',
                desc: 'A test argument',
                type: 'string',
                required: true,
              },
            ],
            flags: [
              {
                name: 'testflag',
                desc: 'A test flag',
                alias: 't',
                type: 'boolean',
                default: false,
              },
            ],
          }),
        ],
      })

      app.parseInput('/app foo argument -t')

      expect(executed).toBe(true)
      expect(passedArgv).toBeDefined()
      expect(passedArgv?.args.testarg).toBe('argument')
      expect(passedArgv?.flags.testflag).toBe(true)
    })

    it('preserves quoted arguments and quoted flag values', () => {
      const replies: string[] = []

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg) => {
          replies.push(msg)
        },
        commands: [
          new Clapp.Command({
            name: 'echo',
            desc: 'desc',
            fn: (argv) =>
              `${argv.args.message}|${argv.flags.label}|${argv.flags.count}`,
            args: [
              {
                name: 'message',
                desc: 'desc',
                type: 'string',
                required: true,
              },
            ],
            flags: [
              {
                name: 'label',
                desc: 'desc',
                type: 'string',
                default: '',
              },
              {
                name: 'count',
                desc: 'desc',
                type: 'number',
                default: 0,
              },
            ],
          }),
        ],
      })

      app.parseInput(
        '/app echo "hello world" --label="quoted value" --count 12'
      )

      expect(replies[0]).toBe('hello world|quoted value|12')
    })

    it('supports attached short flag values and repeated short booleans', () => {
      let reply = ''

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg) => {
          reply = msg
        },
        commands: [
          new Clapp.Command({
            name: 'short',
            desc: 'desc',
            fn: (argv) =>
              `${argv.flags.stars}|${argv.flags.full ? 'full' : 'not-full'}`,
            flags: [
              {
                name: 'stars',
                desc: 'desc',
                alias: 's',
                type: 'number',
                default: 0,
              },
              {
                name: 'full',
                desc: 'desc',
                alias: 'f',
                type: 'boolean',
                default: false,
              },
            ],
          }),
        ],
      })

      app.parseInput('/app short -s2 -ff')

      expect(reply).toBe('2|full')
    })

    it('allows context modifications when returning messages or context only', () => {
      const seenContexts: unknown[] = []

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (_msg, context) => {
          seenContexts.push(context)
        },
        commands: [
          new Clapp.Command({
            name: 'with-message',
            desc: 'desc',
            fn: (_argv, context) => {
              ;(context as string[]).push('b')
              return {
                message: 'return message',
                context,
              }
            },
          }),
          new Clapp.Command({
            name: 'without-message',
            desc: 'desc',
            fn: (_argv, context) => {
              ;(context as string[]).push('c')
              return {
                message: '',
                context,
              }
            },
          }),
        ],
      })

      app.parseInput('/app with-message', ['a'])
      app.parseInput('/app without-message', ['a'])

      expect(seenContexts).toEqual([
        ['a', 'b'],
        ['a', 'c'],
      ])
    })

    it('shows app version, app help, and command help', () => {
      const replies: string[] = []
      const foo = new Clapp.Command({
        name: 'foo',
        desc: 'does foo things',
        fn: noop,
      })

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        version: '1.2.3',
        onReply: (msg) => {
          replies.push(msg)
        },
        commands: [foo],
      })

      app.parseInput('/app --version')
      app.parseInput('/app --help')
      app.parseInput('/app foo --help')

      expect(replies[0]).toBe('v1.2.3')
      expect(replies[1]).toContain('test v1.2.3')
      expect(replies[2]).toContain('does foo things')
    })

    it('passes default values and reports validation failures', () => {
      const replies: string[] = []
      let passedDefaults = false

      const app = new Clapp.App({
        name: 'testapp',
        desc: 'desc',
        prefix: 'p',
        onReply: (msg) => {
          replies.push(msg)
        },
        commands: [
          new Clapp.Command({
            name: 'defaults',
            desc: 'desc',
            fn: (argv) => {
              passedDefaults =
                argv.args.testarg === 'defaultval' &&
                argv.flags.testflag === 123
              return ''
            },
            args: [
              {
                name: 'testarg',
                type: 'string',
                desc: 'desc',
                required: false,
                default: 'defaultval',
              },
            ],
            flags: [
              {
                name: 'testflag',
                type: 'number',
                desc: 'desc',
                default: 123,
              },
            ],
          }),
          new Clapp.Command({
            name: 'invalid',
            desc: 'desc',
            fn: noop,
            args: [
              {
                name: 'testarg',
                type: 'string',
                desc: 'desc',
                required: false,
                default: 'defaultval',
                validations: [
                  {
                    errorMessage: 'firstError',
                    validate: () => false,
                  },
                ],
              },
            ],
            flags: [
              {
                name: 'testflag',
                type: 'number',
                desc: 'desc',
                default: 123,
                validations: [
                  {
                    errorMessage: 'secondError',
                    validate: () => false,
                  },
                ],
              },
            ],
          }),
        ],
      })

      app.parseInput('p defaults')
      app.parseInput('p invalid')

      expect(passedDefaults).toBe(true)
      expect(replies[1]).toContain('firstError')
      expect(replies[1]).toContain('secondError')
    })

    it('supports case insensitive prefixes, commands, and flags', () => {
      let prefixHelp = ''
      let cmdReply = ''
      let flagReply = ''

      const prefixApp = new Clapp.App({
        name: 'testapp',
        desc: 'desc',
        prefix: 'tEsTaPp',
        caseSensitive: false,
        onReply: (msg) => {
          prefixHelp = msg
        },
      })
      prefixApp.parseInput('TESTAPP')
      expect(prefixHelp).toBe(prefixApp._getHelp())

      const commandApp = new Clapp.App({
        name: 'testapp',
        desc: 'desc',
        prefix: 'testapp',
        onReply: (msg) => {
          cmdReply = msg
        },
        commands: [
          new Clapp.Command({
            name: 'fOo',
            desc: 'desc',
            caseSensitive: false,
            fn: () => 'hello world!',
          }),
        ],
      })
      commandApp.parseInput('testapp FOO')
      expect(cmdReply).toBe('hello world!')

      const flagApp = new Clapp.App({
        name: 'testapp',
        desc: 'desc',
        prefix: 'testapp',
        onReply: (msg) => {
          flagReply = msg
        },
        commands: [
          new Clapp.Command({
            name: 'foo',
            desc: 'desc',
            fn: (argv) => (argv.flags.mYfLaG ? ':)' : ':('),
            flags: [
              new Clapp.Flag({
                name: 'mYfLaG',
                desc: 'desc',
                type: 'boolean',
                default: false,
                caseSensitive: false,
              }),
            ],
          }),
        ],
      })
      flagApp.parseInput('testapp foo --MYFLAG')
      expect(flagReply).toBe(':)')
    })

    it('handles promise-based async commands, context updates, and rejects', async () => {
      vi.useFakeTimers()
      vi.spyOn(console, 'error').mockImplementation(() => {})
      let response = 'unset'
      let seenContext: unknown

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg, context) => {
          response = msg
          seenContext = context
        },
        commands: [
          new Clapp.Command({
            name: 'foo',
            desc: 'desc',
            fn: () =>
              new Promise((resolve) => {
                setTimeout(() => resolve('message'), 10)
              }),
          }),
          new Clapp.Command({
            name: 'ctx',
            desc: 'desc',
            fn: ((_argv: Clapp.Argv, context: unknown) =>
              new Promise((resolve: (value: any) => void) => {
                setTimeout(
                  () =>
                    resolve({
                      message: 'context-message',
                      context: `${context as string}-new`,
                    }),
                  10
                )
              })) as any,
          }),
          new Clapp.Command({
            name: 'reject',
            desc: 'desc',
            fn: () =>
              new Promise((_resolve, reject) => {
                setTimeout(() => reject(new Error('Ignore this plz')), 10)
              }),
          }),
        ],
      })

      app.parseInput('/app foo')
      await vi.runAllTimersAsync()
      expect(response).toBe('message')

      app.parseInput('/app ctx', 'old')
      await vi.runAllTimersAsync()
      expect(response).toBe('context-message')
      expect(seenContext).toBe('old-new')

      app.parseInput('/app reject')
      await vi.runAllTimersAsync()
      expect(response.toLowerCase()).toContain('error')
    })

    it('supports deprecated callback async commands', async () => {
      vi.useFakeTimers()
      let response = ''
      let seenContext: unknown

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg, context) => {
          response = msg
          seenContext = context
        },
        commands: [
          new Clapp.Command({
            name: 'foo',
            desc: 'desc',
            async: true,
            suppressDeprecationWarnings: true,
            fn: ((
              _argv: Clapp.Argv,
              _context: unknown,
              cb: (response: string, newContext?: unknown) => void
            ) => {
              setTimeout(() => cb('message', 'new context'), 10)
            }) as any,
          }),
        ],
      })

      app.parseInput('/app foo', 'old context')
      await vi.runAllTimersAsync()

      expect(response).toBe('message')
      expect(seenContext).toBe('new context')
    })

    it('parses string, number, and boolean values and reports mismatches', () => {
      const replies: string[] = []

      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '-app',
        onReply: (msg) => {
          replies.push(msg)
        },
        commands: [
          new Clapp.Command({
            name: 'string-ok',
            desc: 'desc',
            fn: (argv) =>
              typeof argv.args.testarg === 'string' ? 'passed' : 'not passed',
            args: [
              {
                name: 'testarg',
                desc: 'desc',
                type: 'string',
                required: true,
              },
            ],
          }),
          new Clapp.Command({
            name: 'number-ok',
            desc: 'desc',
            fn: (argv) =>
              typeof argv.args.testarg === 'number' ? 'passed' : 'not passed',
            args: [
              {
                name: 'testarg',
                desc: 'desc',
                type: 'number',
                required: true,
              },
            ],
          }),
          new Clapp.Command({
            name: 'bool-ok',
            desc: 'desc',
            fn: (argv) =>
              argv.flags.testflag === true && argv.flags.testflag2 === false
                ? 'passed'
                : 'not passed',
            flags: [
              {
                name: 'testflag',
                desc: 'desc',
                type: 'boolean',
                default: false,
              },
              {
                name: 'testflag2',
                desc: 'desc',
                type: 'boolean',
                default: false,
              },
            ],
          }),
          new Clapp.Command({
            name: 'bad-bool',
            desc: 'desc',
            fn: () => 'not passed',
            flags: [
              {
                name: 'testflag',
                desc: 'desc',
                type: 'boolean',
                default: false,
              },
            ],
          }),
        ],
      })

      app.parseInput('-app string-ok abc')
      app.parseInput('-app number-ok 123')
      app.parseInput('-app bool-ok --testflag=1 --testflag2=0')
      app.parseInput("-app bad-bool --testflag='notaboolean'")

      expect(replies[0]).toBe('passed')
      expect(replies[1]).toBe('passed')
      expect(replies[2]).toBe('passed')
      expect(replies[3]).toContain('Error')
    })

    it('throws for developer input errors and reports user input errors', () => {
      const replies: string[] = []
      const app = new Clapp.App({
        name: 'testapp',
        desc: 'desc',
        prefix: 'p',
        onReply: (msg) => {
          replies.push(msg)
        },
      })

      expect(() => app.parseInput(123 as any)).toThrow()
      expect(() => app.parseInput('not a cli sentence')).toThrow()

      app.parseInput('p unknown-command')
      app.addCommand(
        new Clapp.Command({
          name: 'foo',
          desc: 'desc',
          fn: noop,
          args: [
            {
              name: 'testarg',
              type: 'string',
              desc: 'desc',
              required: true,
            },
          ],
        })
      )
      app.parseInput('p foo')

      expect(replies[0]).toContain('Error')
      expect(replies[1]).toContain('Error')
    })
  })

  describe('#addCommand()', () => {
    it('accepts child Command instances and rejects non-commands', () => {
      class MyCommand extends Clapp.Command {
        _getHelp() {
          return `The command help for command "${this.name}" is overridden! D:`
        }
      }

      let response = ''
      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg) => {
          response = msg
        },
      })

      app.addCommand(
        new MyCommand({
          name: 'foo',
          desc: 'does foo things',
          fn: noop,
        })
      )

      expect(() => app.addCommand('not a command' as any)).toThrow()
      expect(() => app.addCommand(123 as any)).toThrow()

      app.parseInput('/app foo --help')
      expect(response).toBe(
        'The command help for command "foo" is overridden! D:'
      )
    })
  })

  describe('#_getHelp()', () => {
    it('supports child App overrides and normal help output', () => {
      class MyApp extends Clapp.App {
        _getHelp() {
          return `The help for the app "${this.name}" is overridden! D:`
        }
      }

      let normalHelp = ''
      const app = new Clapp.App({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg) => {
          normalHelp = msg
        },
      })
      app.addCommand(
        new Clapp.Command({
          name: 'testc',
          desc: 'desc',
          fn: noop,
        })
      )
      app.parseInput('/app')
      expect(normalHelp).toContain(app.name)

      let overriddenHelp = ''
      const childApp = new MyApp({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: (msg) => {
          overriddenHelp = msg
        },
      })
      childApp.parseInput('/app')
      expect(overriddenHelp).toBe(
        'The help for the app "test" is overridden! D:'
      )
    })
  })

  it('throws when given invalid app options', () => {
    const make = (options: any) => () => new Clapp.App(options)

    expect(make(undefined)).toThrow()
    expect(make({})).toThrow()
    expect(
      make({
        name: 'testapp',
      })
    ).toThrow()
    expect(
      make({
        name: 'testapp',
        desc: 'desc',
      })
    ).toThrow()
    expect(
      make({
        name: 'testapp',
        desc: 'desc',
        prefix: 'p',
      })
    ).toThrow()
    expect(
      make({
        name: 'testapp',
        desc: 'desc',
        prefix: 'p',
        onReply: () => {},
        commands: 'invalid commands',
      })
    ).toThrow()
    expect(
      make({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: () => {},
        caseSensitive: 'no',
      })
    ).toThrow()
    expect(
      make({
        name: 'test',
        desc: 'desc',
        prefix: '/app',
        onReply: () => {},
        separator: 123,
      })
    ).toThrow()
  })
})

describe('Clapp.Command', () => {
  it('creates commands with plain-object and class-based args and flags', () => {
    const foo = new Clapp.Command({
      name: 'foo',
      desc: 'desc',
      fn: noop,
      args: [
        {
          name: 'testarg',
          desc: 'A test argument',
          type: 'string',
          required: false,
          default: "testarg isn't defined",
        },
      ],
      flags: [
        {
          name: 'testflag',
          desc: 'A test flag',
          alias: 't',
          type: 'boolean',
          default: false,
        },
      ],
    })

    const bar = new Clapp.Command({
      name: 'bar',
      desc: 'desc',
      fn: noop,
      args: [
        new Clapp.Argument({
          name: 'testarg',
          desc: 'A test argument',
          type: 'string',
          required: false,
          default: "testarg isn't defined",
        }),
      ],
      flags: [
        new Clapp.Flag({
          name: 'testflag',
          desc: 'A test flag',
          alias: 't',
          type: 'boolean',
          default: false,
        }),
      ],
    })

    expect(foo).toBeInstanceOf(Clapp.Command)
    expect(foo.args[0].name).toBe('testarg')
    expect(foo.flags).toHaveProperty('testflag')
    expect(bar).toBeInstanceOf(Clapp.Command)
    expect(bar.flags).toHaveProperty('testflag')
  })

  it('shows command help and rejects invalid command construction', () => {
    let response = ''
    const app = new Clapp.App({
      name: 'testapp',
      desc: 'desc',
      prefix: '-app',
      onReply: (msg) => {
        response = msg
      },
    })

    const foo = new Clapp.Command({
      name: 'foo',
      desc: 'desc',
      fn: noop,
      args: [
        {
          name: 'testarg',
          desc: 'A test argument',
          type: 'string',
          required: false,
          default: "testarg isn't defined",
        },
      ],
      flags: [
        {
          name: 'testflag',
          desc: 'A test flag',
          alias: 't',
          type: 'boolean',
          default: false,
        },
      ],
    })

    app.addCommand(foo)
    app.parseInput('-app foo --help')

    expect(response).toContain('foo')
    expect(response).toContain('testarg')
    expect(response).toContain('testflag')

    expect(() => new Clapp.Command(undefined as any)).toThrow()
    expect(() => new Clapp.Command('foo' as any)).toThrow()
    expect(
      () =>
        new Clapp.Command({
          name: 'foo',
          desc: 'desc',
          fn: noop,
          args: ['not an argument' as any],
        })
    ).toThrow()
    expect(
      () =>
        new Clapp.Command({
          name: 'foo',
          desc: 'desc',
          fn: noop,
          flags: ['not a flag' as any],
        })
    ).toThrow()
  })
})

describe('Clapp.Argument', () => {
  it('allows optional arguments with defaults and rejects invalid ones', () => {
    expect(
      () =>
        new Clapp.Argument({
          name: 'testarg',
          desc: 'desc',
          type: 'string',
          default: 'abc',
        })
    ).not.toThrow()

    expect(
      () =>
        new Clapp.Argument({
          name: 'testarg',
          desc: 'desc',
          type: 'string',
          required: false,
          default: 123 as any,
        })
    ).toThrow()

    expect(
      () =>
        new Clapp.Argument({
          name: 'testarg',
          desc: 'desc',
          type: 'string',
          required: false,
        })
    ).toThrow()
  })
})

describe('Clapp.Flag', () => {
  it('rejects missing defaults, mismatched defaults, and invalid optional parameter types', () => {
    expect(
      () =>
        new Clapp.Flag({
          name: 'testflag',
          desc: 'desc',
          type: 'string',
        } as any)
    ).toThrow()

    expect(
      () =>
        new Clapp.Flag({
          name: 'testflag',
          desc: 'desc',
          type: 'string',
          default: 123 as any,
        })
    ).toThrow()

    expect(
      () =>
        new Clapp.Flag({
          name: 'testflag',
          desc: 'desc',
          type: 'string',
          default: 'abc',
          caseSensitive: 'true' as any,
        })
    ).toThrow()
  })
})
