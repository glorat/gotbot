var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require('../chars.js');
const matcher = require('../matcher.js');
const db = require('../crewdb.js');
const goalSeek = require('../modules/goalSeek.js');

function calcAntiMatter(skills, start, time) {
  if (skills.length !== 6) return 0;
  const mult = [3,2,1,1,1,1];

  // Constants!
  const baseSkill = 500;
  const dripHr = 140;
  const gainPerHr = 5;
  const lossPerHr = 30;
  const hazardsPerHr = 38;

  let antimatter = start;
  for (let m=0; m<6; m++) {
    antimatter += Math.min(time, (skills[m]-baseSkill)/1000) * hazardsPerHr * gainPerHr * mult[m] / 9.0;
    antimatter -= Math.max(0, time-(skills[m]-baseSkill)/1000) * hazardsPerHr * lossPerHr * mult[m] / 9.0;
  }

  antimatter -= dripHr * time;
  return antimatter;
}

module.exports = new Clapp.Command({
  name: "voytime",
  desc: "voyage time length calculator",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    try {
      const author = context.author.username;
      const userid = context.author.id;
      const args = argv.args;
      const emojify = context.emojify;

      const skills = [args.primary, args.secondary, args.oth1, args.oth2, args.oth3, args.oth4];

      if (args.time > 0) {
        const am = Math.floor(calcAntiMatter(skills, args.start, args.time));
        fulfill(`${am} antimatter`);
      }
      else {
        const t = goalSeek({
          Func: calcAntiMatter,
          aFuncParams: [skills, args.start, 1],
          oFuncArgTarget: {
            Position:2
          },
          Goal: 0,
          Tol: 0.01,
          maxIter: 1000
        });

        const hrs = Math.floor(t);
        const mins = Math.floor( (t-hrs)*60)

        fulfill(`Estimated voyage length of ${hrs}:${mins}`);
      }

    }
    catch (e) {
      fulfill(e);
    }
  }),
  args: [
    {
      name: 'primary',
      desc: 'primary skill total',
      type: 'number',
      required: true
    },
    {
      name: 'secondary',
      desc: 'secondary skill total',
      type: 'number',
      required: true
    },
    {
      name: 'oth1',
      desc: 'any 3rd skill total',
      type: 'number',
      required: true
    },
    {
      name: 'oth2',
      desc: 'any 4th skill total',
      type: 'number',
      required: true
    }
    ,
    {
      name: 'oth3',
      desc: 'any 5th skill total',
      type: 'number',
      required: true
    }
    ,
    {
      name: 'oth4',
      desc: 'any 6th skill total',
      type: 'number',
      required: true
    },
    {
      name: 'time',
      desc: 'time in hours into voyage. 0 to solve',
      type: 'number',
      required: false,
      default: 0
    },
    {
      name: 'start',
      desc: 'initial antimatter level',
      type: 'number',
      default: 2500,
      required: false
    }
  ],
  flags: [
    {
      name: 'best',
      desc: 'Use all characters to compute best gauntlet lineup',
      alias: 'b',
      type: 'boolean',
      default: false
    }
  ]
});

