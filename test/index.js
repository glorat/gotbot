'use strict';

var assert = require('assert');
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



  const context = {
    author: {username:'test', id:-1},
    isEntitled: function(){return true},
    emojify : x=>x
  };


  it('should have Rakal Troi stats!', function () {
    const cmd = '-dev bot stats rakal';
    assert(app.isCliSentence(cmd));
    context.callback = function(msg) {
      console.log(msg);
      assert(msg.match('Rakal Troi') !== null);
    };
    app.parseInput(cmd, context);
  });

  it('should not have unknown stats!', function (done) {
    const cmd = '-dev bot stats unknownnnn';
    assert(app.isCliSentence(cmd));

    let msgPromise = new Promise((resolve, reject) => {
      context.callback = m => resolve(m);
      app.parseInput(cmd, context);
    });
    msgPromise.then(data => {
      assert(null !== data.match('don\'t know any matching character from unknownnnn'));
      done();
    }).catch(done);
  });

  it('should fail unknown commands', function(done) {
    const cmd = '-dev bot unknowncommand';

    let msgPromise = new Promise((resolve, reject) => {
      context.callback = m => resolve(m);
      app.parseInput(cmd, context);
    });
    msgPromise.then(data => {
      assert(null !== data.match('unknown command unknowncommand'));
      done();
    }).catch(done);
  })
});
