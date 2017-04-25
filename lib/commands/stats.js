var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");



module.exports = new Clapp.Command({
  name: "stats",
  desc: "query stats for characters",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    const userid = msg.author.id;
    const args = argv.args;

    function emojify(sym) {
      const estat = msg.client.emojis.find(x=> x.name === sym.toLowerCase());
      return estat ? estat : sym;
    }


    function handleName(name, starsArg) {
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
            const starSk = _.filter(skill, sk => sk.stars === s);
            const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
            return `${starStr}${darkStr} - ${skStr}`
          }

          var msg = `**${name}** (${char}): ${info.traits}\n`;
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
`)
      return;
    }

    chars.matchOne(function(err,name) {
      if (err) {
        fulfill(err);
      }
      else {
        handleName(name, argv.flags.stars)
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
    }
  ]
});


