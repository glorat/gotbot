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
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    const userid = msg.author.id;
    const args = argv.args;

    var Datastore = require('nedb');
    var db = {};
    db.users = new Datastore({ filename: cfg.nedbpath, autoload: true });

    const qry = { _id: userid };

    db.users.findOne(qry, function (err, doc) {
      // Create a default doc if user is new
      if (doc === null || !doc.crew) {
        fulfill(`Sorry ${author}, you do not have any crew for the gauntlet`);
        return;
      }

      const featuredSkill = '';
      const featuredSkillWeight = Gauntlet.featuredSkillWeight;

      const chars = _.map(doc.crew, Gauntlet.dbCharToChar);

      var bestNames = Gauntlet.topChars(chars, featuredSkill, featuredSkillWeight);
      var best = _.filter(chars,
        char => _.contains(bestNames, char.name)
      );

      var res = Gauntlet.analyseCharCombos(best, featuredSkill, featuredSkillWeight);

      var msg = `Your eligible best crew are ${bestNames.join()}`;
      if (res[0]) {
        msg += "\n";
        msg += "Your best 5 crew are " + res[0].names.join() + "\n";
        msg += "Gauntlet strength " + res[0].total;
      }

      fulfill(msg);

    });
  }),
  args: [
    {
      name: 'command',
      desc: 'score',
      type: 'string',
      required: false,
      default: 'score',
      validations: [
        {
          errorMessage: "Must be score|todo",
          validate: value => {
            return !!value.match(/^score|todooooo$/);
          }
        }
      ]
    }
  ]
});
