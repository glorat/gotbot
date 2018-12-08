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

      let appendEventCrew = function(lines, userid, criteria) {
        return crewdb.get(userid).then(doc => {
          let charsToSearch = doc.crew;
          let entries = chars.allCrewEntries();
          entries = entries.filter(e => {
            return _.contains(charsToSearch.map(x => x.name), e.name);
          });

          const fleetId = context.fleetId;
          return fleets.get(fleetId).then(fleet => {
            doc.crew = charsToSearch; // Shove it back in so we can access the bonuses
            crewdb.calcAdjustedSkill(doc, fleet);
            let matchEntries = []; // Collate an OR query
            let searchParams = [];
            fleet.event.forEach(criteria => {
              let res = chars.searchCrewByCharTrait([criteria], entries);
              searchParams.push(res.searchParams);
              matchEntries = matchEntries.concat(res.entries);
            });

            const ret = chars.createCrewTable(matchEntries, searchParams, charsToSearch, emojify, boldify);
            lines.push(ret);
          });

        });
      };


      let fleetProm, crewProm;
      let lines = [];
      if (args.type === 'add') {
        // TODO: Validate criteria first
        let entries = chars.allCrewEntries();
        let res = chars.searchCrewByCharTrait([args.criteria], entries);
        if (res.entries.length > 0) {
          fleetProm = fleets.addEvent(fleetId, args.criteria);
          fleetProm.then(fleet => {
            lines.push('**Event crew added**');
            lines.push('```');
            res.entries.forEach(e => lines.push(e.name));
            lines.push('```');
            fulfill(lines.join('\n'));
          });
        }
        else {
          fulfill(`${args.criteria} does not return any results`);
        }
      }
      else if (args.type === 'reset') {
        fleets.resetEvent(fleetId).then(x => fulfill('Event crew reset'));
      }
      else {
        fleetProm = fleets.get(fleetId);
        fleetProm.then(fleet => {
          appendEventCrew(lines, userid, fleet.event).then(x => fulfill(lines.join('\n')));
        });
      }


    }
    catch (e) {
      fulfill(e.message);
    }
  }),
  args: [{
    name: 'type',
    desc: `reset|add`,
    type: 'string',
    default: '',
    required: false
  },{
    name: 'criteria',
    desc: 'search criteria when adding event crew',
    type: 'string',
    default: '',
    required: false
  }]
});
