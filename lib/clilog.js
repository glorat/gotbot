const cfg = require('../config.js');
var Datastore = require('nedb');

var cmds = new Datastore({ filename: cfg.clilogpath, autoload: true });

module.exports = {
  cmds: cmds,
  logCommand: logCommand
};

function logCommand(cmd, context) {
  let doc = {
    cmd:cmd,
    authorId:context.author.id,
    authorName: context.author.name,
    channelId: context.channel.id,
    channelType: context.channel.type
  };
  if (context.channel.type === 'text') {
    doc.channelName = context.channel.name;
    doc.guildId = context.channel.guild.id;
    doc.guildName = context.channel.guild.name;
  }
  cmds.insert(doc); // Fire and forget
}
