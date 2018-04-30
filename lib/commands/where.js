var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
const cfg = require('../../config.js');
const _ = require('underscore');

module.exports = new Clapp.Command({
  name: "where",
  desc: "where is the bot deployed",

  fn:(argv, context) => new Promise((fulfill, reject) => {
    if (context.isEntitled(context.author.id) && context.bot) {
      const ret = `I am in the following servers\n` + context.bot.guilds.map(x => {
          const adminPresent = x.members.has(cfg.adminId);
          return `${x.name} - (enabled: ${adminPresent})`;
      }).join(`\n`);
      fulfill (ret);
    }
    else {
      fulfill(`This is an internal admin command`);
    }
  }),
  args: [

  ]
});
