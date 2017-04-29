'use strict';

var assert = require('assert');
var expect = require('expect.js');
var gotBot = require('../lib');

const fs      = require('fs');
const Clapp   = require('../lib/modules/clapp-discord');

const cfg     = require('../config.js');

const pkg     = require('../package.json');



describe('gotBot', function () {


  var app = new Clapp.App({
    name: cfg.name,
    desc: pkg.description,
    prefix: cfg.prefix,
    version: pkg.version,
    onReply: (msg, context) => {
      context.callback(msg);
    }
  });


// Load every command in the commands folder
  fs.readdirSync('lib/commands/').forEach(file => {
    app.addCommand(require("../lib/commands/" + file));
  });

  function sendCommand(cmd, context) {
    assert(app.isCliSentence(cmd));

    let msgPromise = new Promise((resolve, reject) => {
      if (context == null) {
        context = {
          author: {username:'test', id:-1},
          isEntitled: function(){return true},
          emojify : x=>x
        };
      }
      context.callback = m => resolve(m);
      app.parseInput(cmd, context);
    });
    return msgPromise;
  }
  it('should have Rakal Troi stats!', function () {
    const cmd = '-dev bot stats rakal';
    sendCommand(cmd).then(function(msg) {
      expect(msg).to.contain('Rakal Troi');
    });
  });

  it('should not have unknown stats!', function (done) {
    const cmd = '-dev bot stats unknownnnn';
    sendCommand(cmd).then(data => {
      expect(data).to.contain('don\'t know any matching character from unknownnnn');
      done();
    }).catch(done);
  });

  it('should fail unknown commands', function(done) {
    const cmd = '-dev bot unknowncommand';
    sendCommand(cmd).then(data => {
      expect(data).to.contain('unknown command unknowncommand');
      done();
    }).catch(done);
  });

  it('should search find two kais', function(done) {
    const cmd = '-dev bot search kai';
    sendCommand(cmd).then(data => {
      expect(data).to.contain('2 results for Kai');
      expect(data).to.contain('Kai Opaka');
      expect(data).to.contain('Kai Winn');
      done();
    }).catch(done);
  });
});
