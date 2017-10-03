var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");

var bestEntries = function (argv, args, level) {
  const fuse = argv.flags.fuse;
  const stars = argv.flags.stars;
  const skill1 = args.skill1;
  const skill2 = args.skill2;
  const category = args.category;
  const entries = chars.allCrewEntries();
  return chars.bestChars(entries, stars, fuse, category, level, skill1, skill2);
};
module.exports = new Clapp.Command({
  name: "best",
  desc: "search for best characters",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;


    const level = 100;
    var entrys = bestEntries(argv, args, level);

    entrys = _.first(entrys, argv.flags.number); // TODO: Cap the number?

    function entryStat(entry) {
      const stars = (argv.flags.fuse ? argv.flags.fuse : entry.stars);
      const starStr = _.range(stars).map(x => emojify('1star')).join('');
      const darkStr = _.range(entry.stars - stars).map(x => emojify('1darkstar')).join('');
      const starSk = _.chain(entry.skill)
        .filter(sk => sk.stars === stars && sk.level === level)
        .sortBy(sk => - sk.base)
        .value();
      const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
      return `${starStr}${darkStr} ${entry.name} - ${skStr} - ${entry.result}`;
    }

    let lines = entrys.map(entryStat);
    fulfill(lines.join('\n'));

  }),
  args: [
    {
      name: 'category',
      desc: 'base|gauntlet|minroll|avg',
      type: 'string',
      default: 'base',
      required: true,
      validations: [
        {
          errorMessage: "Must be base|gauntlet|minroll|avg",
          validate: value => {
            return !!value.match(/^(base|gauntlet|minroll|avg)$/);
          }
        }
      ]
    },
    {
      name: 'skill1',
      desc: 'skill to query: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: false,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec",
          validate: value => {
            return !!value.match(/^(cmd|dip|sci|eng|med|sec|)$/);
          }
        }
      ]
    }
    ,
    {
      name: 'skill2',
      desc: 'second skill to query: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: false,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec",
          validate: value => {
            return !!value.match(/^(cmd|dip|sci|eng|med|sec|)$/);
          }
        }
      ]
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


