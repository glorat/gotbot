var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");



module.exports = new Clapp.Command({
  name: "stats",
  desc: "query stats for characters",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;

    function handleName(name, starsArg, level) {
      chars.wikiLookup(name, function(err,info) {
      //chars.ssrLookup(name, function(err,info) {
        if (err) {
          fulfill(err);
        }
        else {

          const stars = info.stars;
          const skill = info.skill;
          const char = info.char;

          function starStat(s) {
            const starStr = _.range(s).map(x => emojify('1star')).join('');
            const darkStr = _.range(stars - s).map(x => emojify('1darkstar')).join('');
            const starSk = _.filter(skill, sk => sk.stars === s && sk.level === level);
            const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
            return `${starStr}${darkStr} - ${skStr}`
          }
          const levelStr = (level!==100) ? `Level ${level}: ` : '';
          var msg = `${boldify(name)} (${char}): ${levelStr}${info.traits}\n`;
          if (starsArg > 0 && starsArg < stars) {msg += starStat(starsArg) + '\n'}
          else if (stars === 5) { msg += starStat(1) + '\n';}
          msg += starStat(stars);
          fulfill(msg);
        }
      });

    }

    if (args.name1.toLowerCase() === 'gabe') {
      fulfill(`Gabe: Admiral,Human,Diplomat,Whoosher,Cultural Figure
${emojify('1star')}${emojify('1star')}${emojify('1star')}${emojify('1star')}${emojify('1star')} - ${emojify('dip')} 922 (354-698) ${emojify('sci')} 926 (247-492) ${emojify('sec')} 1191 (197-525)
`);
      return;
    }

    chars.matchOne(function(err,name) {
      if (err) {
        fulfill(err);
      }
      else {
        handleName(name, argv.flags.stars, argv.flags.level)
      }
    },args.name1, args.name2, args.name3);
  }),
  args: [
    {
      name: 'name1',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false
    },
    {
      name: 'name2',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false
    },
    {
      name: 'name3',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false
    }

  ],
  flags: [
    {
      name: 'stars',
      desc: 'Number of fused stars to query at',
      alias: 's',
      type: 'number',
      default: 0
    },
    {
      name: 'level',
      desc: 'Skill level to query at. Should be 1,10,20,30,40,50,60,70,80,90,100',
      alias: 'l',
      type: 'number',
      default: 100
    }
  ]
});


