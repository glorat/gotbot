import { SlashCommandBuilder } from 'discord.js'
import cfg from '../config'
import { App, Command } from './modules/clapp-discord'
import * as API from './Interfaces'
import { keys } from 'underscore'

import pkg from '../package.json' assert { type: 'json' }
import { logCommand } from './clilog'
import best from './commands/best'
import bonus from './commands/bonus'
import boss from './commands/boss'
import crew from './commands/crew'
import crewstat from './commands/crewstat'
import drop from './commands/drop'
import equip from './commands/equip'
import estat from './commands/estat'
import event from './commands/event'
import farm from './commands/farm'
import foo from './commands/foo'
import gaunt from './commands/gaunt'
import gcalc from './commands/gcalc'
import hello from './commands/hello'
import manual from './commands/manual'
import plusplus from './commands/plusplus'
import search from './commands/search'
import setup from './commands/setup'
import stats from './commands/stats'
import voyage from './commands/voyage'
import voytime from './commands/voytime'
import where from './commands/where'

const app = new App({
  name: cfg.botName,
  desc: pkg.description,
  prefix: cfg.prefix,
  version: pkg.version,
  onReply: (msg, context) => {
    ;(context as API.Context | undefined)?.callback?.(msg)
  },
})

export function isCliSentence(cmd: string) {
  return app.isCliSentence(cmd)
}
export function commands() {
  return app.commands
}

export function argOrFlagToBuilder(
  b: SlashCommandBuilder,
  arg: { name: string; desc: string; required: boolean; type: string }
) {
  console.log(arg.name)

  const opts = (opt: any) =>
    opt.setName(arg.name).setDescription(arg.desc).setRequired(arg.required)

  if (arg.type === 'string') {
    b.addStringOption(opts)
  } else if (arg.type === 'number') {
    b.addNumberOption(opts)
  } else if (arg.type === 'boolean') {
    b.addBooleanOption(opts)
  }
}

function commandToSlashBuilder(cmd: Command): SlashCommandBuilder | undefined {
  if (cmd.name.match(/\w+/) && !cmd.opts?.exclude) {
    if (cmd.opts?.slashCommandBuilder) {
      return cmd.opts.slashCommandBuilder()
    } else {
      const b = new SlashCommandBuilder()
      b.setName(cmd.name).setDescription(cmd.desc)
      cmd.args?.forEach((arg: any) => {
        argOrFlagToBuilder(b, arg)
      })
      keys(cmd.flags ?? {}).forEach((flagKey) => {
        argOrFlagToBuilder(b, cmd.flags[flagKey])
      })
      // cmd.flags?.forEach((flag:any) => {
      //   argOrFlagToBuilder(b, flag)
      // })
      return b
    }
  } else {
    return undefined
  }
}

// Load every command in the commands folder
export const slashCommands: SlashCommandBuilder[] = []

// Register all commands explicitly
const commandModules = [
  best,
  bonus,
  boss,
  crew,
  crewstat,
  drop,
  equip,
  estat,
  event,
  farm,
  foo,
  gaunt,
  gcalc,
  hello,
  manual,
  plusplus,
  search,
  setup,
  stats,
  voyage,
  voytime,
  where,
]

commandModules.forEach((command) => {
  app.addCommand(command)
  const s = commandToSlashBuilder(command)
  if (s) {
    slashCommands.push(s)
  }
})

// console.log(slashCommands.length)
export function sendCommand(
  cmd: string,
  context: API.Context
): Promise<string> {
  const msgPromise = new Promise<string>((resolve) => {
    if (app.isCliSentence(cmd)) {
      context.callback = (m) => resolve(m)
      logCommand(cmd, context)
      app.parseInput(cmd, context)
    } else {
      resolve('Not a valid command')
    }
  })
  return msgPromise
}
