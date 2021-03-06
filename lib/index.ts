'use strict';

import {hasChannelName, hasGuild, canFetchMessages} from "./Interfaces";

import cfg from "../config";
console.log(`crew database: ${cfg.nedbpath}`);

//const pkg     = require(process.cwd() + '/package.json');
import Discord = require('discord.js');
const bot     = new Discord.Client();
import './webserver';
const cli = require('./cli.js');
const fleets = require('./fleetdb.js');
import winston = require('winston');
const path = require('path');
const moment = require('moment');
const mkdirp = require('mkdirp');
import * as API from './Interfaces';


if (process.env.NODE_ENV !== 'production'){
  require('longjohn');
}

function isEntitled(id:string) : boolean {
  let got = bot.guilds.cache.get(cfg.gotServer);
  return got ? got.members.cache.has(id) : false;
}

bot.on('message', msg => {
  // Fired when someone sends a message
  function emojify(sym:string) : string|Discord.Emoji {
    const emojis =  hasGuild( msg.channel) ? msg.channel.guild.emojis : msg.client.emojis;
    const estat = emojis.cache.find(x=> x.name === sym.toLowerCase());
    return estat ? estat : sym;
  }


  const context : API.Context = {
    author:msg.author,
    channel:msg.channel,
    fleetId: hasGuild(msg.channel) ? msg.channel.guild.id : '0',
    isEntitled:isEntitled,
    emojify : emojify,
    boldify: x => `**${x}**`,
    bot : bot
  };



  let serverName = hasGuild(msg.channel) ? msg.channel.guild.name : 'direct';
  const channelName = hasChannelName(msg.channel)? msg.channel.name : 'DM';
  let channelTag = hasChannelName(msg.channel)? `${serverName}/${channelName}` : 'DM';
  if (!winston.loggers.has(channelTag)) {
    console.log(`Creating logger for ${channelTag}`);

    const dir = path.join(cfg.dataPath,'logs',serverName);
    mkdirp(dir, function (err:any) {
      if (err) console.error(err);
      else console.log(`${dir} directory made`);
    });

    winston.loggers.add(channelTag, {
      transports: [
        new (winston.transports.File)({
          dirname: dir,
          filename: `${channelName}.log`,
          level: 'info',
          json: false,
          timestamp: (x:any) => moment().format('YYYY-MM-DD hh:mm:ss').trim(),
          formatter: (opts:any) => `${opts.timestamp()} - ${opts.message}`
        })
      ]
    }).info('Bot restarted');
  }
  winston.loggers.get(channelTag).info(`${msg.author.username} - ${msg.content}`);

  let onReply = function(msg:string) {
    if (msg && canFetchMessages(context.channel)) {
      if (msg === 'EMBED') {
        context.channel.send( {embed: context.embed});
      }
      else {
        context.channel.send(msg);
      }

    }
  };

  let trimMessage = function(msg : string){
    if (msg.length>1995) {
      msg = msg.substr(0, 1990) + '...';
      console.log('Trimming excessively long message');
    }
    return msg;
  };

  let content = msg.content;
  const fleetId = context.fleetId;
  const fleetProm = fleets.get(fleetId);

  fleetProm.then( (fleet : any) => {
    // Allow fleet specific prefix if exists
    if (fleet && fleet.prefix) {
      const re = new RegExp(`^${fleet.prefix} `);
      content = content.replace(re, cfg.prefix + ' ');
    }

    console.log(content);

    if (cli.isCliSentence(content)) {
      cli.sendCommand(content, context).then(trimMessage).then(onReply);
    }
    else if(msg.mentions.has(bot.user ?? 'nothing at all') && !msg.mentions.everyone) {
      const re = new RegExp(`^.*?${cfg.botName}`);
      const str = msg.cleanContent.replace(re, '').trim();
      const cmd = cfg.prefix + ' ' + str;
      cli.sendCommand(cmd, context).then(trimMessage).then(onReply);
    }
    else {

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

// We subscribe to raw because the messageDelete event doesn't work on "old" messages
bot.on("raw", async (packet:any) => {
  if(packet.t === "MESSAGE_DELETE") {
    let messageID = packet.d.id;
    let channelID = packet.d.channel_id;
    await bot.channels.fetch(channelID);
    let channel = bot.channels.cache.get(channelID);
    if (channel && canFetchMessages(channel)) {
    // if (channel) {
      // channel.awaitMessages()
      channel.messages.fetch({limit:1, after:messageID}).then(msgs => {
        msgs.forEach(msg => {
          if (msg.author.id === bot.user!.id) {
            console.log('I replied to a deleted message - will try to delete my reply!' + msg);
            msg.delete();
          }
          else {
            // console.log(`Someone else replied : ${msg}`);
          }

        });
      }).catch(console.error);
    }

  }
});

// Schedule the gotcron
const schedule = require('node-schedule');
let crontab = '02 1,5,9,13,17,20 * * *';

console.log(`Scheduling gotcron at ${crontab}`);

schedule.scheduleJob(crontab, function(){
  console.log('Running gotcron');
  const { spawn } = require('child_process');
  const fs = require('fs');

  const got = spawn('./gotcron');
  got.stdout.pipe(fs.createWriteStream(cfg.dataPath+'logs/gotcron.log', {flags: 'a'}));

  got.on('close', (code:any) => {
    console.log(`gotcron exited with exit code ${code}`);
    console.log(`This process will also exit with ${code} to trigger restart`);
    process.exit(code);
  });
});


async function connectToDiscord() {
  console.log('Connecting to discord...');
  bot.login(cfg.token).then(async () => {

    // Pre-cache
    const myServer = await bot.guilds.fetch(cfg.gotServer);
    if (myServer) {
      await myServer.members.fetch()
    } else {
      throw new Error(`No members in my server ${cfg.gotServer}`)
    }

    // TODO: Post something to computer-core channel
    console.log('Connected to discord!');
  }).catch(function(e) {
    console.log('Failed to connect to discord:\n   ' + e);
    // Now what? In debug, we continue on since the webserver can work...
  });
}

// Give all the async init some time to happen
setTimeout(connectToDiscord, 2000);
