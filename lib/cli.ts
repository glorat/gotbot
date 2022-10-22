'use strict';

const pkg     = require(process.cwd() + '/package.json');
import cfg from '../config';
import Clapp   = require('./modules/clapp-discord');
const clilog  = require('./clilog');

const fs      = require('fs');
import * as API from './Interfaces';

var app = new Clapp.App({
  name: cfg.botName,
  desc: pkg.description,
  prefix: cfg.prefix,
  version: pkg.version,
  onReply: (msg:any, context:API.Context) => {
    context.callback(msg);
  }
});

module.exports = {
  sendCommand : sendCommand,
  isCliSentence : function(cmd:string) {return app.isCliSentence(cmd);},
  commands : function(){return app.commands;}
};


// Load every command in the commands folder
fs.readdirSync('./lib/commands/').forEach((file:string) => {
  if (file.endsWith('.js') || file.endsWith('.ts')) {
    // TODO: This would be a good place to capture commands for native discord slash cmds
    app.addCommand(require("./commands/" + file.replace('.js','')));
  }
});

function sendCommand(cmd:string, context:API.Context) : Promise<string> {

  let msgPromise = new Promise<string>((resolve, reject) => {
    if (app.isCliSentence(cmd)) {
      context.callback = (m:any) => resolve(m);
      clilog.logCommand(cmd,context);
      app.parseInput(cmd, context);
    }
    else {
      resolve('Not a valid command');
    }

  });
  return msgPromise;
}
