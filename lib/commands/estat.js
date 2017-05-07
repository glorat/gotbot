var Clapp = require('../modules/clapp-discord');
var _ = require('underscore');
const cfg = require('../../config.js');
const chars = require("../chars.js");



module.exports = new Clapp.Command({
  name: "estats",
  desc: "query extended stats for characters",

// Command function
  fn: (argv, context) => new Promise((fulfill, reject) => {
    const msg = context.msg;
    const args = argv.args;
    const emojify = context.emojify;
    const boldify = context.boldify;
    const channel = context.channel;

    function handleName(name, starsArg, level) {
      chars.wikiLookup(name, function(err,info) {
        //chars.ssrLookup(name, function(err,info) {
        if (err) {
          fulfill(err);
        }
        else {

          const stars = info.stars;
          const skill = info.skill;
          const char = info.char;
          const wiki = info.wiki.replace('/wiki/','');

          function starStat(s) {
            const starStr = _.range(s).map(x => emojify('1star')).join('');
            const darkStr = _.range(stars - s).map(x => emojify('1darkstar')).join('');
            const starSk = _.filter(skill, sk => sk.stars === s && sk.level === level);
            const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
            return `${starStr}${darkStr} - ${skStr}`
          }
          const levelStr = (level!==100) ? `Level ${level}: ` : '';
          let header = `(${char}) - ${levelStr}${info.traits}`;

          // Char stats
          let msg = '';
          if (starsArg > 0 && starsArg < stars) {msg += starStat(starsArg) + '\n'}
          else if (stars === 5) { msg += starStat(1) + '\n';}
          msg += starStat(stars);

          // Char rankings
          // Override filter to do exact match
          let allChars = chars.allCrewEntries().filter(x=>x.stars === stars);;
          let baseBest = chars.bestChars(allChars, info.stars,
            (starsArg > 0 && starsArg < stars) ? starsArg : info.stars, 'base', 100, '', '');
          let baseRank = _.findIndex(baseBest, x=>x.name === info.name) + 1;
          let gauntletBest = chars.bestChars(allChars, info.stars,
            (starsArg > 0 && starsArg < stars) ? starsArg : info.stars, 'gauntlet', 100, '', '');
          let gauntletRank = _.findIndex(gauntletBest, x=>x.name === info.name) + 1;

          // Useful links
          let ssrChar = name.replace(/"/gi,"!Q!").replace(/,/gi,"!C!");
          let ssrLink = 'http://ssr.izausomecreations.com/DO_NOT_SHARE.html?crew=' + encodeURI(ssrChar);

          let embed = {
            color: 3447003,
            /*author: {
              name: name,
              icon_url: 'https://stt.wiki/w/images/thumb/a/ae/Captain_Kirk_Head.png/180px-Captain_Kirk_Head.png'
            },*/
            title: name,
            url: `https://stt.wiki/wiki/${wiki}`,
            //description: 'Description.',
            fields: [
              {
                name: 'Traits',
                value: info.traits,
                inline:true
              },
              {
                name: 'Stats',
                value: msg
              },
              {
                name: 'Base Rank',
                value: `${baseRank} of ${baseBest.length}`,
                inline: true
              },
              {
                name: 'Gauntlet Rank',
                value: `${gauntletRank} of ${gauntletBest.length}`,
                inline: true
              },
              {
                name: 'Character',
                value: char,
                inline:true
              },
              {
                name: 'Useful links',
                value: `[stt.wiki](https://stt.wiki/wiki/${wiki}) - [SSR](${ssrLink})`,
                inline: true
                //value: 'You can put [masked links](http://google.com) and *usual* **__Markdown__**.'+ emojify('cmd')
              }
            ],
            thumbnail:{
              url:'https://stt.wiki/' + info.headImage
            }
            //timestamp: new Date(),
          };

          context.embed = embed;
          fulfill('EMBED');
        }
      });

    }

    chars.matchOne(function(err,name) {
      if (err) {
        fulfill(err);
      }
      else {
        handleName(name, argv.flags.stars, argv.flags.level)
      }
    },args.name1, args.name2, args.name3);
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

  ],
  flags: [
    {
      name: 'stars',
      desc: 'Number of fused stars to query at',
      alias: 's',
      type: 'number',
      default: 0
    },
    {
      name: 'level',
      desc: 'Skill level to query at. Should be 1,10,20,30,40,50,60,70,80,90,100',
      alias: 'l',
      type: 'number',
      default: 100
    }
  ]
});


