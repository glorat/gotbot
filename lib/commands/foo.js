var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "foo",
  desc: "does foo things",
  fn: (argv, context) => {
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;

    // This output will be redirected to your app's onReply function
    return `Hi ${author} (${msg.author.id}). Thanks for telling to ${argv.args.testarg} in channel ${channel}`;

  },
  args: [
    {
      name: 'testarg',
      desc: 'A test argument',
      type: 'string',
      required: false,
      default: 'testarg isn\'t defined'
    }
  ],
  flags: [
    {
      name: 'testflag',
      desc: 'A test flag',
      alias: 't',
      type: 'boolean',
      default: false
    }
  ]
});
