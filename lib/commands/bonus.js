var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const chars = require('../chars');
const fleets = require('../fleetdb');
const crewdb = require('../crewdb');
const voyageSkills = ['cmd','dip','sec','eng','sci','med'];

module.exports = new Clapp.Command({
  name: 'bonus',
  desc: 'set your fleet and personal stat bonuses',

// Command function
  fn: (argv, context) => new Promise((fulfill) => {
    try {
      const author = context.author.username;
      const userid = context.author.id;
      const fleetId = context.fleetId;
      const args = argv.args;
      const emojify = context.emojify;

      let fleetProm, crewProm;
      if (_.chain(chars.skills).map(sk=>args[sk]).some(b => b !== 0).value()) {
        if (args.type === 'fleetbase') {
          fleetProm = fleets.updateStarbase(fleetId, args);
          crewProm = crewdb.get(userid);
        }
        else if (args.type === 'fleetprof') {
          fleetProm = fleets.updateStarprof(fleetId, args);
          crewProm = crewdb.get(userid);
        }
        else if (args.type === 'mybase') {
          let filtered = _.pick(args, chars.skills);
          let update = doc => {doc.base = filtered; return doc;};
          crewProm = crewdb.update(userid, update);
          fleetProm = fleets.get(fleetId);
        }
        else if (args.type === 'myprof') {
          let filtered = _.pick(args, chars.skills);
          let update = doc => {doc.prof = filtered; return doc;};
          crewProm = crewdb.update(userid, update);
          fleetProm = fleets.get(fleetId);
        }
        else {
          throw `Unknown starbase bonus type ${args.type}`;
        }
      }
      else {
        crewProm = crewdb.get(userid);
        fleetProm = fleets.get(fleetId);
      }

      fleetProm.then(fleet => {
        let b = fleet.starbase;
        let bonuses = chars.skills.map(sk => `${emojify(sk)}+${b[sk]}%`).join('  ');
        let ret = `Starbase bonus at\n${bonuses}\n`;
        let b2 = fleet.starprof;
        let bon2 = chars.skills.map(sk => `${emojify(sk)}+${b2[sk]}%`).join('  ');
        ret += `Starbase proficiency bonus at\n${bon2}\n`;
        crewProm.then(crew => {
          let bon3 = chars.skills.map(sk => `${emojify(sk)}+${crew.base[sk]}%`).join('  ');
          ret += `Personal base bonus at\n${bon3}\n`;
          let bon4 = chars.skills.map(sk => `${emojify(sk)}+${crew.prof[sk]}%`).join('  ');
          ret += `Personal prof bonus at\n${bon4}`;
          fulfill(ret);
        });
      });

    }
    catch (e) {
      fulfill(e.message);
    }
  }),
  args: [{
    name: 'type',
    desc: `fleetbase|fleetprof|mybase|myprof`,
    type: 'string',
    default: '',
    required: false
  }].concat(chars.skills.map(sk => ({
    name: sk,
    desc: `${sk} bonus`,
    type: 'number',
    default: 0,
    required: false
  })))
});
