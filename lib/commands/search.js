var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");
const matcher = require("../matcher.js")


module.exports = new Clapp.Command({
  name: "search",
  desc: "search for crew",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const args = argv.args;
    const emojify = context.emojify;
    var fs = require('fs');

    var entries = chars.allCrewEntries();
    var searchParams = [];

    try {
      const charsAndTraits = chars.allChars().concat(chars.allTraits());
      [args.name1, args.name2, args.name3].filter(x=>x!=='').forEach(name => {
        matcher.matchOne(function(err,res){
          if (err) throw err;
          searchParams.push(res);
          const re = `\\b${res}\\b`;
          entries = entries.filter(entry => entry.traits.match(new RegExp(re)) || (entry.char === res) || _.contains(entry.moreChar,res) );

        }, charsAndTraits, 'char or trait', name);
      });
      const num = entries.length;
      if (entries.length > 50) {
        entries = _.first(entries,50).concat([{name:'...and more...'}]);
      }

      const ret = `${num} results for ${searchParams.join(', ')}\n` + entries.map(x=>x.name).join('\n');
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
