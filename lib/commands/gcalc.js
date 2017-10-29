var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require('../chars.js');
const matcher = require('../matcher.js');
const Gauntlet = require('../../client/gauntlet.js');
const db = require('../crewdb.js');

module.exports = new Clapp.Command({
  name: "gcalc",
  desc: "gauntlet crew calculator",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    try {

      const author = context.author.username;
      const userid = context.author.id;
      const args = argv.args;
      const emojify = context.emojify;

      if (!context.isEntitled(userid)) {
        fulfill(`Sorry, this function is in restricted beta`);
        return;
      }

      const traits = _.chain([args.trait1, args.trait2, args.trait3])
        .filter(x => x != undefined && x != '')
        .value();
      var featuredTraits = [];
      _.forEach(traits, name => {
        matcher.matchOne(function (err, val) {
          if (err) throw err;
          featuredTraits.push(val);
        }, chars.allTraits(), 'trait', name);
      });

      const qry = {_id: userid};

      db.users.findOne(qry, function (err, doc) {
        if (argv.flags.best) {
          const allInfo = chars.allCrewEntries();
          const allNms = allInfo.map(x => x.name);

          const fullCrew = allNms.map(nm => {return {name:nm};}).map(char => chars.fullyEquip(char, _.find(allInfo, info => info.name === char.name) ));
          doc = {crew: fullCrew};
        }
        // Create a default doc if user is new
        if (doc === null || !doc.crew) {
          fulfill(`Sorry ${author}, you do not have any crew for the gauntlet`);
          return;
        }

        const featuredSkill = args.skill;
        const featuredSkillWeight = Gauntlet.featuredSkillWeight;
        let charTraits = {};
        chars.allCrewEntries().forEach(x=> {
          charTraits[x.name] = x.traits.split(',').map(x=>x.trim());
        });
        const availCrew = doc.crew.filter(x => !x.vaulted===true);

        const gchars = _.map(availCrew, Gauntlet.dbCharToChar).map(c => {
          c.crit = 5 + _.filter(featuredTraits, t => _.contains(charTraits[c.name], t)).length * 20;
          return c;
        });

        const bestNames = Gauntlet.topChars(gchars, featuredSkill, featuredSkillWeight);

        const best = _.filter(gchars,
          char => _.contains(bestNames, char.name)
        );

        let res = Gauntlet.analyseCharCombos(best, featuredSkill, featuredSkillWeight);

        let msg;
        if (res[0]) {
          msg = `Your best 5 crew for ${featuredSkill ? emojify(featuredSkill) : 'general'} and traits ${featuredTraits.join(', ')}\n   `
            + res[0].namesMore.join('\n   ') + "\n";
          msg += "Gauntlet strength " + Math.round(res[0].total) + "\n";
          msg += cfg.baseUrl + '#/gauntlet';
        }
        else {
          msg = 'Unable to provide an answer';
        }

        fulfill(msg);

      });
    }
    catch (e) {
      fulfill(e.message);
    }
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
          errorMessage: "Must be cmd|dip|sci|eng|med|sec or empty",
          validate: value => {
            return !!value.match(/^cmd|dip|sci|eng|med|sec|$/);
          }
        }
      ]
    },
    {
      name:'trait1',
      desc:'bonus gauntlet trait',
      type: 'string',
      default: '',
      required: false
    },
    {
      name:'trait2',
      desc:'bonus gauntlet trait',
      type: 'string',
      default: '',
      required: false
    },
    {
      name:'trait3',
      desc:'bonus gauntlet trait',
      type: 'string',
      default: '',
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
