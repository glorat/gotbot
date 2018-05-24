var Clapp = require('../modules/clapp-discord');
const cfg = require('../../config.js');

module.exports = new Clapp.Command({
  name: "++",
  desc: "give karma",
  fn: (argv, context) => {
    const channel = context.channel.name;
    const author = context.author.username;
    let ret = `Thanks ${author}, but it is <@${cfg.adminId}>++ that should have the karma for creating me\n`;
    return ret;
  }
});
