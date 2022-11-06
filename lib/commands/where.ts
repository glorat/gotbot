const Clapp = require('../modules/clapp-discord');
import cfg from '../../config';
import Discord = require('discord.js');
import * as API from '../Interfaces';

module.exports = new Clapp.Command({
  name: "whereami",
  desc: "where is the bot deployed",


  fn:(argv:any, context: API.Context) => new Promise(async(fulfill, reject) => {
    const bot : Discord.Client|undefined = context.bot;

    try {
      if (bot) {
        const botServer = await bot.guilds.fetch(cfg.botServer);
        if (!botServer) {
          console.error("Don't know what server I the bot am managed from");
          reject("Don't know what server I the bot am managed from");
        }
        else {
          // This line requires GUILD_MEMBERS privileged intents
          // https://discord.com/developers/docs/topics/gateway#privileged-intents
          await botServer.members.fetch();
          if (botServer) {
            const foo: Promise<string>[] = bot.guilds.cache.map(async x => {
              const thisOwner = await x.members.fetch(x.ownerId);
              const fleetInBotServer = botServer.members.cache.has(x.ownerId);
              const mark = fleetInBotServer ? '✓' : '❌';

              return `${mark} ${x.name} - ${thisOwner?.displayName ?? x.ownerId}`;
            });
            const lines = await Promise.all(foo);

            const ret = `I am in the following ${bot.guilds.cache.size} servers\n` + lines.join(`\n`);
            console.log('Done getting list...');
            fulfill (ret);
          }
          else {
            fulfill ('No bot server')
          }
        }

      }
    }
    catch (e) {
      console.error(e)
    }

  }),
  args: [

  ]
});
