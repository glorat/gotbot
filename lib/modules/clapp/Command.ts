import Argument, { ArgumentOptions } from './Argument.js'
import Flag, { FlagOptions } from './Flag.js'
import Table from 'cli-table3'
import str from './strings/en.js'

// Minimal interface to avoid circular dependency with App
interface AppLike {
  prefix: string
}

export interface CommandOptions<TContext = unknown> {
  name: string
  desc: string

  fn: (
    argv: Argv,
    context: TContext
  ) => string | Promise<string> | { message: string; context?: TContext }
  args?: (Argument | ArgumentOptions)[]
  flags?: (Flag | FlagOptions)[]
  caseSensitive?: boolean
  async?: boolean
  suppressDeprecationWarnings?: boolean
}

export interface Argv {
  args: Record<string, any>
  flags: Record<string, any>
}

/**
 * A Command that can be bound to an App. A command represents a single function that achieves a
 * single purpose. The command can receive arguments and flags, and can return a string that will be
 * redirected to the app output (See: {@link onReply}).
 */
class Command<TContext = unknown> {
  name: string
  desc: string
  fn: CommandOptions<TContext>['fn']
  async: boolean
  caseSensitive: boolean
  suppressDeprecationWarnings?: boolean
  args: Argument[]
  flags: Record<string, Flag>

  constructor(options: CommandOptions<TContext>) {
    if (
      typeof options.name !== 'string' || // name is required
      options.name === '' ||
      typeof options.desc !== 'string' || // desc is required
      options.desc === '' ||
      typeof options.fn !== 'function' || // fn is required
      (options.args && !Array.isArray(options.args)) || // args is not required
      (options.flags && !Array.isArray(options.flags)) || // flags is not required
      (options.caseSensitive && typeof options.caseSensitive !== 'boolean') || // caseSensitive is not required
      (options.async && typeof options.async !== 'boolean') // async is not required
    ) {
      throw new Error(
        'Wrong parameters passed when creating command ' +
          options.name +
          '. Please refer to the documentation.'
      )
    }

    this.name = options.name
    this.desc = options.desc
    this.async = options.async || false
    this.fn = options.fn
    this.caseSensitive =
      typeof options.caseSensitive === 'boolean' ? options.caseSensitive : true
    this.suppressDeprecationWarnings = options.suppressDeprecationWarnings

    this.args = []
    const args = options.args || []
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg instanceof Argument) {
        this.args.push(arg)
      } else if (typeof arg === 'object') {
        // Give support to the deprecated API
        this.args.push(new Argument(arg))
      } else {
        throw new Error(
          'One of the items in the args array is not an Argument.'
        )
      }
    }

    this.flags = {}
    const flags = options.flags || []
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i]
      if (flag instanceof Flag) {
        this.flags[flag.name] = flag
      } else if (typeof flag === 'object') {
        // Give support to the deprecated API
        this.flags[flag.name] = new Flag(flag)
      } else {
        throw new Error('One of the items in the flags array is not a Flag.')
      }
    }
  }

  /**
   * Returns the command specific help
   *
   * @param app We need it to access the parent app info.
   * @returns The command help
   * @private
   */
  _getHelp(app: AppLike): string {
    const LINE_WIDTH = 100

    let r = str.help_usage + ' ' + app.prefix + ' ' + this.name
    let args_table: Table.Table | undefined

    // Add every argument to the usage (Only if there are arguments)
    if (this.args.length) {
      args_table = new Table({
        chars: {
          top: '',
          'top-mid': '',
          'top-left': '',
          'top-right': '',
          bottom: '',
          'bottom-mid': '',
          'bottom-left': '',
          'bottom-right': '',
          left: '',
          'left-mid': '',
          mid: '',
          'mid-mid': '',
          right: '',
          'right-mid': '',
          middle: '',
        },
        head: ['Argument', 'Description', 'Default'],
        colWidths: [0.2 * LINE_WIDTH, 0.35 * LINE_WIDTH, 0.25 * LINE_WIDTH],
        wordWrap: true,
      })
      for (const i in this.args) {
        const arg = this.args[i]
        r += arg.required ? ' (' + i + ')' : ' [' + i + ']'
        args_table.push([
          i,
          typeof arg.desc !== 'undefined' ? arg.desc : '',
          typeof arg.default !== 'undefined' ? arg.default : '',
        ])
      }
    }

    r += '\n' + this.desc

    if (this.args.length) {
      r += '\n\n' + str.help_av_args + ':\n\n' + args_table!.toString()
    }

    // Add every flag, only if there are flags to add
    if (Object.keys(this.flags).length > 0) {
      const flags_table = new Table({
        chars: {
          top: '',
          'top-mid': '',
          'top-left': '',
          'top-right': '',
          bottom: '',
          'bottom-mid': '',
          'bottom-left': '',
          'bottom-right': '',
          left: '',
          'left-mid': '',
          mid: '',
          'mid-mid': '',
          right: '',
          'right-mid': '',
          middle: '',
        },
        head: ['Option', 'Description', 'Default'],
        colWidths: [0.2 * LINE_WIDTH, 0.35 * LINE_WIDTH, 0.25 * LINE_WIDTH],
        wordWrap: true,
      })
      for (const i in this.flags) {
        flags_table.push([
          (typeof this.flags[i].alias !== 'undefined'
            ? '-' + this.flags[i].alias + ', '
            : '') +
            '--' +
            i,
          typeof this.flags[i].desc !== 'undefined' ? this.flags[i].desc : '',
          typeof this.flags[i].default !== 'undefined'
            ? this.flags[i].default
            : '',
        ])
      }

      r += '\n\n' + str.help_av_options + ':\n\n' + flags_table.toString()
    }

    if (this.args.length) {
      r += '\n\n' + str.help_args_required_optional
    }

    return r
  }
}

export default Command
