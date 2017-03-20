var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const request = require('request-json');
var client = request.createClient('http://ssr.izausomecreations.com/');




module.exports = new Clapp.Command({
  name: "stats",
  desc: "query stats for characters",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    const userid = msg.author.id;
    const args = argv.args;
    var fs = require('fs');

    function emojify(sym) {
      const estat = msg.client.emojis.find(x=> x.name === sym.toLowerCase());
      return estat ? estat : sym;
    }

    fs.readFile('lib/crew.json', 'utf8', function (err, data) {
      if (err) throw err; // we'll not consider error handling for now
      var crewstars = JSON.parse(data);
      var names = _.keys(crewstars);
      if (args.name1) {
        names = _.filter(names, nm => nm.toLowerCase().includes(args.name1.toLowerCase()));
      }
      if (args.name2) {
        names = _.filter(names, nm => nm.toLowerCase().includes(args.name2.toLowerCase()));
      }
      if (names.length === 0) {
        fulfill(`Sorry don't know any matching characters`);
      }
      else if (names.length ===1 ) {
        const name = names[0];


        client.get(`crew/${name}.json`, function(err, res, body) {
          if (err) {
            fulfill(`No stats available for ${name}`)
          }
          else {
            const info = body.info;
            const stars = info.stars;
            const skill = info.skill;

            function starStat(s) {
              const starStr = _.range(s).map(x => emojify('1star')).join('');
              const darkStr = _.range(stars - s).map(x => emojify('1darkstar')).join('');
              const starSk = _.filter(skill, sk => sk.stars === s);
              const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
              return `${starStr}${darkStr} - ${skStr}`
            }

            var msg = `**${name}**: ${info.traits}\n`;
            if (stars === 5) { msg += starStat(1) + '\n';}
            msg += starStat(stars);
            fulfill(msg);
          }
        });

      }
      else {
        const n = names.length;
        if (n > 5) {
          names = _.sample(names, 5)
        }
        const nameStr = names.join(', ');
        fulfill(`${n} matches. Did you mean ${nameStr}?`);
      }
    });
  }),
  args: [
    {
      name: 'name1',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false
    },
    {
      name: 'name2',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false
    },
    {
      name: 'name3',
      desc: 'Name of character',
      type: 'string',
      default: '',
      required: false
    }

  ]
});
