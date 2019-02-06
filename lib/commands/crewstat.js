const Clapp = require('../modules/clapp-discord');
const _ = require('underscore');
const chars = require('../chars.js');
const crewdb = require('../crewdb.js');

module.exports = new Clapp.Command({
  name: "crewstat",
  desc: "updates stats for your crew",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const author = context.author.username;
    const userid = context.author.id;
    const args = argv.args;

    if (!context.isEntitled(userid)) {
      fulfill(`Sorry, this function is in restricted beta`);
      return;
    }

    const qry = { _id: userid };

    crewdb.get(userid).then(function (doc) {
      // Create a default doc if user is new
      if (doc === null || !doc.crew) {
        fulfill(`Sorry ${author}, you do not have any crew to update`);
        return;
      }

      chars.matchOne(function(err, name) {
        if (err) {
          fulfill(err);

        }
        else {
          var char = _.find(doc.crew, x=>x.name === name);
          if (char) {
            char[args.stat] = _.pick(args, 'base', 'minroll', 'maxroll');
            crewdb.users.update(qry, doc, {upsert: true});
            fulfill(`${author}, I have updated ${context.emojify(args.stat)} for ${char.name} to ${args.base}+(${args.minroll}-${args.maxroll})`);

          }
          else {
            fulfill(`Sorry ${author}, I cannot find ${name} in your crew`);
          }
        }
      }, args.name1, args.name2, args.name3);


    });
  }),
  args: [
    {
      name: 'stat',
      desc: 'cmd|dip|sci|eng|med|sec',
      type: 'string',
      required: true,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec",
          validate: value => {
            return !!value.match(/^cmd|dip|sci|eng|med|sec$/);
          }
        }
      ]
    },
    {
      name: 'base',
      desc: 'base value for stat',
      type: 'number',
      required: true
    },
    {
      name: 'minroll',
      desc: 'min roll for stat',
      type: 'number',
      required: true
    },
    {
      name: 'maxroll',
      desc: 'max roll for stat',
      type: 'number',
      required: true
    },
    {
      name: 'name1',
      desc: 'search string for name',
      type: 'string',
      required: true
    },
    {
      name: 'name2',
      desc: 'search string for name',
      type: 'string',
      default: ''
    },
    {
      name: 'name3',
      desc: 'search string for name',
      type: 'string',
      default: ''
    }
  ]
});
