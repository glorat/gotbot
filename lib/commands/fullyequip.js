var Clapp = require('../modules/clapp-discord');
var jsonfile = require('nedb');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require('../chars.js');
const request = require('request-json');
var client = request.createClient('http://ssr.izausomecreations.com/');

module.exports = new Clapp.Command({
  name: "fullyequip",
  desc: "sets your crew member to its fullu equipped level 100 stats",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const channel = msg.channel.name;
    const author = msg.author.username;
    const userid = msg.author.id;
    const args = argv.args;

    function emojify(sym) {
      const estat = msg.client.emojis.find(x=> x.name === sym.toLowerCase());
      return estat ? estat : sym;
    }

    var Datastore = require('nedb');
    var db = {};
    db.users = new Datastore({ filename: cfg.nedbpath, autoload: true });

    const qry = { _id: userid };

    db.users.findOne(qry, function (err, doc) {
      // Create a default doc if user is new
      if (doc === null || !doc.crew) {
        fulfill(`Sorry ${author}, you do not have any crew to update`);
        return;
      }

      chars.matchOne(function(err, name) {
        if (err) {
          fulfill(err);
        }
        else {
          var char = _.find(doc.crew, x=>x.name === name);
          if (char) {

            client.get(`crew/${name}.json`, function (err, res, body) {
              if (err) {
                fulfill(`No stats available for ${name}`)
              }
              else {
                const info = body.info;
                const stars = info.stars;
                const skill = info.skill;
                const starSk = _.filter(skill, sk => sk.stars === stars);
                // const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
                var retmsg = '';
                starSk.forEach(sk => {
                  const s = sk.skill.toLowerCase();
                  char[s] = {};
                  char[s].base = sk.base;
                  char[s].minroll = sk.min;
                  char[s].maxroll = sk.max;
                  retmsg += `${emojify(s)} ${sk.base} (${sk.min}-${sk.max}) `
                });

                db.users.update(qry, doc, {upsert: true});
                const estat = msg.client.emojis.find(x=> x.name === args.stat);
                fulfill(`${author}, I have updated stats for ${char.name} ${retmsg}`)


              }

            })
          }
          else {
            fulfill(`Sorry ${author}, I cannot find ${char.name} in your crew`);
          }
        }
      }, args.name1, args.name2, args.name3);


    });
  }),
  args: [
    {
      name: 'name1',
      desc: 'search string for name',
      type: 'string',
      required: true
    },
    {
      name: 'name2',
      desc: 'search string for name',
      type: 'string',
      default: ''
    },
    {
      name: 'name3',
      desc: 'search string for name',
      type: 'string',
      default: ''
    }
  ]
});
