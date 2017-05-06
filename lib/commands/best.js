var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");



module.exports = new Clapp.Command({
  name: "best",
  desc: "search for best characters",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;

    let entrys = chars.allCrewEntries();
    /*if (argv.flags.stars) {
      entrys = entrys.filter(x=>x.stars == argv.flags.stars);
    }*/
    if (argv.flags.stars) {
      entrys = entrys.filter(x=>x.stars == argv.flags.stars);
    }
    entrys = entrys.map(_.clone); // Shallow clone as we will add a result

    const level = 100;

    const entryFn = {
      base : x => {
        const sk = x.skill.find(s => s.level===level && (argv.flags.fuse ? argv.flags.fuse : x.stars) === s.stars && s.skill === args.skill);
        return sk ? sk.base : 0;
      }
    };

    const fn = entryFn[args.category];
    entrys.forEach(e => {
      e.result = fn(e);
      //console.log(`${e.name} ${e.result}`);
    });
    entrys = _.sortBy(entrys, x=>-x.result);

    entrys = _.first(entrys, argv.flags.number); // TODO: Cap the number?

    function entryStat(entry) {
      const stars = (argv.flags.fuse ? argv.flags.fuse : entry.stars);
      const starStr = _.range(stars).map(x => emojify('1star')).join('');
      const darkStr = _.range(entry.stars - stars).map(x => emojify('1darkstar')).join('');
      const starSk = _.filter(entry.skill, sk => sk.stars === stars && sk.level === level);
      const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
      return `${entry.name} ${starStr}${darkStr} - ${skStr} - ${entry.result}`
    }

    let lines = entrys.map(entryStat);

    const head = entrys[0];
    fulfill(lines.join('\n'));

  }).catch(function (e) {
    console.log(e);
    throw e;
  }),
  args: [
    {
      name: 'skill',
      desc: 'featured skill: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: false,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec",
          validate: value => {
            return !!value.match(/^cmd|dip|sci|eng|med|sec|$/);
          }
        }
      ]
    },
    {
      name: 'category',
      desc: 'base|minroll|maxroll|avgroll',
      type: 'string',
      default: 'base',
      required: true
    }

  ],
  flags: [
    {
      name: 'stars',
      desc: 'Number of max stars the character has',
      alias: 's',
      type: 'number',
      default: 0
    },
    {
      name: 'fuse',
      desc: 'Fuse level to query at',
      alias: 'f',
      type: 'number',
      default: 0
    },
    {
      name: 'number',
      desc: 'Number of results to return (max/default:5)',
      alias: 'n',
      type: 'number',
      default: 5
    }
  ]
});


