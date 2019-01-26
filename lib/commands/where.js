var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
const cfg = require('../../config.js');
const _ = require('underscore');

module.exports = new Clapp.Command({
  name: "where",
  desc: "where is the bot deployed",

  fn:(argv, context) => new Promise((fulfill, reject) => {
    const botServer = context.bot.guilds.get(cfg.botServer);

    if (context.bot && botServer) {

      const ret = `I am in the following servers\n` + context.bot.guilds.map(x => {
        const adminPresent = x.members.has(cfg.adminId);
        const thisOwner = x.owner;

        const fleetInBotServer = botServer.members.has(thisOwner.id);

        return `${x.name} - ${thisOwner.displayName} - (auth checks: ${adminPresent},${fleetInBotServer})`;
      }).join(`\n`);
      fulfill (ret);
    }
  }),
  args: [

  ]
});
