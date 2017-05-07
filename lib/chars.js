var fs = require('fs');
const _ = require('underscore');
const request = require('request');
const jsonreq = require('request-json');
const Promise = require("bluebird");
Promise.promisifyAll(fs);

const skills = ['cmd','dip','eng','sec','med','sci'];

module.exports = {
  skills:skills,
  allCrewEntries: allCrewEntries,
  allTraits: allTraits,
  allChars: allChars,
  bestChars, bestChars,
  charStars: charStars,
  genMatchOne: genMatchOne,
  matchOne: matchOne,
  matchNames: matchNames,
  ssrLookup:ssrLookup,
  statsFor:statsFor,
  fullyEquip:fullyEquip,
  wikiLookup:wikiLookup
};

var wikidb;
fs.readFileAsync('./wikidb.json', 'utf8')
  .then(JSON.parse)
  .then(function(obj) {
    wikidb = obj;
    wikidb.charstars = _.object(wikidb.crewentries.map(x=>x.name), wikidb.crewentries.map(x=>x.stars));
    wikidb.charToCrew = _.groupBy(wikidb.crewentries, x=>x.char);

    var traitsSet = new Set();
    wikidb.crewentries.forEach(x=>x.traits.split(',').map(x=>x.trim()).forEach(x=>traitsSet.add(x)));
    wikidb.traits = Array.from(traitsSet);

  })
  .catch(e => {throw(e)});

function allCrewEntries() {
  return _.clone(wikidb.crewentries);
}

function allChars() {
  return _.keys(wikidb.charToCrew);
}
function allTraits() {
  return Array.from(wikidb.traits);
}

function charStars() {
  return wikidb.charstars;
}

function genMatchOne(cb, allNames, desc, one, two, three) {
  var names = matchNames(allNames, one, two, three);

  if (names.length === 0) {
    cb(`Sorry don't know any matching ${desc} from ${[one,two,three].join()}`);
  }
  else if (names.length ===1 ) {
    const name = names[0];
    cb (null, name);
  }
  else {
    const n = names.length;
    if (n > 5) {
      names = _.sample(names, 5)
    }
    const nameStr = names.join(', ');
    cb(`${n} ${desc} matches. Did you mean ${nameStr}?`);
  }
}

function matchOne(cb, one, two, three) {
  return genMatchOne(cb, _.keys(wikidb.charstars), 'character', one, two, three);
}

function reSafe(str) {
  return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
};

function matchNames(origNames, one, two, three) {
  var names = _.clone(origNames);

  var perfect = [one,two,three].join(' ').trim().toLowerCase();
  var perfectMatch = names.filter(nm => nm.toLowerCase() === perfect);
  if (perfectMatch.length === 1) {return perfectMatch}

  var exactNames = names;

  [one,two,three].forEach(x => {
    if (x) {
      const re = '\\b' + reSafe(x.toLowerCase()) + '\\b';
      exactNames = _.filter(exactNames, nm => nm.search(new RegExp(re, 'i'))>=0);
    }
  });
  if (exactNames.length >0) {return exactNames;}

  [one,two,three].forEach(x => {
    if (x) {
      names = _.filter(names, nm => nm.toLowerCase().includes(x.toLowerCase()));
    }
  });
  return names;
}

function wikiLookup(name, cb) {
  const entry = _.find(wikidb.crewentries, x=>x.name === name);

  if (!entry) {return cb(`Unknown crew member ${name}`)}

  cb(null, entry);
}

function ssrLookup(name, cb) {
  const client = jsonreq.createClient('http://ssr.izausomecreations.com/');
  var wname=name.replace(/"/gi,"!Q!");
  wname=wname.replace(/,/gi,"!C!");

  client.get(`crew/${wname}.json`, function(err, res, body) {
    if (err) {
      cb(`No stats available for ${name}`);
    }
    else {
      cb(null, body.info);
    }
  });

}

function statsFor(char, emojify, boldify) {
  var mystats = [];
  // Get skills into an array
  skills.forEach(sk => {
    if (char[sk]) {
      mystats.push({skill:sk, base:char[sk].base, minroll: char[sk].minroll, maxroll:char[sk].maxroll});
    }
  });
  // Sort by base
  mystats = _.sortBy(mystats, x=>-x.base);
  const skStr = _.map(mystats, sk => `${emojify(sk.skill)} ${sk.base} (${sk.minroll}-${sk.maxroll})`).join(' ')

  const starStr = _.range(char.stars).map(x => emojify('1star')).join('');
  const darkStr = _.range(char.maxstars - char.stars).map(x => emojify('1darkstar')).join('');
  const levelStr = (char.level !== 100) ? `(Level ${char.level})` : '';
  return `${boldify(char.name)} ${levelStr}\n   ${starStr}${darkStr} - ${skStr}`;

}


/** Mutate char to be fully equipped given info and stars
 * */
function fullyEquip(char, info, stars, level) {
  const skill = info.skill;
  level = level ? level : 100;
  const starSk = _.filter(skill, sk => sk.stars === stars && sk.level === level);
  // const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');

  starSk.forEach(sk => {
    const s = sk.skill.toLowerCase();
    char[s] = {};
    char[s].base = sk.base;
    char[s].minroll = sk.min;
    char[s].maxroll = sk.max;
  });
  char.level = level;
  char.stars = stars;
  char.maxstars = info.stars;
  return char;
}



function bestChars(entrys, stars, fuse, category, level, skill1, skill2){
  if (stars) {
    entrys = entrys.filter(x=>x.stars <= stars);
  }
  entrys = entrys.map(_.clone); // Shallow clone as we will add a result


  const starMatch = function (x) {
    return s => fuse ? fuse : x.stars
  };

  const entryFn = {
    base: {
      map: sk => sk ? sk.base : 0,
      reduce: function (memo, num) {
        return num > memo ? num : memo;
      },
      memo: 0
    },
    gauntlet: {
      map: sk => sk ? (sk.min + sk.max) / 2 : 0,
      reduce: function (memo, num) {
        return memo + num;
      },
      memo: 0
    },
    minroll: {
      map: sk => sk ? (sk.min) : 0,
      reduce: function (memo, num) {
        return memo + num;
      },
      memo: 0
    },
    avg: {
      map: sk => sk ? (sk.base + (sk.min + sk.max) / 2) : 0,
      reduce: function (memo, num) {
        return memo + num;
      },
      memo: 0
    }
  };

  const catFn = entryFn[category];
  entrys.forEach(e => {
    e.result = 0;
    const skillMatch = (skill1 === '' && skill2 === '') ? skills : [skill1, skill2];

    const fnVals = skillMatch.map(skill => {
      if (skill) {
        const sk = e.skill.find(s => s.level===level && (fuse ? fuse : e.stars) === s.stars && s.skill === skill);
        return catFn.map(sk);
      }
      else {
        return catFn.memo;
      }
    });

    e.result = _.reduce(fnVals, catFn.reduce, catFn.memo);
  });
  entrys = _.sortBy(entrys, x=>-x.result);
  return entrys;
};
