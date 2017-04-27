var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");


module.exports = new Clapp.Command({
  name: "search",
  desc: "search for crew",

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

    var entries = chars.allCrewEntries();
    var searchParams = [];

    try {
      const charsAndTraits = chars.allChars().concat(chars.allTraits());
      [args.name1, args.name2, args.name3].filter(x=>x!=='').forEach(name => {
        chars.genMatchOne(function(err,res){
          if (err) throw err;
          searchParams.push(res);
          const re = `\\b${res}\\b`;
          console.log(re);
          entries = entries.filter(entry => entry.traits.match(new RegExp(re)) || (entry.char === res) );

        }, charsAndTraits, 'char or trait', name);
      });

      const ret = `Results for ${searchParams.join(', ')}\n` + entries.map(x=>x.name).join('\n');
      fulfill(ret);
    }
    catch (e) {
      console.log(e);
      fulfill(e);
    }


  }),
  args: [
    {
      name: 'name1',
      desc: 'Search param (char or trait)',
      type: 'string',
      required: true
    },
    {
      name: 'name2',
      desc: 'Search param',
      type: 'string',
      default: '',
      required: false
    },
    {
      name: 'name3',
      desc: 'Search param',
      type: 'string',
      default: '',
      required: false
    }

  ]
});
