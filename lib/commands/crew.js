var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');

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
    db.users = new Datastore({ filename: '/tmp/stt.json', autoload: true });

    const qry = { _id: userid };

    db.users.findOne(qry, function (err, doc) {
      // Create a default doc if user is new
      if (doc === null) {
        doc = {_id:userid, username: author, crew:[]}
      }
      if (args.cmd === 'add') {

        if (!doc.crew) {doc.crew = [];} // Vivify
        doc.crew.push({nickname: args.nickname});
        db.users.update(qry, doc, {upsert:true});

        const msg = `Hi ${author}. I have added ${args.nickname} for your crew list. You now have ${doc.crew.length} crew`;
        fulfill(msg);
      }
      else if (args.cmd === 'remove') {
        if (!doc.crew) {doc.crew = [];} // Vivify
        const newcrew = _.filter(doc.crew, x=>x.nickname !== args.nickname);
        if (newcrew.length < doc.crew.length) {
          doc.crew = newcrew;
          db.users.update(qry, doc, {upsert:true});
          const msg = `Hi ${author}, I have removed ${args.nickname} from your crew list`;
          fulfill(msg);
        }
        else {
          fulfill(`Sorry ${author}, ${args.nickname} wasn't in your crew list`);
        }


      }
      else if (args.cmd === 'list') {

        const names = doc.crew.map(x=>x.nickname);
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
      name: 'nickname',
      desc: 'Your unique nickname for the crewmember',
      type: 'string',
      required: false,
      default: ''
    },
    {
      name: 'newname',
      desc: 'For rename, the new nickname of the crewmember',
      type: 'string',
      default: ''
    }
  ]
});
