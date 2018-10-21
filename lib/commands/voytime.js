var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const chars = require('../chars.js');
const matcher = require('../matcher.js');
const voyage = require('../voyage.js');

module.exports = new Clapp.Command({
  name: 'voytime',
  desc: 'voyage time length calculator',

// Command function
  fn: (argv, context) => new Promise((fulfill) => {
    try {
      const args = argv.args;

      const skills = [args.primary, args.secondary, args.oth1, args.oth2, args.oth3, args.oth4];

      let lines = [];
      if (args.time > 0) {
        const am = Math.floor(voyage.calcAntiMatter(skills, args.start, args.time));

        const skillSuccess = voyage.calcSkillSuccess(skills, args.time);
        lines.push('Estimated hazard success');
        skillSuccess.forEach(s => lines.push(`${s.good}/${s.total}`));
        lines.push(`${am} antimatter`);
      }
      else {
        const t = voyage.solveTime(skills, args.start);
        const hrs = Math.floor(t);
        const mins = Math.floor((t - hrs) * 60);
        const skillSuccess = voyage.calcSkillSuccess(skills, t);
        lines.push('Estimated hazard success');
        skillSuccess.forEach(s => lines.push(`${s.good}/${s.total}`));
        lines.push(`Estimated voyage length of ${hrs}h ${mins}m`);
      }

      if (argv.flags.config) {
        lines.push(voyage.configString());
      }

      fulfill(lines.join('\n'));
    }
    catch (e) {
      fulfill(e.toString());
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
    },
    {
      name: 'oth3',
      desc: 'any 5th skill total',
      type: 'number',
      required: true
    },
    {
      name: 'oth4',
      desc: 'any 6th skill total',
      type: 'number',
      required: true
    },
    {
      name: 'start',
      desc: 'initial antimatter level',
      type: 'number',
      default: 2500,
      required: false
    },
    {
      name: 'time',
      desc: 'time in hours into voyage. 0 to solve',
      type: 'number',
      required: false,
      default: 0
    }
  ],
  flags: [
    {
      name: 'config',
      desc: 'Display assumptions in the formula',
      alias: 'c',
      type: 'boolean',
      default: false
    }
  ]
});

