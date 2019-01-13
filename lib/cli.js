'use strict';

const pkg     = require(process.cwd() + '/package.json');
const cfg     = require('../config.js');
const Clapp   = require('./modules/clapp-discord');
const clilog  = require('./clilog.js');

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
  isCliSentence : function(cmd) {return app.isCliSentence(cmd);},
  commands : function(){return app.commands;}
};


// Load every command in the commands folder
fs.readdirSync('./lib/commands/').forEach(file => {
  app.addCommand(require("./commands/" + file));
});

function sendCommand(cmd, context) {

  let msgPromise = new Promise((resolve, reject) => {
    if (app.isCliSentence(cmd)) {
      context.callback = m => resolve(m);
      clilog.logCommand(cmd,context);
      app.parseInput(cmd, context);
    }
    else {
      resolve('Not a valid command');
    }

  });
  return msgPromise;
}
