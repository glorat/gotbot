var fs = require('fs');
const _ = require('underscore');
const request = require('request');
const jsonreq = require('request-json');
const Promise = require("bluebird");
const wikiparse = require('./wikiparse.js');
Promise.promisifyAll(fs);

const skills = ['cmd','dip','eng','sec','med','sci'];

module.exports = {
  allCrewEntries: allCrewEntries,
  allTraits: allTraits,
  allChars: allChars,
  charStars: charStars,
  charTraits: charTraits,
  genMatchOne: genMatchOne,
  matchOne: matchOne,
  matchNames: matchNames,
  reloadStatic:wikiparse.reloadStatic,
  ssrLookup:ssrLookup,
  statsFor:statsFor,
  fullyEquip:fullyEquip,
  wikiLookup:wikiLookup
};

function allCrewEntries() {
  return _.clone(wikiparse.wikidb.crewentries);
}

function allChars() {
  return _.keys(wikiparse.wikidb.charToCrew);
}
function allTraits() {
  return Array.from(wikiparse.wikidb.traits);
}

function charStars() {
  return wikiparse.wikidb.charstars;
}

function charTraits() {
  return wikiparse.wikidb.chartraits;
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
  return genMatchOne(cb, _.keys(charstars), 'character', one, two, three);
}

function matchNames(origNames, one, two, three) {
  var names = _.clone(origNames);

  var perfect = `${one} ${two} ${three}`.trim().toLowerCase();
  var perfectMatch = names.filter(nm => nm.toLowerCase() === perfect);
  if (perfectMatch.length === 1) {return perfectMatch}

  var exactNames = names;

  [one,two,three].forEach(x => {
    if (x) {
      const re = '\\b' + x.toLowerCase() + '\\b';
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
  const entry = _.find(crewsummary, x=>x.name === name);
  if (!entry) {return cb(`Unknown crew member ${name}`)}

  const file =`client/stt.wiki/${decodeURI(entry.wiki)}`;

    fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      cb(`No stats available for ${name} from ${file}`);
    }
    else {
      const dom = cheerio.load(data);

      cb(null, parseCharPage(dom, entry.stars));
    }
  });
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

function statsFor(char, emojify) {
  var mystats = [];
  // Get skills into an array
  skills.forEach(sk => {
    if (char[sk]) {
      mystats.push({skill:sk, base:char[sk].base, minroll: char[sk].minroll, maxroll:char[sk].maxroll});
    }
  });
  // Sort by base
  mystats = _.sortBy(mystats, x=>-x.base);
  // Output as stats
  return _.map(mystats, sk => `${emojify(sk.skill)} ${sk.base} (${sk.minroll}-${sk.maxroll})`).join(' ');
}


/** Mutate char to be fully equipped given info and stars
 * */
function fullyEquip(char, info, stars) {
  const skill = info.skill;
  const starSk = _.filter(skill, sk => sk.stars === stars);
  // const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');

  starSk.forEach(sk => {
    const s = sk.skill.toLowerCase();
    char[s] = {};
    char[s].base = sk.base;
    char[s].minroll = sk.min;
    char[s].maxroll = sk.max;
  });
  return char;
}


// Get it on startup
wikiparse.reloadStatic();
