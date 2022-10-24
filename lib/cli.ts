'use strict';

import {SlashCommandBuilder} from "discord.js";

const pkg     = require(process.cwd() + '/package.json');
import cfg from '../config';
import Clapp   = require('./modules/clapp-discord');
const clilog  = require('./clilog');

import fs from 'fs';
import * as API from './Interfaces';
import {keys} from "underscore";

interface ClappApp {
  isCliSentence(cmd:string):boolean
  commands: any[]
  addCommand(cmd:any): void
  parseInput(cmd:any, context: any): void
}

const app = new Clapp.App({
  name: cfg.botName,
  desc: pkg.description,
  prefix: cfg.prefix,
  version: pkg.version,
  onReply: (msg: any, context: API.Context) => {
    context.callback(msg);
  }
}) as unknown as ClappApp;

export function isCliSentence(cmd:string) {return app.isCliSentence(cmd);}
export function commands() {return app.commands}

function argOrFlagToBuilder(b:SlashCommandBuilder, arg:any) {
  console.log(arg.name)

  const opts = (opt:any) =>
    opt.setName(arg.name)
      .setDescription(arg.desc)
      .setRequired(arg.required)

  if (arg.type === 'string') {
    b.addStringOption(opts)
  } else if (arg.type === 'number') {
    b.addNumberOption(opts)
  } else if (arg.type === 'boolean') {
    b.addBooleanOption(opts)
  }
}

function commandToSlashBuilder(cmd:any) : SlashCommandBuilder|undefined {
  const b = new SlashCommandBuilder()
  if (cmd.name.match(/\w+/)) {
    b.setName(cmd.name)
      .setDescription(cmd.desc)
    cmd.args?.forEach( (arg:any) => {
      argOrFlagToBuilder(b, arg)
    })
    keys(cmd.flags ?? {}).forEach(flagKey => {
      argOrFlagToBuilder(b, cmd.flags[flagKey])
    })
    // cmd.flags?.forEach((flag:any) => {
    //   argOrFlagToBuilder(b, flag)
    // })
    return b
  }
  else {
    return undefined
  }
}

// Load every command in the commands folder
export const slashCommands:SlashCommandBuilder[] = []

  fs.readdirSync('./lib/commands/')
    .forEach((file:string)=> {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const command = require("./commands/" + file.replace('.js', ''))
        app.addCommand(command);
        const s = commandToSlashBuilder(command)
        if (s) {
          slashCommands.push(s)
        }
      }
    })
// console.log(slashCommands.length)
export function sendCommand(cmd:string, context:API.Context) : Promise<string> {

  let msgPromise = new Promise<string>((resolve, reject) => {
    if (app.isCliSentence(cmd)) {
      context.callback = (m:any) => resolve(m);
      clilog.logCommand(cmd,context);
      app.parseInput(cmd, context);
    }
    else {
      resolve('Not a valid command');
    }

  });
  return msgPromise;
}
