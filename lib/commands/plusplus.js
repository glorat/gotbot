var Clapp = require('../modules/clapp-discord');
const cfg = require('../../config.js');

module.exports = new Clapp.Command({
  name: "++",
  desc: "give karma",
  fn: (argv, context) => {
    const channel = context.channel.name;
    const author = context.author.username;
    let ret = `<@${cfg.adminId}> ++ deserves the karma for creating me\n`;
    return ret;
  }
});
