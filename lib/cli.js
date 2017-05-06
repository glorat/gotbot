'use strict';

const pkg     = require('../package.json');
const cfg     = require('../config.js');
const Clapp   = require('./modules/clapp-discord');

const fs      = require('fs');

var app = new Clapp.App({
  name: cfg.name,
  desc: pkg.description,
  prefix: cfg.prefix,
  version: pkg.version,
  onReply: (msg, context) => {
    context.callback(msg);
  }
});

module.exports = {
  sendCommand : sendCommand,
  isCliSentence : function(cmd) {return app.isCliSentence(cmd);}
};


// Load every command in the commands folder
fs.readdirSync('./lib/commands/').forEach(file => {
  app.addCommand(require("./commands/" + file));
});

function sendCommand(cmd, context) {

  let msgPromise = new Promise((resolve, reject) => {
    if (app.isCliSentence(cmd)) {
      context.callback = m => resolve(m);
      app.parseInput(cmd, context);
    }
    else {
      resolve('Not a valid command');
    }

  }).then(function(msg){
    if (msg.length>1995) {
      msg = msg.substr(0, 1990) + '...';
      console.log('Trimming excessively long message');
    }
    return msg;
  });
  return msgPromise;
}