var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const chars = require('../chars.js');
const fleets = require('../fleetdb.js');
const crewdb = require('../crewdb.js');
const voyageSkills = ['cmd','dip','sec','eng','sci','med'];

module.exports = new Clapp.Command({
  name: 'event',
  desc: 'view or set event crew',

// Command function
  fn: (argv, context) => new Promise((fulfill) => {
    try {
      const author = context.author.username;
      const userid = context.author.id;
      const fleetId = context.fleetId;
      const args = argv.args;
      const emojify = context.emojify;
      const boldify = context.boldify;

      let appendEventTraitChars = function(lines, doc, fleet) {
        let charsToSearch = doc.crew;
        let entries = chars.allCrewEntries();
        entries = entries.filter(e => {
          return _.contains(charsToSearch.map(x => x.name), e.name);
        });

        doc.crew = charsToSearch; // Shove it back in so we can access the bonuses
        crewdb.calcAdjustedSkill(doc, fleet);
        let matchEntries = []; // Collate an OR query
        let searchParams = [];
        fleet.eventTrait.forEach(criteria => {
          let res = chars.searchCrewByCharTrait(criteria, entries);
          searchParams.push(res.searchParams);
          matchEntries = matchEntries.concat(res.entries);
        });

        let charEntries = entries.filter(x => _.contains(fleet.eventChar, x.name));
        const tb1 = chars.createCrewTable(charEntries, fleet.eventChar, charsToSearch, emojify, boldify);
        lines.push(tb1);

        const ret = chars.createCrewTable(matchEntries, searchParams, charsToSearch, emojify, boldify);
        lines.push(ret);

      };

      let appendEventChars = function(lines, doc, names) {

      };


      let fleetProm, crewProm;
      let lines = [];
      const criteria = [args.name1, args.name2, args.name3];
      if (args.type === 'add') {

        // Try by char/trait
        let entries = chars.allCrewEntries();
        let res = chars.searchCrewByCharTrait(criteria, entries);
        if (res.entries.length > 0) {
          fleetProm = fleets.addEventTrait(fleetId, criteria);
          fleetProm.then(fleet => {
            lines.push('**Event crew added**');
            lines.push('```');
            res.entries.forEach(e => lines.push(e.name));
            lines.push('```');
            fulfill(lines.join('\n'));
          });
        } else {
          fulfill(`${criteria} does not return any results`);
        }
      }
      else if (args.type === 'char') {
        // Try by specific char
        chars.matchOne(function (oneErr, name) {
          if (oneErr) {
            fulfill(oneErr);
          } else {
            fleets.addEventChar(fleetId, name);
            fulfill(`Added ${name} to event char list`);

          }
        }, args.name1, args.name2, args.name3);
      }
      else if (args.type === 'reset') {
        fleets.resetEvent(fleetId).then(x => fulfill('Event crew reset'));
      }
      else {
        fleetProm = fleets.get(fleetId);
        fleetProm.then(fleet => {
          crewdb.get(userid).then(doc => {

            appendEventTraitChars(lines, doc, fleet);
            fulfill(lines.join('\n'));
          });
        });
      }


    }
    catch (e) {
      fulfill(e);
    }
  }),
  args: [{
    name: 'type',
    desc: `reset|add|char`,
    type: 'string',
    default: '',
    required: false
  },{
    name: 'name1',
    desc: 'search criteria when adding event crew',
    type: 'string',
    default: '',
    required: false
  },{
    name: 'name2',
    desc: 'search criteria when adding event crew',
    type: 'string',
    default: '',
    required: false
  },{
    name: 'name3',
    desc: 'search criteria when adding event crew',
    type: 'string',
    default: '',
    required: false
  }]
});
