const Clapp = require('../modules/clapp-discord');
import * as _ from 'underscore';
import cfg from '../../config';
import * as chars from '../chars';
import * as matcher from '../matcher';
const Gauntlet = require('../../client/gauntlet');
const db = require('../crewdb');
import * as API from '../Interfaces';

module.exports = new Clapp.Command({
  name: "gcalc",
  desc: "gauntlet crew calculator",

// Command function
  fn: (argv:any, context:API.Context) => new Promise((fulfill) => {
    try {

      const args = argv.args;
      let featuredSkill = args.skill;
      let traits:string[] = _.chain([args.trait1, args.trait2, args.trait3])
        .filter(x => x != undefined && x != '')
        .value();

      if (!featuredSkill) {
        const fs = require('fs');
        let rawdata = fs.readFileSync(cfg.dataPath +'gauntlet.json');
        let gauntlet_data = JSON.parse(rawdata);
        featuredSkill = gauntlet_data.featured_skill.substring(0,3);
        featuredSkill = (featuredSkill === 'com' ? 'cmd' : featuredSkill);
        traits = gauntlet_data.traits;
        traits = traits.map(x => {return x.replace(/_/g, ' ')});
      }

      const author = context.author.username;
      const userid = context.author.id;
      const emojify = context.emojify;

      if (!context.isEntitled(userid) && !argv.flags.best) {
        fulfill(`Sorry, this function is in restricted beta`);
        return;
      }

      let featuredTraits:Array<string> = [];
      _.forEach(traits, (name:string) => {
        matcher.matchOne(function (err, val) {
          if (err) throw err;
          featuredTraits.push(<string>val);
        }, chars.allTraits(), 'trait', name);
      });

      db.get(userid).then(function(doc:any) {
        if (argv.flags.best) {
          const allInfo = chars.allCrewEntries();
          const allNms = allInfo.map(x => x.name);

          const fullCrew = allNms.map(nm => {return {name:nm};}).map(char => chars.fullyEquip(<chars.Char>char, _.find(allInfo, info => info.name === char.name) ));
          doc = {crew: fullCrew};
        }
        // Create a default doc if user is new
        if (doc === null || !doc.crew) {
          throw(`Sorry ${author}, you do not have any crew for the gauntlet`);
        }

        const featuredSkillWeight = Gauntlet.featuredSkillWeight;
        let charTraits:any = {};
        chars.allCrewEntries().forEach(x=> {
          charTraits[x.name] = x.traits.split(',').map(x=>x.trim());
        });
        const availCrew = doc.crew.filter((x:any) => !x.vaulted===true);

        const gchars = _.map(availCrew, Gauntlet.dbCharToChar).map((c:any) => {
          c.crit = 5 + _.filter(featuredTraits, t => _.contains(charTraits[c.name], t)).length * 20;
          return c;
        });

        const bestNames = Gauntlet.topChars(gchars, featuredSkill, featuredSkillWeight);

        const best = _.filter(gchars,
          char => _.contains(bestNames, char.name)
        );

        let res = Gauntlet.analyseCharCombos(best, featuredSkill, featuredSkillWeight);

        let msg;
        if (res[0]) {
          msg = `Your best 5 crew for ${featuredSkill ? emojify(featuredSkill) : 'general'} and traits ${featuredTraits.join(', ')}\n   `
            + res[0].namesMore.join('\n   ') + "\n";
          msg += "Gauntlet strength " + Math.round(res[0].total) + "\n";
          // msg += cfg.baseUrl + '#/gauntlet';
        }
        else {
          msg = 'Unable to provide an answer';
        }

        fulfill(msg);

      });
    }
    catch (e:any) {
      fulfill(e.message);
    }
  }),
  args: [
    {
      name: 'skill',
      desc: 'featured skill: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: false,
      validations: [
        {
          errorMessage: "Must be cmd|dip|sci|eng|med|sec or empty",
          validate: (value:string) => {
            return !!value.match(/^cmd|dip|sci|eng|med|sec|$/);
          }
        }
      ]
    },
    {
      name:'trait1',
      desc:'bonus gauntlet trait',
      type: 'string',
      default: '',
      required: false
    },
    {
      name:'trait2',
      desc:'bonus gauntlet trait',
      type: 'string',
      default: '',
      required: false
    },
    {
      name:'trait3',
      desc:'bonus gauntlet trait',
      type: 'string',
      default: '',
      required: false
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
