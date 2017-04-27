var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require('../chars.js');
const Gauntlet = require('../../client/gauntlet.js');

module.exports = new Clapp.Command({
  name: "gcalc",
  desc: "gauntlet crew calculator",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    try {

      const msg = context.msg;
      const channel = msg.channel.name;
      const author = msg.author.username;
      const userid = msg.author.id;
      const args = argv.args;

      function emojify(sym) {
        const estat = msg.client.emojis.find(x=> x.name === sym.toLowerCase());
        return estat ? estat : sym;
      }

      if (!context.isEntitled(userid)) {
        fulfill(`Sorry, this function is only available to GoT fleet members`);
        return;
      }

      const traits = _.chain([args.trait1, args.trait2, args.trait3])
        .filter(x => x != undefined && x != '')
        .value();
      var featuredTraits = [];
      _.forEach(traits, name => {
        chars.genMatchOne(function (err, val) {
          if (err) throw err;
          featuredTraits.push(val);
        }, chars.allTraits(), 'trait', name)
      });

      var Datastore = require('nedb');
      var db = {};
      db.users = new Datastore({filename: cfg.nedbpath, autoload: true});

      const qry = {_id: userid};

      db.users.findOne(qry, function (err, doc) {
        // Create a default doc if user is new
        if (doc === null || !doc.crew) {
          fulfill(`Sorry ${author}, you do not have any crew for the gauntlet`);
          return;
        }

        const featuredSkill = args.skill;
        const featuredSkillWeight = Gauntlet.featuredSkillWeight;
        var charTraits = {};
        chars.allCrewEntries().forEach(x=> {
          charTraits[x.name] = x.traits.split(',').map(x=>x.trim())
        });

        const gchars = _.map(doc.crew, Gauntlet.dbCharToChar).map(c => {
          c.crit = 5 + _.filter(featuredTraits, t => _.contains(charTraits[c.name], t)).length * 20;
          return c;
        });

        var bestNames = Gauntlet.topChars(gchars, featuredSkill, featuredSkillWeight);
        var best = _.filter(gchars,
          char => _.contains(bestNames, char.name)
        );

        var res = Gauntlet.analyseCharCombos(best, featuredSkill, featuredSkillWeight);

        var msg;
        if (res[0]) {
          msg = `Your best 5 crew for ${featuredSkill ? emojify(featuredSkill) : 'general'} and traits ${featuredTraits.join(', ')}\n   `
            + res[0].namesMore.join('\n   ') + "\n";
          msg += "Gauntlet strength " + Math.round(res[0].total) + "\n";
          msg += cfg.baseUrl + 'gauntlet.html';
        }
        else {
          msg = 'Unable to provide an answer';
        }

        fulfill(msg);

      });
    }
    catch (e) {
      fulfill(e);
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
  ]
});
