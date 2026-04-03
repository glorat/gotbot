import { SlashCommandBuilder } from 'discord.js'

import {
  App as ClappApp,
  Command as ClappCommand,
  Flag as ClappFlag,
  Argument as ClappArgument,
  ArgumentOptions,
  FlagOptions,
  type AppOptions,
} from '../clapp/index.js'
import Table from 'cli-table3'
import str from './str-en'

export const Flag = ClappFlag
export const Argument = ClappArgument

import type { Context, ClappArgs } from '../../Interfaces.js'

interface ClappCommandOpts {
  exclude?: boolean
  slashCommandBuilder?(): SlashCommandBuilder
}

interface ClappCommandOptions {
  name: string
  desc: string
  fn: (
    argv: ClappArgs,
    context: Context
  ) => string | Promise<string> | { message: string; context?: Context }
  args?: (ClappArgument | ArgumentOptions)[]
  flags?: (ClappFlag | FlagOptions)[]
  caseSensitive?: boolean
  opts?: ClappCommandOpts
}

const noTableChars = {
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
}

const discordTable = () => {
  const LINE_WIDTH = 80
  const table = new Table({
    chars: noTableChars,
    head: ['Arg', 'Description', 'Default'],
    colWidths: [
      Math.round(0.15 * LINE_WIDTH),
      Math.round(0.45 * LINE_WIDTH),
      Math.round(0.2 * LINE_WIDTH),
    ],
    style: {
      head: [], // No "colours" in the text
    },
    wordWrap: true,
  })
  return table
}

export class App extends ClappApp<Context> {
  constructor(options: AppOptions<Context>) {
    super(options)
  }

  _getHelp() {
    let r =
      //this.name + (typeof this.version !== 'undefined' ? ' v' + this.version : '') + '\n' +
      //this.desc + '\n\n' +
      str.help_usage +
      this.prefix +
      this.separator +
      str.help_command +
      '\n\n' +
      str.help_cmd_list +
      '\n\n'
    // Command list
    const table = new Table({
      chars: noTableChars,
      wordWrap: true,
    })

    for (const i in this.commands) {
      table.push([i, this.commands[i].desc])
    }

    r +=
      '```' +
      table.toString() +
      '```\n\n' +
      str.help_further_help +
      this.prefix +
      ' ' +
      str.help_command +
      ' --help'

    return r
  }
}

export class Command extends ClappCommand<Context> {
  opts?: ClappCommandOpts
  declare fn: ClappCommandOptions['fn']
  declare args: ClappArgument[]
  declare flags: Record<string, ClappFlag>

  constructor(options: ClappCommandOptions) {
    super(options)
    this.opts = options.opts
  }

  _getHelp(app: App) {
    const args_table = discordTable()
    let r = str.help_usage + ' ' + app.prefix + ' ' + this.name

    // Add every argument to the usage (Only if there are arguments)
    if (this.args.length > 0) {
      for (let i = 0; i < this.args.length; i++) {
        const arg = this.args[i]
        r += arg.required ? ' (' + arg.name + ')' : ' [' + arg.name + ']'
        args_table.push([
          arg.name,
          typeof arg.desc !== 'undefined' ? arg.desc : '',
          typeof arg.default !== 'undefined' ? arg.default : '',
        ])
      }
    }

    r += '\n' + this.desc

    if (Object.keys(this.args).length > 0)
      r +=
        '\n\n' + str.help_av_args + ':\n\n```' + args_table.toString() + '```'

    // Add every flag, only if there are flags to add
    if (Object.keys(this.flags).length > 0) {
      const flags_table = discordTable()
      for (const i in this.flags) {
        const flag = this.flags[i]
        flags_table.push([
          (typeof flag.alias !== 'undefined' ? '-' + flag.alias + ', ' : '') +
            '--' +
            i,
          typeof flag.desc !== 'undefined' ? flag.desc : '',
          typeof flag.default !== 'undefined' ? flag.default : '',
        ])
      }

      r +=
        '\n\n' +
        str.help_av_options +
        ':\n\n```' +
        flags_table.toString() +
        '```'
    }

    if (this.args.length > 0) r += '\n\n' + str.help_args_required_optional

    return r
  }
}
