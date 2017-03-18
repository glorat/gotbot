var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
const cfg = require('../../config.js');
const _ = require('underscore');

module.exports = new Clapp.Command({
  name: "hello",
  desc: "say hello to the bot",

  fn:(argv, context) => new Promise((fulfill, reject) => {

    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    fulfill (`Hi ${author} (${msg.author.id})`);

  }),
  args: [

  ]
});
