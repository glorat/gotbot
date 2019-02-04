const Clapp = require('../modules/clapp-discord');
const _ = require('underscore');

module.exports = new Clapp.Command({
  name: "hello",
  desc: "say hello to the bot",

  fn:(argv, context) => new Promise((fulfill, reject) => {

    const author = context.author.username;
    fulfill (`Hi ${author} (${context.author.id})`);

  }),
  args: [

  ]
});
