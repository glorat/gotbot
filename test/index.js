'use strict';

var assert = require('assert');
var expect = require('expect.js');
var _ = require('underscore');
const fs      = require('fs');
const cli   = require('../lib/cli.js');

var cfg     = require('../config.js');

const pkg     = require('../../package.json');

// const Promise = require("bluebird");

// Override env for testing
cfg.nedbpath = cfg.nedbpath.replace('stt.json','test_stt.json');
const db = require('../lib/crewdb.js');

describe('gotBot', function () {

  function sendCommand(cmd, context) {

    assert(cli.isCliSentence(cmd));
    if (context == null) {
      context = {
        author: {username:'test', id:-1},
        channel: {id: -1, name:'test channel'},
        fleetId: -1,
        isEntitled: function(){return true;},
        emojify : x=>x,
        boldify: x=>x
      };
    }
    return cli.sendCommand(cmd,context);
  }

  describe('stats command', function() {

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

    it('should show choices for multi-match', function(done) {
      sendCommand('-dev bot stats mirr sisko').then(data => {
        expect(data).to.contain('2 character matches. Did you mean');
        done();
      }).catch(done);
    });

    it('should match exact names', function(done) {
      sendCommand('-dev bot stats mirror sisko').then(data => {
        expect(data).to.contain('Mirror Sisko');
        expect(data).to.contain('Scoundrel');
        done();
      }).catch(done);
    });
  });

  describe('estats command', function(done) {
    it('should return an embed object', function(done) {
      sendCommand('-dev bot estats mirror sisko').then(data => {
        expect(data).to.be('EMBED');
        done();
      }).catch(done);
    });
  });


  it('should fail unknown commands', function(done) {
    const cmd = '-dev bot unknowncommand';
    sendCommand(cmd).then(data => {
      expect(data).to.contain('unknown command unknowncommand');
      done();
    }).catch(done);
  });

  describe('best command', function(done) {
    it('should best base eng', function(done) {
      sendCommand('-dev bot best base eng').then(data => {
        expect(data).to.contain('The Traveler'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
    it('should best gauntlet med', function(done) {
      sendCommand('-dev bot best gauntlet med').then(data => {
        expect(data).to.contain('Mirror Phlox'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
    it('should best gauntlet med sec', function(done) {
      sendCommand('-dev bot best gauntlet med sec').then(data => {
        expect(data).to.contain('Mirror Phlox'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
    it('should best base cmd -f1', function(done) {
      sendCommand('-dev bot best base cmd -f1').then(data => {
        expect(data).to.contain('Captain Sisko'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
    it('should best gauntlet', function(done) {
      sendCommand('-dev bot best gauntlet').then(data => {
        expect(data).to.contain('Locutus'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
    it('should validate query type', function(done) {
      sendCommand('-dev bot best foo').then(data => {
        expect(data).to.contain('Must be base|gauntlet'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
    it('should validate skill type', function(done) {
      sendCommand('-dev bot best base foo').then(data => {
        expect(data).to.contain('Must be cmd|dip'); // Best at time of writing - should stay top 5 for a while
        done();
      }).catch(done);
    });
  });
  describe('search command', function() {
    it('should find two kais', function(done) {
      const cmd = '-dev bot search kai';
      sendCommand(cmd).then(data => {
        expect(data).to.contain('2 results for Kai');
        expect(data).to.contain('Kai Opaka');
        expect(data).to.contain('Kai Winn');
        done();
      }).catch(done);
    });

    it('should find tuvix under both tuvok', function(done) {
      const cmd = '-dev bot search tuvok';
      sendCommand(cmd).then(data => {
        expect(data).to.contain('Tuvix');
        done();
      }).catch(done);
    });

    it('and neelix', function(done) {
      const cmd = '-dev bot search tuvok';
      sendCommand(cmd).then(data => {
        expect(data).to.contain('Tuvix');
        done();
      }).catch(done);
    });

    it('should not have Mirror Garak in klingon', function(done) {
      const cmd = '-dev bot search klingon';
      sendCommand(cmd).then(data => {
        expect(data).not.to.contain('Mirror Garak');
        done();
      }).catch(done);
    });
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
    });
  });

  describe('hello command', function() {
    it('should say hello', function(done) {
      sendCommand('-dev bot hello').then(data=>{
        expect(data).to.contain('Hi test (-1)');
        done();
      }).catch(done);
    });
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
        expect(data).to.match(/Hi test. I have added Rogue Kai Winn/);
        expect(data).to.contain('cmd 643');
        done();
      }).catch(done);
    });

    it('should add more crew', function(done) {
      sendCommand('-dev bot crew add rakal -f').then(data => {
        expect(data).to.match(/Hi test. I have added Rakal Troi/m);
        expect(data).to.contain('cmd 521');
        done();
      }).catch(done);
    });


    it('should fully equip crew to a fuse level', function(done) {
      sendCommand('-dev bot equip rog win -s3').then(data => {
        expect(data).to.match(/updated stats for Rogue Kai Winn/m);
        expect(data).to.contain('cmd 721');
        done();
      }).catch(done);
    });

    it('should fully equip crew to a fuse and skill level', function(done) {
      sendCommand('-dev bot equip rog win -s3 -l1').then(data => {
        expect(data).to.match(/updated stats for Rogue Kai Winn/m);
        expect(data).to.contain('cmd 70 ');
        done();
      }).catch(done);
    });

    it('should save stars and level in char', function(done) {
      const qry = { _id: -1 };
      db.users.findOne(qry, function (err, doc) {
        const name = 'Rogue Kai Winn';
        expect(doc).to.be.ok();
        var char = _.find(doc.crew, x=>x.name === name);
        expect(char).to.be.ok();
        expect(char.level).to.be(1);
        expect(char.stars).to.be(3);
        expect(char.maxstars).to.be(5);
        expect(char.cmd.base).to.be(70);
        done();
      });
    });

    it('should vault crew not in roster', function(done) {
      sendCommand('-dev bot crew vault cap jane').then(data => {
        expect(data).to.contain('Captain Janeway has been added to your vault');
        done();
      }).catch(done);
    });


    describe('gcalc command', function() {
      xit('should provide analysis for your crew', function(done) {
        this.timeout(10000); // Combinatorics is slow
        sendCommand('-dev bot gcalc').then(data=>{
          expect(data).to.contain('Gauntlet strength 179458');
          done();
        }).catch(done);
      });

      it('should provide analysis for your best lineup', function(done) {
        this.timeout(10000); // Combinatorics is slow
        sendCommand('-dev bot gcalc --best').then(data=>{
          expect(data).to.contain('The Caretaker');
          done();
        }).catch(done);
      });
    });

    it('should remove crew', function(done) {
      sendCommand('-dev bot crew remove rog win').then(data => {
        expect(data).to.match(/I have removed Rogue Kai Winn/);
        done();
      }).catch(done);
    });


    it('should search', function(done) {
      sendCommand('-dev bot crew search troi').then(data => {
        expect(data).to.match(/1 matches for Troi/);
        done();
      }).catch(done);
    });

    it('should remove more crew', function(done) {
      sendCommand('-dev bot crew remove rakal').then(data => {
        expect(data).to.match(/I have removed Rakal Troi/);
        done();
      }).catch(done);
    });

  });

  describe('voyage command', function() {
    /* depends on crew reset
    it('should require enough crew', function(done) {
      sendCommand('-dev bot voyage cmd dip').then(data=> {
        expect(data).to.contain('not have enough crew');
        done();
      }).catch(done);
    });*/

    it('should handle best crew', function(done) {
      sendCommand('-dev bot voyage cmd dip --best')
      .then(data=> {
        expect(data).to.contain('Your best crew');
        done();
      }).catch(done);
    });

  });

  describe('voytime command', function() {
    it('should calculate antimatter levels', function(done) {
      sendCommand('-dev bot voytime 2000 2000 2000 2000 2000 2000 2500 3').then(data=> {
        expect(data).to.contain('795 antimatter');
        done();
      }).catch(done);
    });

    it('should solve for 0 antimatter', function(done) {
      sendCommand('-dev bot voytime 2000 2000 2000 2000 2000 2000').then(data=> {
        expect(data).to.contain('Estimated voyage length of 3h 37m');
        done();
      }).catch(done);
    });

  });



  describe('farm command', function() {
    it('should match strings', function(done) {
      sendCommand('-dev bot farm 0 desktop monitor').then(data=>{
        expect(data).to.contain('Did you mean');
        done();
      }).catch(done);
    });

    it('should farm desktop monitor', function(done) {
      sendCommand('-dev bot farm 0 desktop monitor tng').then(data=>{
        expect(data).to.contain('```');
        done();
      }).catch(done);
    });
  });


  describe('event command', function(done) {
    it('should reset event chars', function(done) {
      sendCommand('-dev bot event reset').then(data => {
        expect(data).to.be('Event crew reset');
      }).then(data => sendCommand('-dev bot event')).then(data => {
        expect(data).to.contain('0 matches');
        done();
      }).catch(done);
    });

    it('should add and list event chars', function(done) {
      sendCommand('-dev bot event add troi').then(data => {
        expect(data).to.contain('Deanna Troi');
      }).then(data => sendCommand('-dev bot crew vault rakal troi')).then(data => {
      }).then(data => sendCommand('-dev bot event')).then(data => {
        expect(data).to.contain('R (Troi)');
        done();
      }).catch(done);
    });

  });
});

describe('missions', function() {
  let missions = require('../lib/missions.js');

  it('should have an item list', function(done) {
    missions.ready.then(function() {
      let all = missions.allMissionItems();
      expect(all.length).to.be.greaterThan(200); // 202 at time of writing
      expect(all).to.contain('Polyalloy');
      done();
    }).catch(done);

  });

  it('should match items', function(done) {
    missions.ready.then(function() {
      missions.matchItem(function(err, name) {
        expect(err).to.be(null);
        expect(name).to.be('Desktop Monitor (TNG)');
        done();
      }, 'desktop','monitor','tng');
    }).catch(done);
  });


  it('should fuzzy search items', function(done) {
    missions.ready.then(function() {
      missions.matchItem(function(err, name) {
        expect(err).to.be(null);
        expect(name).to.be('Polyalloy');
        done();
      }, 'polya');
    }).catch(done);
  });

  it('should query for an item', function(done) {
    missions.ready.then(function() {
      const match = missions.findByStarItem(0, 'Desktop Monitor (TNG)');
      expect(match.length).to.be(1);
      match.forEach(m => {
        console.log(`${m.name} ${m.level} ${m.cost}`);
      });
      done();
    }).catch(done);

  });

});

