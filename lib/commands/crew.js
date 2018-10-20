var Clapp = require('../modules/clapp-discord');
const _ = require('underscore');
const chars = require('../chars.js');
const matcher = require('../matcher.js');
const crewdb = require('../crewdb.js');
const fleets = require('../fleetdb.js');

let searchCrewByCharTrait = function (args, entries, cb) {
  try {
    cb(null, chars.searchCrewByCharTrait([args.name1, args.name2, args.name3], entries));
  } catch (e) {
    console.log(e);
    cb(e);
  }
};

module.exports = new Clapp.Command({
  name: 'crew',
  desc: 'manage your crew roster',

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const author = context.author.username;
    const userid = context.author.id;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;

    if (!context.isEntitled(userid)) {
      fulfill(`Sorry, this function is in restricted beta`);
      return;
    }

    const qry = {_id: userid};
    let statsOpt = {textOnly: argv.flags.textOnly};

    crewdb.get(userid, context).then(doc => {
      // Create a default doc if user is new
      if (doc === null) {
        doc = {_id: userid, username: author, crew: []};
      }
      if (args.cmd === 'add') {
        chars.matchOne(function (err, name) {
          if (err) {
            fulfill(err);
          } else {
            if (!doc.crew) {
              doc.crew = [];
            } // Vivify
            const char = {name: name};

            enrichChar(char, function () {
              doc.crew.push(char);

              crewdb.users.update(qry, doc, {upsert: true});

              const msg = `Hi ${author}. I have added ${chars.statsFor(char, emojify, boldify, statsOpt)}\nYou now have ${doc.crew.length} crew`;
              fulfill(msg);
            });
          }
        }, args.name1, args.name2, args.name3);
      }
      else if (args.cmd === 'remove') {
        if (!doc.crew) {
          doc.crew = [];
        } // Vivify
        const myNames = doc.crew.map(x => x.name);
        matcher.matchOne(function (err, name) {
          if (err) {
            fulfill(err);
          } else {
            const newcrew = _.filter(doc.crew, x => x.name !== name);
            if (newcrew.length < doc.crew.length) {
              doc.crew = newcrew;
              crewdb.users.update(qry, doc, {upsert: true});
              const msg = `Hi ${author}, I have removed ${name} from your crew list`;
              fulfill(msg);
            } else {
              fulfill(`Sorry ${author}, ${name} wasn't in your crew list`);
            }
          }
        }, myNames, 'character', args.name1, args.name2, args.name3);
      }
      else if (args.cmd === 'vault') {
        if (!doc.crew) {
          doc.crew = [];
        } // Vivify
        chars.matchOne(function (err, name) {
          if (err) {
            fulfill(err);
          } else {
            var char = _.find(doc.crew, x => x.name === name);
            if (!char) {
              char = {name: name};
              doc.crew.push(char);
            }

            char.vaulted = true;
            argv.flags.ff = true; // For enrich char
            enrichChar(char, function () {
              crewdb.users.update(qry, doc, {upsert: true});
              const msg = `Hi ${author}, ${name} has been added to your vault`;
              fulfill(msg);
            });
          }
        }, args.name1, args.name2, args.name3);
      } else if (args.cmd === 'unvault') {
        if (!doc.crew) {
          doc.crew = [];
        } // Vivify
        chars.matchOne(function (err, name) {
          if (err) {
            fulfill(err);
          } else {
            var char = _.find(doc.crew, x => x.name === name && x.vaulted);
            let msg;
            if (!char) {
              fulfill(`${name} is not in your vault`);
            }
            else {
              char.vaulted = false;
              crewdb.users.update(qry, doc, {upsert: true}); // Async updated
              const msg = `Hi ${author}, ${name} has been taken out of your vault`;
              fulfill(msg);
            }
          }
        }, args.name1, args.name2, args.name3);
      } else if (args.cmd === 'list') {
        const names = doc.crew.map(x => x.name);
        const msg = `Hi ${author}, you have these ${doc.crew.length} crew: ${names}`;
        fulfill(msg);
      } else if (args.cmd === 'search') {
        let charsToSearch = doc.crew;
        if (!argv.flags.vault) {
          // excluded vaulted chars
          charsToSearch = charsToSearch.filter(e => !e.vaulted === true);
        }

        let entries = chars.allCrewEntries();
        entries = entries.filter(e => {
          return _.contains(charsToSearch.map(x => x.name), e.name);
        });
        if (argv.flags.stars) {
          entries = entries.filter(e => e.stars === argv.flags.stars);
        }


        let searchCb = function(err, res) {
          if (err) {
            fulfill(err);
          } else {
            const ret = chars.createCrewTable(res.entries, res.searchParams, charsToSearch, emojify, boldify);
            fulfill(ret);
          }
        };

        if (~argv.flags.raw) {
          const fleetId = context.fleetId;
          fleets.get(fleetId).then(fleet => {
            doc.crew = charsToSearch; // Shove it back in so we can access the bonuses
            crewdb.calcAdjustedSkill(doc, fleet);
            searchCrewByCharTrait(args, entries, searchCb);
          });

        }
        else {
          searchCrewByCharTrait(args, entries, searchCb);
        }




      } else if (args.cmd === 'collect') {
        const haveNames = doc.crew.map(x => x.name);
        // Exclude those we have
        let charsToSearch = chars.allCrewEntries().filter(e => !_.contains(haveNames, e.name));
        // Filter by stars
        if (argv.flags.stars > 0) {
          charsToSearch = charsToSearch.filter(e => e.stars === argv.flags.stars);
        }
        // Filter by any supplied traits etc.
        searchCrewByCharTrait(args, charsToSearch, function (err, res) {
          if (err) {
            fulfill(err);
          } else {
            // Random sorting?!
            const count = res.entries.length;
            let ordered = _.first(_.shuffle(res.entries), 5);
            const lines = ordered
              .map(char => chars.fullyEquip({name: char.name}, char, char.stars, 100))
              .map(char => chars.statsFor(char, emojify, boldify, statsOpt));
            const ret = `${ordered.length}/${count} matches for for ${res.searchParams.join(', ')}\n` + lines.join('\n');
            fulfill(ret);
          }
        });
        fulfill(`TBD ${charsToSearch.length} entries`);
      } else {
        fulfill(`Sorry ${author}. I don't know how to ${args.cmd} to your crew roster`);
      }
    });

    function enrichChar(char, cb) {
      var stars = argv.flags.ff ? 999 : argv.flags.stars;
      var level = argv.flags.level;
      // Use supplied, 100 if ff/stars flag, else just 1
      level = level ? level : (stars ? 100 : 1);
      if (stars == 0) {
        stars = 1;
      }

      if (stars > 0) {
        chars.wikiLookup(char.name, function (err, info) {
          if (!err) {
            if (stars > info.stars) {
              stars = info.stars;
            }
            chars.fullyEquip(char, info, stars, level);
          }
          cb();
        });
      } else {
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
          errorMessage: 'Must be add, remove, vault, unvault, search, list, collect',
          validate: value => {
            return Boolean(value.match(/^add|remove|rename|list|vault|unvault|search|collect$/));
          }
        }
      ]
    },
    {
      name: 'name1',
      desc: 'name search for the crew member',
      type: 'string',
      default: ''
    },
    {
      name: 'name2',
      desc: 'name search for the crew member',
      type: 'string',
      default: ''
    },
    {
      name: 'name3',
      desc: 'name search for the crew member',
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
      name: 'ff',
      desc: 'fully fuse to max stars',
      alias: 'f',
      type: 'boolean',
      default: false
    },
    {
      name: 'vault',
      desc: 'included vaulted crew in search',
      alias: 'v',
      type: 'boolean',
      default: false
    },
    {
      name: 'level',
      desc: 'Skill level to query at. Should be 1,10,20,30,40,50,60,70,80,90,100 - Default:1',
      alias: 'l',
      type: 'number',
      default: 0
    },
    {
      name: 'textOnly',
      desc: 'concise text only display',
      alias: 't',
      type: 'boolean',
      default: false
    }
  ]
});
