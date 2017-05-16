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
const cli = require('./cli.js');

if (process.env.NODE_ENV !== 'production'){
  require('longjohn');
}

function isEntitled(id) {
  let got = bot.guilds.get(cfg.gotServer);
  return got.members.has(id);
}

bot.on('message', msg => {
  // Fired when someone sends a message
  function emojify(sym) {
    const emojis = msg.channel.guild ? msg.channel.guild.emojis : msg.client.emojis;
    const estat = emojis.find(x=> x.name === sym.toLowerCase());
    return estat ? estat : sym;
  }

  const context = {
    author:msg.author,
    channel:msg.channel,
    isEntitled:isEntitled,
    emojify : emojify,
    boldify: x => `**${x}**`
  };

  let onReply = function(msg) {
    if (msg) {
      if (msg === 'EMBED') {
        context.channel.sendEmbed(context.embed);
      }
      else {
        context.channel.send(msg).then(bot_response => {
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

    }
  };


  if (cli.isCliSentence(msg.content)) {
    cli.sendCommand(msg.content, context).then(onReply);
  }
  else if(msg.isMentioned(bot.user)) {
    var str = msg.cleanContent.replace('@' + cfg.name, '').trim();
    const cmd = cfg.prefix + ' ' + str;
    cli.sendCommand(cmd, context).then(onReply);
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

bot.on("disconnect", function () {
  console.log("Disconnected from discord!");
  process.exit(1); //exit node.js with an error // supervise will kick things back up
});

bot.on("reconnecting", function () {
  console.log("Reconnecting to discord...");
});

bot.on("resume", function () {
  console.log("Resumed connection with discord...");
});

bot.login(cfg.token).then(() => {
  let got = bot.guilds.get(cfg.gotServer);
  // TODO: Post something to computer-core channel
  console.log('Connected to discord!');
}).catch(function(e) {
  console.log('Failed to connect to discord:\n   ' + e);
  // Now what? In debug, we continue on since the webserver can work...
});
