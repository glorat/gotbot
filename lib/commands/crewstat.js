var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');

module.exports = new Clapp.Command({
  name: "crewstat",
  desc: "updates stats for your crew",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    const userid = msg.author.id;
    const args = argv.args;

    var Datastore = require('nedb');
    var db = {};
    db.users = new Datastore({ filename: '/tmp/stt.json', autoload: true });

    const qry = { _id: userid };

    db.users.findOne(qry, function (err, doc) {
      // Create a default doc if user is new
      if (doc === null || !doc.crew) {
        fulfill(`Sorry ${author}, you don't have any crew to update`);
        return;
      }

      var char = _.find(doc.crew, x=>x.nickname === args.nickname);
      if (char) {
        char[args.stat] = _.pick(args, 'base', 'minroll', 'maxroll');
        db.users.update(qry, doc, {upsert: true});
        const estat = msg.client.emojis.find(x=> x.name === args.stat);
        fulfill(`${author}, I have updated ${estat} for ${args.nickname} to ${args.base}+(${args.minroll}-${args.maxroll})`)

      }
      else {
        fulfill(`Sorry ${author}, I cannot find ${args.nickname} in your crew`);
      }
    });
  }),
  args: [
    {
      name: 'nickname',
      desc: 'Your unique nickname for the crewmember',
      type: 'string',
      required: true
    },
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
    }

  ]
});
