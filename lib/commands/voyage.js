var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const chars = require('../chars.js');
const db = require('../crewdb.js');
const fleets = require('../fleetdb.js');
const voyage = require('../voyage.js');

const voyageSkills = ['cmd','dip','sec','eng','sci','med'];

let calcTotalSkills = function (crewList, skillList) {
  let totalSkills = [0, 0, 0, 0, 0, 0];
  crewList.forEach(ch => {
    for (let i = 0; i < skillList.length; i++) {
      let sk = skillList[i];
      if (ch[sk]) {
        const rl = ch[sk];
        let avg = rl.base + rl.minroll + ((rl.maxroll - rl.minroll) / 2);
        totalSkills[i] += avg;
      }
    }
  });
  return totalSkills;
};

function formatHrs(t) {
  const hrs = Math.floor(t);
  const mins = Math.floor((t - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

module.exports = new Clapp.Command({
  name: 'voyage',
  desc: 'voyage crew calculator',

// Command function
  fn: (argv, context) => new Promise((fulfill) => {
    try {
      const author = context.author.username;
      const userid = context.author.id;
      const fleetId = context.fleetId;
      const args = argv.args;
      const emojify = context.emojify;

      if (!context.isEntitled(userid)) {
        fulfill(`Sorry, this function is in restricted beta`);
        return;
      }

      const qry = {_id: userid};

      // Reorder skills liset to primary/secondary/others
      const skillList = _.union([args.primary], [args.secondary], _.without(chars.skills, args.primary, args.secondary));


      const handleUserDoc = function(doc) {
        if (argv.flags.best) {
          const allInfo = chars.allCrewEntries();
          const allNms = allInfo.map(x => x.name);

          const fullCrew = allNms.map(nm => {
            return {name: nm};
          }).map(char => chars.fullyEquip(char, _.find(allInfo, info => info.name === char.name)));
          doc = {crew: fullCrew};
        }
        // Create a default doc if user is new
        if (doc === null || !doc.crew || doc.crew.length < 13) {
          fulfill(`Sorry ${author}, you do not have enough crew for the voyage`);
          return;
        }
        const crew = doc.crew.filter(x => !x.vaulted === true).map(_.clone);

        // TODO: check fleetId from crew doc
        fleets.get(fleetId).then(fleet => {
          crew.forEach(c => {
            chars.skills.forEach(sk => {
              if (c[sk]) {
                c[sk].base *= 1+(fleet.starbase[sk]*0.01);
              }
            });
          });

          handleAdjustedCrew(crew, fleet.starbase);
        });
      };

      const handleAdjustedCrew = function(crew, starbase) {


        var sortedByVoyage = function (availCrew) {
          availCrew.forEach(ch => {
            let score = 0;
            chars.skills.forEach(sk => {
              if (ch[sk]) {
                const rl = ch[sk];
                let avg = rl.base + rl.minroll + ((rl.maxroll - rl.minroll) / 2);
                let mult = 1;
                if (sk === argv.args.primary) {
                  mult = 3;
                }
                if (sk === argv.args.secondary) {
                  mult = 2;
                }
                score += avg * mult;
              }
            });
            ch.score = score;
          });

          return availCrew.sort((a, b) => (b.score - a.score));
        };

        let recurseFit = function (crew, avail) {
          // Base cases - none to fit or out of crew
          if (avail.crew.length >= 12) {
            return avail;
          }
          if (crew.length === 0) {
            return avail;
          }
          // Recursive case  - try to place head
          const head = crew[0];
          let best = avail;
          chars.skills.forEach(sk => {
            if (head[sk] && avail[sk].length < 2 && head.score > 0) {
              const newAvail = _.clone(avail); // copy on write
              newAvail.score += head.score;
              newAvail[sk] = _.clone(newAvail[sk]);
              newAvail[sk].push(head);
              newAvail.crew = _.clone(newAvail.crew);
              newAvail.crew.push(head);
              let ret = recurseFit(_.rest(crew), newAvail);
              if (ret.score > best.score) {
                best = ret; // Found improvement
              }
            }
          });
          // Recursive case 2 - we didn't place this char
          if (best.score === avail.score) {
            return recurseFit(_.rest(crew), avail);
          }
          else {
            return best;
          }
        };

        let fitCrewToSlots = function (crew) {
          const avail = {dip: [], cmd: [], sec: [], eng: [], sci: [], med: [], score: 0, crew: []};
          const best = recurseFit(crew, avail);
          return best;
        };

        let bestCrew = sortedByVoyage(crew);
        let constrainedCrew = fitCrewToSlots(bestCrew);

        function replaceConstrainedCrew(obj, before, after) {
          // copy on write
          let ret = _.clone(obj);

          // Replace the main crew area
          ret.crew = ret.crew.map(function (item) {
            return item === before ? after : item;
          });
          // Replace the skills
          chars.skills.forEach(sk => {
            ret[sk] = ret[sk].map(function (item) {
              return item === before ? after : item;
            });
          });
          return ret;
        }

        let crewList = constrainedCrew.crew;
        let totalSkills = calcTotalSkills(crewList, skillList);
        const startAm = args.start * (args.refill+1);
        const hours = voyage.solveTime(totalSkills, startAm);

        // Next step, try swapping in and out to improve things
        let improving = true;
        let bestHours = hours;
        let iters = 0;
        let replaces = 0;
        while (improving) {
          improving = false;
          iters++;
          console.log(`Iteration ${iters} of swapping`);
          bestCrew.forEach(after => {
            if (!_.contains(constrainedCrew.crew, after)) {
              let bestReplace = null;
              let bestReplaceHours = bestHours;
              // Let's try to swap in somewhere
              skillList.forEach(sk => {
                if (after[sk]) { // Matching skill to attempt into
                  constrainedCrew[sk].forEach(before => {
                    let maybe = replaceConstrainedCrew(constrainedCrew, before, after);
                    let maybeSkills = calcTotalSkills(maybe.crew, skillList);
                    const maybeHours = voyage.solveTime(maybeSkills, startAm);
                    if (maybeHours > bestReplaceHours) {
                      bestReplace = before;
                      bestReplaceHours = maybeHours;
                    }
                  });
                }
              });
              // After trying every slot, how did we do?
              if (bestReplaceHours > bestHours) {
                console.log(`Swap ${bestReplace.name} with ${after.name} from ${bestHours} to ${bestReplaceHours}`);
                constrainedCrew = replaceConstrainedCrew(constrainedCrew, bestReplace, after);
                bestHours = bestReplaceHours;
                improving = true;
                replaces++;
              }
            }
          });
        }

        // Recompute skills one more time
        totalSkills = calcTotalSkills(constrainedCrew.crew, skillList);

        const estlen = formatHrs(bestHours);

        let hrsMsg = '';
        for (let refill=0; refill<=args.refill+1; refill++) {
          let targetHours = voyage.solveTime(totalSkills, args.start * (refill+1));
          hrsMsg += `${refill} refills: ${formatHrs(targetHours)}\n`;
        }

        let names = [];
        voyageSkills.forEach(sk => {
          constrainedCrew[sk].forEach(x => {
            names.push(`${emojify(sk)} ${x.name} (${x.score})`);
          });
        });

        let msg;
        if (names) {
          let bonuses = chars.skills.map(sk => `${emojify(sk)}+${starbase[sk]}%`).join('  ');

          msg = `Your best crew for ${emojify(argv.args.primary)}/${emojify(argv.args.secondary)}
${names.join('\n    ')}
with starbase bonus of ${bonuses}
with a ${args.start} ship and ${args.refill} refills
(after ${iters} rounds and ${replaces} swaps to improve from ${formatHrs(hours)})
skills of ${totalSkills.map(Math.floor).join(' ')}
${hrsMsg}
`;
        }
        else {
          msg = 'Unable to provide an answer';
        }

        fulfill(msg);
      };

      db.users.findOneAsync(qry).then(handleUserDoc);
    }
    catch (e) {
      fulfill('Failed: ' + e.message);
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
          errorMessage: 'Must be cmd|dip|sci|eng|med|sec',
          validate: value => {
            return Boolean(value.match(/^cmd|dip|sci|eng|med|sec|$/));
          }
        }
      ]
    },
    {
      name: 'secondary',
      desc: 'secondary voyage skill: cmd|dip|sci|eng|med|sec',
      type: 'string',
      default: '',
      required: true,
      validations: [
        {
          errorMessage: 'Must be cmd|dip|sci|eng|med|sec',
          validate: value => {
            return Boolean(value.match(/^cmd|dip|sci|eng|med|sec|$/));
          }
        }
      ]
    },
    {
      name: 'start',
      desc: 'initial antimatter level',
      type: 'number',
      default: 2500,
      required: false
    },
    {
      name: 'refill',
      desc: 'number of refills you plan to purchase',
      type: 'number',
      default: 0,
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
