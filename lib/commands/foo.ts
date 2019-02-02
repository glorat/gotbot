var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "foo",
  desc: "does foo things",
  fn: (argv:Array<string>, context:any) => {
    const channel = context.channel.name;
    const author = context.author.username;

    //235536091011088394
    // This output will be redirected to your app's onReply function
    // let guild = msg.channel.guild;
    //var ret = `Hi ${author} (${msg.author.id}). Thanks for sending in channel ${channel} of guild ${guild.name} (${guild.id}) owned by ${guild.owner.user.username} (${guild.ownerID})\n`;
    let ret = `Hi ${author} (${context.author.id}). Thanks for sending in channel ${channel}\n`;
    //let members = guild.members.map(x=>x.user.username).join(',');
    //ret = ret + `I see ${members}\n`;
    ret = ret + (context.isEntitled(context.author.id) ? 'You have GoT entitlements' : 'You lack GoT entitlements');
    return ret;
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
