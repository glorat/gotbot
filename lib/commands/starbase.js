var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const chars = require('../chars.js');
const fleets = require('../fleetdb.js');
const voyageSkills = ['cmd','dip','sec','eng','sci','med'];

module.exports = new Clapp.Command({
  name: 'starbase',
  desc: 'set your starbase stats',

// Command function
  fn: (argv, context) => new Promise((fulfill) => {
    try {
      const author = context.author.username;
      const userid = context.author.id;
      const fleetId = context.fleetId;
      const args = argv.args;
      const emojify = context.emojify;

      let docProm;
      if (_.chain(chars.skills).map(sk=>args[sk]).some(b => b !== 0).value()) {
        docProm = fleets.updateStarbase(fleetId, args);
      }
      else {
        docProm = fleets.get(fleetId);
      }

      docProm.then(doc => {
        let b = doc.starbase;
        let bonuses = chars.skills.map(sk => `${emojify(sk)}+${b[sk]}%`).join('  ');
        fulfill(`Starbase bonus at ${bonuses}`);
      });

    }
    catch (e) {
      fulfill(e.message);
    }
  }),
  args: chars.skills.map(sk => ({
    name: sk,
    desc: `${sk} starbase bonus`,
    type: 'number',
    default: 0,
    required: false
  }))
});
