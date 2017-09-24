var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require('../chars.js');
const matcher = require('../matcher.js');
const db = require('../crewdb.js');

module.exports = new Clapp.Command({
  name: "voyage",
  desc: "voyage crew calculator",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    try {

      const author = context.author.username;
      const userid = context.author.id;
      const args = argv.args;
      const emojify = context.emojify;

      if (!context.isEntitled(userid)) {
        fulfill(`Sorry, this function is in restricted beta`);
        return;
      }

      const qry = {_id: userid};

      db.users.findOne(qry, function (err, doc) {
        if (argv.flags.best) {
          const allInfo = chars.allCrewEntries();
          const allNms = allInfo.map(x => x.name);

          const fullCrew = allNms.map(nm => {return {name:nm}}).map(char => chars.fullyEquip(char, _.find(allInfo, info => info.name === char.name) ));
          doc = {crew: fullCrew};
        }
        // Create a default doc if user is new
        if (doc === null || !doc.crew || doc.crew.length<13) {
          fulfill(`Sorry ${author}, you do not have enough crew for the voyage`);
          return;
        }
        const availCrew = doc.crew.filter(x => !x.vaulted===true).map(_.clone);

        availCrew.forEach(ch => {
          let score = 0;
          chars.skills.forEach(sk => {
            if (ch[sk]) {
              const rl = ch[sk];
              let avg = rl.base + rl.minroll + (rl.maxroll - rl.minroll)/2;
              let mult = 1;
              if (sk === argv.args.primary) {mult=3}
              if (sk === argv.args.secondary) {mult=2}
              score += avg*mult;
            }
          });
          ch.score = score;
        });

        let bestCrew = availCrew.sort( (a,b)=>(b.score - a.score));
        let skillsOf = (ch) => chars.skills.filter(sk => ch[sk]).map(emojify).join('');
        let names = _.first(bestCrew, 15).map(x =>
          `${x.name} ${skillsOf(x)} ${x.score}`
        );

        let res;
        let msg;
        if (names) {
          msg = `Your best ${bestCrew.length} crew for ${emojify(argv.args.primary)}/${emojify(argv.args.secondary)} \n   `
            + names.join('\n    ') + "\n"
            + 'excluding starbase bonus and whether it fits skill slots';
        }
        else {
          msg = 'Unable to provide an answer';
        }

        fulfill(msg);

      });
    }
    catch (e) {
      fulfill(e);
    }
  }),
  args: [
    {
      name: 'primary',
      desc: 'primary voyage skill: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: true,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec",
          validate: value => {
            return !!value.match(/^cmd|dip|sci|eng|med|sec|$/);
          }
        }
      ]
    }
    ,
    {
      name: 'secondary',
      desc: 'secondary voyage skill: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: true,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec",
          validate: value => {
            return !!value.match(/^cmd|dip|sci|eng|med|sec|$/);
          }
        }
      ]
    }
  ],
  flags: [
    {
      name: 'best',
      desc: 'Use all characters to compute best gauntlet lineup',
      alias: 'b',
      type: 'boolean',
      default: false
    }
  ]
});
