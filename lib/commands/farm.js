var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const missions = require("../missions.js");
const dropdb = require("../dropdb.js");
const Table = require('cli-table2');

module.exports = new Clapp.Command({
  name: "farm",
  desc: "best missions to farm an item",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;
    const userid = context.author.id;

    function adjCost(cost) {
      return argv.flags.kit ? Math.ceil(cost*0.75) : cost;
    }

    function starStr(s) {
      //return _.range(s).map(x => '\u2B50').join('');
      return _.range(s).map(x => '*').join('');
    }
    function handleItem(entrys) {

      // Sort by best cost first
      entrys = _.sortBy(entrys, e=> (adjCost(e.cost) * e.runs)/e.itemUnits);

      // entrys = _.first(entrys, 8); // Don't display too many yet to not blow display

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
        return [e.name, e.code, e.level, adjCost(e.cost), e.runs, foo.toFixed(1)];
      }

      table.push(['Mission','Code', 'Level', 'C', 'R', 'Cost']);
      entrys.map(entryStat).map(x=>table.push(x));
      return table.toString();

    }

    missions.matchItem(function(err,name) {
      if (err) {
        fulfill(err);
      }
      else {
        let lines = [];

        let entrys = missions.findByStarItem(args.stars, name);
        lines.push('```');
        lines.push(name + starStr(args.stars));
        lines.push('Wiki farm rates');
        const table = handleItem(entrys);
        lines.push(table);

        dropdb.findByStarItem(args.stars, name).then(botEntries => {
          if (context.isEntitled(userid) && botEntries && botEntries.length>0) {
            lines.push('Discord farm rates');
            lines = lines.concat(handleItem(botEntries));
          }

          lines.push('```');
          fulfill(lines.join('\n'));
        });

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


