const Clapp = require('../modules/clapp-discord');
import cfg from '../../config';
import Discord = require('discord.js');
import * as API from '../Interfaces';

module.exports = new Clapp.Command({
  name: "where",
  desc: "where is the bot deployed",


  fn:(argv:any, context: API.Context) => new Promise((fulfill, reject) => {
    const bot : Discord.Client|undefined = context.bot;

    if (bot) {
      const botServer = bot.guilds.cache.get(cfg.botServer);
      if (botServer) {
        const ret = `I am in the following ${bot.guilds.cache.size} servers\n` + bot.guilds.cache.map(x => {
          const adminPresent = x.members.cache.has(cfg.adminId);
          // const thisOwner = bot.users.cache.get(x.ownerID);
          const thisOwner = x.member(x.ownerID)
          // const fleetInBotServer = botServer.members.has(thisOwner.id);
          const mark = adminPresent ? '✓' : '❌';

          return `${mark} ${x.name} - ${thisOwner?.displayName ?? x.ownerID}`;
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
