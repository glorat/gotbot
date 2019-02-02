var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
const cfg = require('../../config.js');
const _ = require('underscore');
import Discord = require('discord.js');

module.exports = new Clapp.Command({
  name: "where",
  desc: "where is the bot deployed",

  fn:(argv:any, context:any) => new Promise((fulfill, reject) => {
    let bot : Discord.Client = context.bot;
    if (bot) {
      const ret = `I am in the following servers\n` + bot.guilds.map(x => {
          const adminPresent = x.members.has(cfg.adminId);
          return `${x.name} - (authorised: ${adminPresent})`;
      }).join(`\n`);
      fulfill (ret);
    }
  }),
  args: [

  ]
});
