var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const missions = require("../missions.js");
const dropdb = require("../dropdb.js");
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
  name: "drop",
  desc: "mission drop rates",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const author = context.author.username;
    const userid = context.author.id;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;

    if (!context.isEntitled(userid)) {
      fulfill(`Sorry, this function is in restricted beta`);
      return;
    }

    function starStr(s) {
      return _.range(s).map(x => '\u2B50').join('');
    }

    function adjCost(cost) {
      return argv.flags.kit ? Math.ceil(cost*0.75) : cost;
    }

    function viewMission(entrys) {

      let table = new Table({
        chars: {
          'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
          'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
          'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
          'middle': ''
        },
        wordWrap: true
      });

      function entryStat(e) {
        const foo =  (adjCost(e.cost) * e.runs)/e.itemUnits;
        return [0, e.itemName, starStr(e.itemStars), adjCost(e.cost), foo.toFixed(1)];
      }

      table.push(['#', 'Item','Stars', 'C', 'Cost']);
      var i = 0;
      entrys.map(entryStat).forEach(x=>{
        i++;
        x[0] = i;
        table.push(x)
      });
      return['```', entrys[0].name + ' ' + entrys[0].code +' ' + entrys[0].level, table.toString(), '```'];

    }


    let entrys = missions.findByMissionCode(args.mission, args.level);
    if (entrys.length === 0) return fulfill(`Unknown mission code ${code}`);
    let m = entrys[0]; // Reference entry for parent table info

    let lines = [];

    if (args.runs > 0) {
      lines = [`In ${args.runs} runs of ${m.name} ${m.code} ${m.level} it dropped`];
      lines = lines.concat(_.range(0, entrys.length).map(i => {
        return args[`drop${i+1}`] + ' x ' + entrys[i].itemName + starStr(entrys[i].itemStars)
      }));

      let total = 0;
      let rec2s = [];
      let wikiTotal = 0, wikiRuns = 0;
      _.range(0, entrys.length).forEach(i => {
        const n = args[`drop${i+1}`];
        let rec2 = {
          name: m.name, wiki: m.wiki, code: m.code,
          runs: args.runs, level: m.level, cost: m.cost,
          itemName: entrys[i].itemName, itemUnits: n, itemStars: entrys[i].itemStars,
          userid: userid, username: author
        };
        rec2s.push(rec2);


        total += n;
        wikiTotal += entrys[i].itemUnits;
        wikiRuns += entrys[i].runs / entrys.length; // Remember we are denormalised
      });
      const expectedTotal = +((wikiTotal/wikiRuns)*args.runs).toFixed(); // Rounding just in case

      if (total !== expectedTotal) {
        lines.push(`${boldify('WARNING:')} Expected ${expectedTotal} items but you've recorded ${total}`);
      }

      if (argv.flags.confirm) {
        dropdb.drops.insert(rec2s);
        lines.push('TODO: Will record this:' + JSON.stringify(rec2s));
      }
      else {
        lines.push(`Drop rate stats must be unbiased. You must decide to add the stats to the bot ${boldify('before')} you do the run and record. You ${boldify('must not')} decide to record after warping the mission`);
        lines.push('To confirm your understanding and accuracy of the information, add -y to the command to submit');
      }
      fulfill(lines.join('\n'));
    }
    else {
      lines.push('Wiki provided drop rates');
      lines = lines.concat(viewMission(entrys));

      dropdb.findByMissionCode(m.code, m.level).then(botEntries => {
        if (botEntries && botEntries.length>0) {
          lines.push('Discord provided drop rates');
          lines = lines.concat(viewMission(botEntries));
        }

        fulfill(lines.join('\n'));
      });


    }



  }),
  args: [
    {
      name: 'mission',
      desc: 'mission code',
      type: 'string',
      default: '',
      required: true
    },
    {
      name: 'level',
      desc: 'normal|elite|epic',
      type: 'string',
      required: true,
      validations: [
        {
          errorMessage: "Must be normal, elite or epic",
          validate: value => {
            return !!value.match(/^normal|elite|epic$/);
          }
        }
      ]
    },
    {
      name: 'runs',
      desc: 'number of runs that dropped items',
      type: 'number',
      default: 0,
      required: false
    }
  ].concat(_.range(1,7,1).map(i => {
    return     {
      name: 'drop' + i,
      desc: 'number of drops for item ' + i,
      type: 'number',
      default: 0,
      required: false
    }
  })),
  flags: [
    {
      name : 'confirm',
      alias: 'y',
      desc: 'confirm adding drop information',
      type: 'boolean',
      default: false
    }
  ]
});


