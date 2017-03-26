var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
const cfg = require('../../config.js');
const _ = require('underscore');
const chars = require('../chars.js');

module.exports = new Clapp.Command({
  name: "crew",
  desc: "adds/updates crew members to your crew roster",

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
      if (doc === null) {
        doc = {_id:userid, username: author, crew:[]}
      }
      if (args.cmd === 'add') {
        chars.matchOne(function(err, name) {
          if (err) {
            fulfill(err)
          }
          else {

            if (!doc.crew) {doc.crew = [];} // Vivify
            doc.crew.push({name: name});
            db.users.update(qry, doc, {upsert:true});

            const msg = `Hi ${author}. I have added ${name} for your crew list. You now have ${doc.crew.length} crew`;
            fulfill(msg);
          }
        }, args.name1, args.name2, args.name3);
      }
      else if (args.cmd === 'remove') {
        if (!doc.crew) {doc.crew = [];} // Vivify
        chars.matchOne(function(err, name){
          if (err) {
            fulfill(err)
          }
          else {
            const newcrew = _.filter(doc.crew, x=>x.name !== name);
            if (newcrew.length < doc.crew.length) {
              doc.crew = newcrew;
              db.users.update(qry, doc, {upsert:true});
              const msg = `Hi ${author}, I have removed ${name} from your crew list`;
              fulfill(msg);
            }
            else {
              fulfill(`Sorry ${author}, ${name} wasn't in your crew list`);
            }
          }
        }, args.name1, args.name2, args.name3)




      }
      else if (args.cmd === 'list') {

        const names = doc.crew.map(x=>x.name);
        const msg = `Hi ${author}, you have these ${doc.crew.length} crew: ${names}`;
        fulfill(msg);
      }
      else {
        fulfill(`Sorry ${author}. I don't know how to ${args.cmd} to your crew roster`)
      }
    });

  }),
  args: [
    {
      name: 'cmd',
      desc: 'The action to take on your crew',
      type: 'string',
      required: true,
      validations: [
        {
          errorMessage: "Must be add, remove or list",
          validate: value => {
            return !!value.match(/add|remove|rename|list/);
          }
        }
      ]
    },
    {
      name: 'name1',
      desc: 'name search for the crew memember',
      type: 'string',
      default: ''
    },
    {
      name: 'name2',
      desc: 'name search for the crew memember',
      type: 'string',
      default: ''
    },
    {
      name: 'name3',
      desc: 'name search for the crew memember',
      type: 'string',
      default: ''
    }
  ]
});
