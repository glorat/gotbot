var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const request = require('request');


module.exports = new Clapp.Command({
  name: "gaunt",
  desc: "calculate gauntlet success",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {

    const a = argv.args;

    function roll(min, max, critpc) {
      const crit = critpc/100.0;
      return ( Math.floor((Math.random() * (max-min)) + min) * (Math.random() < crit ? 2 : 1));
    }

    var wins = 0;
    var number_of_rounds=50000;
    for (var i=0; i<number_of_rounds; i++) {
      var p1total = 0;
      p1total += roll(a.p1s1min, a.p1s1max, a.p1crit);
      p1total += roll(a.p1s1min, a.p1s1max, a.p1crit);
      p1total += roll(a.p1s1min, a.p1s1max, a.p1crit);
      p1total += roll(a.p1s2min, a.p1s2max, a.p1crit);
      p1total += roll(a.p1s2min, a.p1s2max, a.p1crit);
      p1total += roll(a.p1s2min, a.p1s2max, a.p1crit);

      var p2total = 0;
      p2total += roll(a.p2s1min, a.p2s1max, a.p2crit);
      p2total += roll(a.p2s1min, a.p2s1max, a.p2crit);
      p2total += roll(a.p2s1min, a.p2s1max, a.p2crit);
      p2total += roll(a.p2s2min, a.p2s2max, a.p2crit);
      p2total += roll(a.p2s2min, a.p2s2max, a.p2crit);
      p2total += roll(a.p2s2min, a.p2s2max, a.p2crit);
      // Changed from > to >= since a DB change to treat draws as wins
      if (p1total >= p2total) {
        wins++;
      }
    }

    const p = wins/number_of_rounds;
    var ret = "You would win "+ Math.floor(p*100)+"% of the time!";
    if (p > 0.7) {
      const streak = Math.log(0.5) / Math.log(p);
      ret += " Mean streak:  " + Math.floor(streak);
    }

    fulfill(ret);
  }),
  // gaunt [left_crit] [left_min1] [left_max1] [left_min2] [left_max2]
  // [right_crit] [right_min1] [right_max1] [right_min2] [right_max2]
  args: [
    {
      name: 'p1crit',
      desc: 'your crit % chance',
      type: 'number',
      required: true
    },
    {
      name: 'p1s1min',
      desc: 'min roll of skill 1',
      type: 'number',
      required: true
    },
    {
      name: 'p1s1max',
      desc: 'max roll of skill 1',
      type: 'number',
      required: true
    },
    {
      name: 'p1s2min',
      desc: 'min roll of skill 2',
      type: 'number',
      required: true
    },
    {
      name: 'p1s2max',
      desc: 'max roll of skill 2',
      type: 'number',
      required: true
    },
    {
      name: 'p2crit',
      desc: 'their crit % chance',
      type: 'number',
      required: true
    },
    {
      name: 'p2s1min',
      desc: 'min roll of skill 1',
      type: 'number',
      required: true
    },
    {
      name: 'p2s1max',
      desc: 'max roll of skill 1',
      type: 'number',
      required: true
    },
    {
      name: 'p2s2min',
      desc: 'min roll of skill 2',
      type: 'number',
      required: true
    },
    {
      name: 'p2s2max',
      desc: 'max roll of skill 2',
      type: 'number',
      required: true
    }
  ]
});
