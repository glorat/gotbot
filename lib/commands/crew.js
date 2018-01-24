var Clapp = require('../modules/clapp-discord');
const _ = require('underscore');
const chars = require('../chars.js');
const matcher = require('../matcher.js');
const db = require('../crewdb.js');

const Table = require('cli-table2');

var searchCrewByCharTrait = function (args, entries, cb) {
  let searchParams = [];
  try {
    const charsAndTraits = chars.allChars().concat(chars.allTraits());
    [args.name1, args.name2, args.name3].filter(x => x !== '').forEach(name => {
      matcher.matchOne(function (err, res) {
        if (err) {
          throw err;
        }
        searchParams.push(res);
        entries = entries.filter(
          entry => _.contains(entry.traits.split(',').map(x => x.trim()), res)
            || (entry.char === res)
            || _.contains(entry.moreChar, res));

      }, charsAndTraits, 'char or trait', name);
    });

    cb(null, {searchParams: searchParams, entries: entries});
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

    db.users.findOne(qry, function (err, doc) {
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

              db.users.update(qry, doc, {upsert: true});

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
              db.users.update(qry, doc, {upsert: true});
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
              db.users.update(qry, doc, {upsert: true});
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
              db.users.update(qry, doc, {upsert: true}); // Async updated
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

        searchCrewByCharTrait(args, entries, function (err, res) {
          if (err) {
            fulfill(err);
          } else {
            const matchingNames = res.entries.map(x => x.name);
            const matchingRoster = charsToSearch.filter(x => _.contains(matchingNames, x.name));
            const sortedRoster = _.sortBy(matchingRoster, x => -(x.maxstars * 1000 + x.stars * 100 + x.level));


            let table = new Table({
              chars: {
                'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '',
                'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '',
                'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '',
                'middle': ''
              },
              style: {'padding-left': 0, 'padding-right': 1},
              wordWrap: true
            });
            table.push(['', 'Name', '*', '*', 'Lvl'].concat(chars.skills));

            const lines = sortedRoster.map(char => {
              const tabOpts = {table: true};
              let ret = chars.statsFor(char, emojify, boldify, tabOpts);
              table.push(ret);
            });
            const ret = `${lines.length} matches for ${res.searchParams.join(', ')}\n` + '```' + table.toString() + '```';
            fulfill(ret);
          }
        });
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
