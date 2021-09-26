const Clapp = require('../modules/clapp-discord');
import * as _ from 'underscore';
import chars = require('../chars.js');
//import cfg from '../../config';
import * as API from '../Interfaces';

const wikiurl = 'sttwiki.org';

module.exports = new Clapp.Command({
  name: "estats",
  desc: "query extended stats for characters",

// Command function
  fn: (argv:any, context:API.Context) => new Promise((fulfill, reject) => {
    const args = argv.args;
    //Emojis are broken in android so we manually do it
    // const emojify = context.emojify;

/*
white medium star
    Unicode: U+2B50 U+FE0F, UTF-8: E2 AD 90 EF B8 8F
🌑
new moon
    Unicode: U+1F311, UTF-8: F0 9F 8C 91
*/

    const emojify : API.EmojiFn = function(x) {
      const custom : any = {'1star':'\u2B50', '1darkstar' :String.fromCodePoint(0x1F311)};
      if (custom[x]) {
        return custom[x];
      }
      else {
        return x.toUpperCase();
      }
    };

    function handleName(name:string, starsArg:number, level:number, ssr:any) {
      chars.wikiLookup(name, function(err:any,info:chars.CharInfo) {
        //chars.ssrLookup(name, function(err,info) {
        if (err) {
          fulfill(err);
        }
        else {

          const stars = info.stars;
          const skill = info.skill;
          const char = info.char;
          const wiki = info.wiki.replace('/wiki/','');

          let starStat = function(s:number) {
            const starStr = _.range(s).map(x => emojify('1star')).join('');
            const darkStr = _.range(stars - s).map(x => emojify('1darkstar')).join('');
            const starSk = _.filter(skill, sk => sk.stars === s && sk.level === level);
            const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');
            return `${starStr}${darkStr} - ${skStr}`;
          };

          //const levelStr = (level!==100) ? `Level ${level}: ` : '';
          //let header = `(${char}) - ${levelStr}${info.traits}`;

          // Char stats
          let msg = '';
          if (starsArg > 0 && starsArg < stars) {msg += starStat(starsArg) + '\n';}
          else if (stars === 5) { msg += starStat(1) + '\n';}
          msg += starStat(stars);

          // Char rankings
          // Override filter to do exact match
          let allChars = chars.allCrewEntries().filter(x=>x.stars === stars);
          let baseBest = chars.bestChars(allChars, info.stars,
            (starsArg > 0 && starsArg < stars) ? starsArg : info.stars, 'base', 100, '', '');
          let baseRank = _.findIndex(baseBest, x=>x.name === info.name) + 1;
          let gauntletBest = chars.bestChars(allChars, info.stars,
            (starsArg > 0 && starsArg < stars) ? starsArg : info.stars, 'gauntlet', 100, '', '');
          let gauntletRank = _.findIndex(gauntletBest, x=>x.name === info.name) + 1;
          let voyageBest = chars.bestChars(allChars, info.stars,
            (starsArg > 0 && starsArg < stars) ? starsArg : info.stars, 'avg', 100, '', '');
          let voyageRank = _.findIndex(voyageBest, x=>x.name === info.name) + 1;

          // Useful links
          let embed = {
            color: 3447003,
            /*author: {
              name: name,
              icon_url: 'https://${wikiurl}/w/images/thumb/a/ae/Captain_Kirk_Head.png/180px-Captain_Kirk_Head.png'
            },*/
            title: name,
            url: `https://${wikiurl}/wiki/${wiki}`,
            //description: 'Description.',
            fields: [
              {
                name: 'Traits',
                value: info.traits,
                inline:true
              },
              {
                name: 'More Traits',
                value: info.traits_hidden.join(', '),
                inline:true
              },
              {
                name: 'Stats',
                value: msg
              },
              {
                name: 'Base Rank',
                value: `${baseRank} of ${baseBest.length} (${stars} stars)`,
                inline: true
              },
              {
                name: 'Gauntlet Rank',
                value: `${gauntletRank} of ${gauntletBest.length} (${stars} stars)`,
                inline: true
              },
              {
                name: 'Voyage Rank',
                value: `${voyageRank} of ${voyageBest.length} (${stars} stars)`,
                inline: true
              },
              {
                name: 'Character',
                value: char,
                inline:true
              },
              {
                name: 'Avg Chrons',
                value: ssr.avgChrons + '',
                inline:true
              },
              {
                name: 'Difficulty',
                value: chars.generateDifficulty(ssr),
                inline:true
              }
            ],
            thumbnail:{
              url:`https://${wikiurl}` + info.headImage
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
        let nm = <string>name;
        chars.ssrLookup(nm, (ssr:any) => {
          handleName(nm, argv.flags.stars, argv.flags.level, ssr);
        });

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


