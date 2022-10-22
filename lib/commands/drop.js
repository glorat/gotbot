var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const missions = require("../missions");
const dropdb = require("../dropdb");
const Table = require('cli-table3');
const matcher = require('../matcher');

module.exports = new Clapp.Command({
  name: "drop",
  desc: "mission drop rates",

// Command function
  fn: (argv, context) => new Promise((fulfill) => { try {
    const author = context.author.username;
    const userid = context.author.id;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;

    if (!context.isEntitled(userid)) {
      fulfill(`Sorry, this function is in restricted beta`);
      return;
    }

    let starStr=function(s) {
      //return _.range(s).map(x => '\u2B50').join('');
      return _.range(s).map(x => '*').join('');
    };

    let adjCost = function(cost) {
      return argv.flags.kit ? Math.ceil(cost*0.75) : cost;
    };

    let viewMission = function(entrys) {

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
        const qtStr = e.itemQty>1 ? ` (x${e.itemQty})` : '';
        return [0, e.itemName + qtStr + starStr(e.itemStars), adjCost(e.itemUnits), foo.toFixed(1)];
      }

      table.push(['#', 'Item', 'N', 'Cost']);
      var i = 0;
      entrys.map(entryStat).forEach(x=>{
        i++;
        x[0] = i;
        table.push(x);
      });
      const contrib = _.last(entrys).username;
      return[
        '```',
        entrys[0].name + ' ' + entrys[0].code +' ' + entrys[0].level,
        entrys[0].runs + ' runs, ' + entrys[0].cost + ' chrons', // TODO: might be tickets
        table.toString(),
        contrib ? `Last contributed by ${contrib}` : '',
        '```'];

    };


    let handleMission = function(code) {

      let entrys = missions.findByMissionCode(code, args.level);
      if (entrys.length === 0) return fulfill(`Unknown mission code ${code}`);
      let m = entrys[0]; // Reference entry for parent table info

      let lines = [];

      if (args.runs > 0) {
        lines = [`In your ${args.runs} runs of ${m.name} ${m.code} ${m.level} it dropped`];
        lines.push('```');
        lines = lines.concat(_.range(0, entrys.length).map(i => {
          return args[`drop${i+1}`] + ' x ' + entrys[i].itemName + starStr(entrys[i].itemStars);
        }));
        lines.push('```');

        let total = 0;
        let rec2s = [];
        let wikiTotal = 0, wikiRuns = 0;
        _.range(0, entrys.length).forEach(i => {
          const n = args[`drop${i+1}`] / entrys[i].itemQty;
          let rec2 = {
            name: m.name, wiki: m.wiki, code: m.code,
            runs: args.runs, level: m.level, cost: m.cost,
            itemName: entrys[i].itemName, itemUnits: n, itemStars: entrys[i].itemStars,
            userid: userid, username: author, time: Date.now()
          };
          rec2s.push(rec2);

          total += n; // Scale down user submission by qty so we have drop units
          wikiTotal += entrys[i].itemUnits / entrys[i].itemQty;
          wikiRuns += entrys[i].runs / entrys.length; // Remember we are denormalised
        });
        const expectedTotal = +((wikiTotal/wikiRuns)*args.runs).toFixed(); // Rounding just in case

        if (total !== expectedTotal) {
          lines.push(`${boldify('ERROR:')} Expected ${expectedTotal} items but you've recorded ${total} drops. Record schematics as they show as there can be more than one unit in a drop`);
        }

        // Must confirm AND have a total match
        if (argv.flags.confirm && total === expectedTotal) {
          dropdb.drops.insert(rec2s);
          dropdb.findByMissionCodeAndUser(m.code, m.level, userid).then(botEntries => {
            if (botEntries && botEntries.length>0) {
              lines.push(author + ' provided drop rates');
              lines = lines.concat(viewMission(botEntries));
            }
            fulfill(lines.join('\n'));
          });
        }
        else {
          lines.push(`To avoid bias, decide to add the stats to the bot ${boldify('before')} you do the run and record, ${boldify('never after')}`);
          lines.push(`To confirm your understanding and accuracy of the information, ${boldify("add -y to the command to submit")}`);
          fulfill(lines.join('\n'));
        }

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
    };

    let search = missions.allMissionCodes().concat(missions.allMissionNames());
    matcher.matchOne(function(err,res) {
      if (err) {
        fulfill(err);
      }
      else {
        let code = res;
        if (_.contains(missions.allMissionNames(), code)) {
          // Actually it is a name need to match
          code = missions.missionNameToCode(code);
        }
        handleMission(code);
      }
    }, search, 'mission name or code', args.mission);

  }
  catch (e) {
    fulfill(e.message);
  }

  }),
  args: [
    {
      name: 'mission',
      desc: 'mission code or mission name',
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
    };
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


