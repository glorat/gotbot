'use strict';

var assert = require('assert');
var expect = require('expect.js');

const fs      = require('fs');
const Clapp   = require('../lib/modules/clapp-discord');

var cfg     = require('../config.js');

const pkg     = require('../package.json');

// const Promise = require("bluebird");

// Override env for testing
cfg.nedbpath = cfg.nedbpath.replace('stt.json','test_stt.json');


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
          channel: {name:'test channel'},
          isEntitled: function(){return true},
          emojify : x=>x,
          boldify: x=>x
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

  it('should handle foo', function(done) {
    const cmd = '-dev bot foo';
    sendCommand(cmd).then(data => {
      expect(data).to.contain('Hi test (-1). Thanks for sending in channel test channel');
      done();
    }).catch(done);
  });
  describe('gaunt command',function(){
    it('should calculate even match', function(done) {
      const cmd = '-dev bot gaunt 5 100 900 100 900 5 100 900 100 900';
      sendCommand(cmd).then(data => {
        // Not deterministic but this should be good enough to make the test stable
        expect(data).to.match(/You would win (49|50|51)% of the time/);
        done();
      }).catch(done);
    })
  });

  describe('hello command', function() {
    it('should say hello', function(done) {
      sendCommand('-dev bot hello').then(data=>{
        expect(data).to.contain('Hi test (-1)');
        done();
      }).catch(done);
    })
  });

  describe('crew commands',function(){
    it('should list crew', function(done){
      sendCommand('-dev bot crew list').then(data => {
        expect(data).to.match(/you have these/);
        done();
      }).catch(done);

    });

    it('should add crew', function(done) {
      sendCommand('-dev bot crew add rog win -s2').then(data => {
        expect(data).to.match(/Hi test. I have added Rogue Kai Winn cmd 643/);
        done();
      }).catch(done);
    });

    it('should add more crew', function(done) {
      sendCommand('-dev bot crew add rakal -f').then(data => {
        expect(data).to.match(/Hi test. I have added Rakal Troi cmd 510/);
        done();
      }).catch(done);
    });


    it('should fully equip crew to a fuse level', function(done) {
      sendCommand('-dev bot equip rog win -s3').then(data => {
        expect(data).to.match(/updated stats for Rogue Kai Winn cmd 721/);
        done();
      }).catch(done);
    });

    it('should fully equip crew to a fuse and skill level', function(done) {
      sendCommand('-dev bot equip rog win -s3 -l1').then(data => {
        expect(data).to.match(/updated stats for Rogue Kai Winn cmd 70/);
        done();
      }).catch(done);
    });

    it('should vault crew not in roster', function(done) {
      sendCommand('-dev bot crew vault cap jane').then(data => {
        expect(data).to.contain('Captain Janeway has been added to your vault');
        done();
      }).catch(done);
    });

/*
    describe('gcalc command', function() {
      it('should provide analysis', function(done) {
        this.timeout(10000); // Combinatorics is slow
        sendCommand('-dev bot gcalc').then(data=>{
          expect(data).to.contain('Gauntlet strength 179458');
          done();
        }).catch(done);
      })
    });
*/
    it('should remove crew', function(done) {
      sendCommand('-dev bot crew remove rog win').then(data => {
        expect(data).to.match(/I have removed Rogue Kai Winn/);
        done();
      }).catch(done)
    });

    it('should remove more crew', function(done) {
      sendCommand('-dev bot crew remove rakal').then(data => {
        expect(data).to.match(/I have removed Rakal Troi/);
        done();
      }).catch(done);
    });

  });
});
