var Clapp = require('../modules/clapp-discord');
const _ = require('underscore');
const chars = require('../chars.js');
const db = require('../crewdb.js');

var searchCrewByCharTrait = function (args, searchParams, entries, cb) {
  try {
    const charsAndTraits = chars.allChars().concat(chars.allTraits());
    [args.name1, args.name2, args.name3].filter(x=>x !== '').forEach(name => {
      chars.genMatchOne(function (err, res) {
        if (err) throw err;
        searchParams.push(res);
        const re = `\\b${res}\\b`;
        entries = entries.filter(entry => entry.traits.match(new RegExp(re)) || (entry.char === res));

      }, charsAndTraits, 'char or trait', name);
    });

    cb(null, {searchParams: searchParams, entries: entries});
  }
  catch (e) {
    console.log(e);
    cb(e);
  }
};


module.exports = new Clapp.Command({
  name: "crew",
  desc: "adds/updates crew members to your crew roster",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const author = context.author.username;
    const userid = context.author.id;
    const args = argv.args;
    const emojify = context.emojify;

    if (!context.isEntitled(userid)) {
      fulfill(`Sorry, this function is only available to GoT fleet members`);
      return;
    }

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
            const char = {name:name};

            enrichChar(char, function() {
              doc.crew.push(char);

              db.users.update(qry, doc, {upsert:true});

              const msg = `Hi ${author}. I have added ${name} ${chars.statsFor(char, emojify)}\nYou now have ${doc.crew.length} crew`;
              fulfill(msg);
            });
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
      else if (args.cmd === 'search') {
        var entries = chars.allCrewEntries();
        entries = entries.filter( e => {
          return _.contains(doc.crew.map(x=>x.name),  e.name);
        });
        var searchParams = [];
        searchCrewByCharTrait(args, searchParams, entries, function(err, res) {
          if (err) {
            fulfill(err);
          }
          else {
            const matchingNames = res.entries.map(x=>x.name);
            const matchingRoster = doc.crew.filter(x=>_.contains(matchingNames, x.name));
            const lines = matchingRoster.map(char => `**${char.name}** ${chars.statsFor(char,emojify)}`);
            const ret = `${lines.length} matches for ${res.searchParams.join(', ')}\n` + lines.join('\n');
            fulfill(ret);
          }
        });

      }
      else {
        fulfill(`Sorry ${author}. I don't know how to ${args.cmd} to your crew roster`)
      }
    });


    function enrichChar(char, cb) {
      var stars = argv.flags.ff ? 999 : argv.flags.stars;

      if (stars > 0) {
        chars.wikiLookup(char.name, function(err, info) {
          if (!err) {
            if (stars > info.stars) {stars = info.stars}
            chars.fullyEquip(char, info, stars);
          }
          cb();
        });
      }
      else {
        cb();
      }
    }



  }),
  args: [
    {
      name: 'cmd',
      desc: 'The action to take on your crew',
      type: 'string',
      required: true,
      validations: [
        {
          errorMessage: "Must be add, remove, search or list",
          validate: value => {
            return !!value.match(/add|remove|rename|list|search/);
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
  ],
  flags: [
    {
      name: 'stars',
      desc: 'Full equiped to fused stars',
      alias: 's',
      type: 'number',
      default: 0
    },
    {
      name : 'ff',
      desc: 'fully fuse to max stars',
      alias: 'f',
      type: 'boolean',
      default: false
    }
    ]
});
