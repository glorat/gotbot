const Clapp = require('../modules/clapp-discord');
const _ = require('underscore');
const chars = require("../chars");
const matcher = require("../matcher");


module.exports = new Clapp.Command({
  name: "search",
  desc: "search for crew",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const args = argv.args;
    const emojify = context.emojify;

    try {
      let res = chars.searchCrewByCharTrait([args.name1, args.name2, args.name3], chars.allCrewEntries());
      let entries = res.entries;
      let searchParams = res.searchParams;
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
