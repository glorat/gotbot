'use strict';

const fs      = require('fs');
const Clapp   = require('./modules/clapp-discord');
const cfg     = require('../config.js');
const pkg     = require('../package.json');
const Discord = require('discord.js');
const bot     = new Discord.Client();

var app = new Clapp.App({
  name: cfg.name,
  desc: pkg.description,
  prefix: cfg.prefix,
  version: pkg.version,
  onReply: (msg, context) => {
    // Fired when input is needed to be shown to the user.

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

  if (app.isCliSentence(msg.content)) {
    app.parseInput(msg.content, {
      msg: msg
      // Keep adding properties to the context as you need them
    });
  }
});

bot.login(cfg.token).then(() => {
  console.log('Running!');
});


var express = require('express')
var http = express()

http.get('/', function (req, res) {
  res.send('Hello World!')
})

http.get('/user/:userId', function (req, res) {

    var Datastore = require('nedb');
    var db = {};
    db.users = new Datastore({ filename: '/tmp/stt.json', autoload: true });
    const qry = { _id: req.params.userId };

    db.users.findOne(qry, function (err, doc) {
        if (doc === null) {
          doc = {_id:req.params.userId, username: 'anonymous', crew:[]};
        }
		res.json(doc);
	});
})

http.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
