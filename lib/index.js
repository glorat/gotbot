'use strict';

const fs      = require('fs');
const Clapp   = require('./modules/clapp-discord');
const cfg     = require('../config.js');
const pkg     = require('../package.json');
const Discord = require('discord.js');
const chars      = require('./chars.js');
const db      = require('./crewdb.js');
const bot     = new Discord.Client();
const json2csv = require('json2csv');
const webserver = require('./webserver.js');

if (process.env.NODE_ENV !== 'production'){
  require('longjohn');
}

function isEntitled(id) {
  let got = bot.guilds.get('235536091011088394');
  return got.members.has(id);
}

var app = new Clapp.App({
  name: cfg.name,
  desc: pkg.description,
  prefix: cfg.prefix,
  version: pkg.version,
  onReply: (msg, context) => {
    // Fired when input is needed to be shown to the user.
    if (msg.length > 1995) {
      msg = msg.substr(0, 1990) + '...';
      console.log('Trimming excessively long message');
    }

    // or context.msg.reply
    context.msg.channel.send(msg).then(bot_response => {
      if (cfg.deleteAfterReply.enabled) {
        context.msg.delete(cfg.deleteAfterReply.time)
          .then(msg => console.log(`Deleted message from ${msg.author}`))
          .catch(console.log);
        bot_response.delete(cfg.deleteAfterReply.time)
          .then(msg => console.log(`Deleted message from ${msg.author}`))
          .catch(console.log);
      }
    });
  }
});

// Load every command in the commands folder
fs.readdirSync('./lib/commands/').forEach(file => {
  app.addCommand(require("./commands/" + file));
});

bot.on('message', msg => {
  // Fired when someone sends a message
  function emojify(sym) {
    const estat = msg.client.emojis.find(x=> x.name === sym.toLowerCase());
    return estat ? estat : sym;
  }

  const context = {
    msg:msg,
    author:msg.author,
    isEntitled:isEntitled,
    emojify : emojify,
    boldify: x => `**${x}**`
  };

  if (app.isCliSentence(msg.content)) {
    app.parseInput(msg.content, context);
  }
  else if(msg.isMentioned(bot.user)) {
    var str = msg.cleanContent.replace('@' + cfg.name, '').trim();
    const cmd = cfg.prefix + ' ' + str;
    if (app.isCliSentence(cmd)) {
      app.parseInput(cmd, context)
    }

  }
  else {
    console.log(msg.content);
    /*
    msg.channel.send('I heard someone say ' + msg.content).then(bot_response => {
        context.msg.delete(cfg.deleteAfterReply.time)
          .then(msg => console.log(`Deleted message from ${msg.author}`))
          .catch(console.log);
        bot_response.delete(cfg.deleteAfterReply.time)
          .then(msg => console.log(`Deleted message from ${msg.author}`))
          .catch(console.log);

    });*/
  }
});
/*
bot.destroy().then(() => {
  console.log('Discord client destroyed! Trying again');
  bot.login()}
);
*/

bot.login(cfg.token).then(() => {
  console.log('Running!');
});
