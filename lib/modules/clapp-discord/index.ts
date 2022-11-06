"use strict";

import {Context} from "../../Interfaces";
import {SlashCommandBuilder} from "discord.js";

const Clapp = require('clapp')
  , Table = require('cli-table3')
  , str   = require('./str-en.js');

export const Flag = Clapp.Flag
export const Argument = Clapp.Argument


interface ClappAppArguments {

}

interface ClappCommandOpts {
  exclude?: boolean
  slashCommandBuilder?() : SlashCommandBuilder
}

interface ClappCommandArguments {
  name: string
  desc: string
  args: {
    name: string
    desc: string
    type: string
    required?: boolean
    validations?: {
      errorMessage: string
      validate: (value: string) => boolean
    }[]
    default?: any
  }[]
  flags?: any[]
  fn (argv: any, context: Context) : Promise<any>

  opts? : ClappCommandOpts

}

declare namespace Clapp {
  interface App {
    isCliSentence(cmd:string):boolean
    commands: any[]
    addCommand(cmd:any): void
      parseInput(cmd:any, context: any): void
  }
}

const noTableChars = {
  'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
  'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
  'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
  'middle': ''
}

const discordTable = () => {
  const LINE_WIDTH = 80;
  const table = new Table({
    chars: noTableChars,
    head: ['Arg', 'Description', 'Default'],
    colWidths: [
      Math.round(0.15*LINE_WIDTH),
      Math.round(0.45*LINE_WIDTH),
      Math.round(0.20*LINE_WIDTH)
    ],
    style: {
      head:[] // No "colours" in the text
    },
    wordWrap: true
  });
  return table
}

export class App extends Clapp.App {
  constructor(options: ClappAppArguments) {
    super(options);
  }

  _getHelp() {
    let r =
      //this.name + (typeof this.version !== 'undefined' ? ' v' + this.version : '') + '\n' +
      //this.desc + '\n\n' +
      str.help_usage + this.prefix + this.separator + str.help_command + '\n\n' +
      str.help_cmd_list + '\n\n'
    ;

    // Command list
    const table = new Table({
      chars: noTableChars,
      wordWrap: true
    });

    for (var i in this.commands) {
      table.push([i, this.commands[i].desc]);
    }

    r +=
      '```' + table.toString() + '```\n\n' +
      str.help_further_help + this.prefix + ' ' + str.help_command + ' --help'
    ;

    return r;
  }

}

export class Command extends Clapp.Command {
  opts?: ClappCommandOpts

  constructor(options: ClappCommandArguments) {
    super(options);
    this.opts = options.opts;
  }

  _getHelp(app: App) {

    const args_table = discordTable()
    let r = str.help_usage + ' ' + app.prefix + ' ' + this.name;

    // Add every argument to the usage (Only if there are arguments)
    if (Object.keys(this.args).length > 0) {
      for (var i in this.args) {
        r += this.args[i].required ? ' (' + i + ')' : ' [' + i + ']';
        args_table.push([
          i,
          typeof this.args[i].desc !== 'undefined' ?
            this.args[i].desc : '',
          typeof this.args[i].default !== 'undefined' ?
            this.args[i].default : ''
        ]);
      }
    }

    r += '\n' + this.desc;

    if (Object.keys(this.args).length > 0)
      r += '\n\n' + str.help_av_args + ':\n\n```' + args_table.toString() + '```';

    // Add every flag, only if there are flags to add
    if (Object.keys(this.flags).length > 0) {
      const flags_table = discordTable()
      for (i in this.flags) {
        flags_table.push([
          (typeof this.flags[i].alias !== 'undefined' ?
          '-' + this.flags[i].alias + ', ' : '') + '--' + i,
          typeof this.flags[i].desc !== 'undefined' ?
            this.flags[i].desc : '',
          typeof this.flags[i].default !== 'undefined' ?
            this.flags[i].default : ''
        ]);
      }

      r += '\n\n' + str.help_av_options + ':\n\n```' + flags_table.toString() + '```';
    }

    if (Object.keys(this.args).length > 0)
      r += '\n\n' + str.help_args_required_optional;

    return r;
  }
}

