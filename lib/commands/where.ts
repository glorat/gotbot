var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
const cfg = require('../../config.js');
const _ = require('underscore');
import Discord = require('discord.js');
import * as API from '../Interfaces';

module.exports = new Clapp.Command({
  name: "where",
  desc: "where is the bot deployed",


  fn:(argv:any, context: API.Context) => new Promise((fulfill, reject) => {
    const bot : Discord.Client|undefined = context.bot;

    if (bot) {
      const botServer = bot.guilds.get(cfg.botServer);
      if (botServer) {
        const ret = `I am in the following servers\n` + bot.guilds.map(x => {
          const adminPresent = x.members.has(cfg.adminId);
          const thisOwner = x.owner;

          const fleetInBotServer = botServer.members.has(thisOwner.id);

          return `${x.name} - ${thisOwner.displayName} - (auth checks: ${adminPresent},${fleetInBotServer})`;
        }).join(`\n`);
        fulfill (ret);
      }
      else {
        fulfill ('No bot server')
      }
    }
  }),
  args: [

  ]
});
