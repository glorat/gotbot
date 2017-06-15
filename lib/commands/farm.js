var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const missions = require("../missions.js");
const Table = require('cli-table2');

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
  name: "farm",
  desc: "best missions to farm an item",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;

    function adjCost(cost) {
      return argv.flags.kit ? Math.ceil(cost*0.75) : cost;
    }

    function handleItem(stars, name) {
      let entrys = missions.findByStarItem(stars, name);

      //entrys = _.first(entrys, argv.flags.number);
      entrys = _.sortBy(entrys, e=> (adjCost(e.cost) * e.runs)/e.itemUnits);

      let table = new Table({
        chars: {
          'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
          'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
          'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
          'middle': ''
        },
/*        colWidths: [
          Math.round(0.15*LINE_WIDTH), // We round it because providing a decimal number would
          Math.round(0.65*LINE_WIDTH)  // break cli-table2
        ],*/
        wordWrap: true
      });

      function entryStat(e) {
        const foo =  (adjCost(e.cost) * e.runs)/e.itemUnits;
        return [e.name, e.code, e.level, adjCost(e.cost), foo.toFixed(1)];
      }

      table.push(['Mission','Code', 'Level', 'C', 'Cost']);
      entrys.map(entryStat).map(x=>table.push(x));
      fulfill(['```', name, table.toString(), '```'].join('\n'));

    }

    missions.matchItem(function(err,res) {
      if (err) {
        fulfill(err);
      }
      else {
        handleItem(args.stars, res);
        fulfill(`You are searching for ${res}`);
      }

    }, args.name1, args.name2, args.name3);

  }),
  args: [
    {
      name: 'stars',
      desc: 'stars for item being farmed',
      type: 'number',
      default: 0,
      required: true,
      validations: [
        {
          errorMessage: "Must be 0 (basic) to 5 (legendary)",
          validate: value => {
            return value>=0 && value<=5;
          }
        }
      ]
    },
    {
      name: 'name1',
      desc: 'name of item to farm',
      type: 'string',
      default: '',
      required: true
    },
    {
      name: 'name2',
      desc: 'name of item to farm',
      type: 'string',
      default: '',
      required: false
    },
    {
      name: 'name3',
      desc: 'name of item to farm',
      type: 'string',
      default: '',
      required: false
    }
  ],
  flags: [
    {
      name : 'kit',
      desc: 'adjust costs for supply kit',
      alias: 'k',
      type: 'boolean',
      default: false
    }
  ]
});


