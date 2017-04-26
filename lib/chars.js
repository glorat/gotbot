var fs = require('fs');
const _ = require('underscore');
const request = require('request');
const jsonreq = require('request-json');
const cheerio = require('cheerio');
const Promise = require("bluebird");
Promise.promisifyAll(fs);

var crewsummary = [];
var crewentries = [];
var charstars;
var chartraits = {};
var traits;
var charToCrew;

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
  reloadStatic:reloadStatic,
  ssrLookup:ssrLookup,
  statsFor:statsFor,
  fullyEquip:fullyEquip,
  wikiLookup:wikiLookup
};

function allCrewEntries() {
  return _.clone(crewentries);
}

function allChars() {
  return _.keys(charToCrew);
}
function allTraits() {
  return traits.map(x => x.name);
}

function charStars() {
  return charstars;
}

function charTraits() {
  return chartraits;
}

/** Almighty hack to prevent V8 from holding onto the mega string when parsing */
function copyString(original_string) {
  return (' ' + original_string).slice(1);
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

function reloadStatic() {
  const subcats = ['Common','Uncommon','Rare','Super_Rare','Legendary'];
  const crewLoadPromises = subcats.map(cat => {
    const stars = subcats.indexOf(cat)+1;
    const file = `client/stt.wiki/wiki/Category:${cat}`;
    return fs.readFileAsync(file, 'utf8')
      .then(cheerio.load)
      .then(function($) {
        const crewlinks = $('.mw-category-generated a');
        crewlinks.each(function(i,elem) {
          const a = $(this);
          crewsummary.push({name:copyString(a.text()), wiki: copyString(a.attr('href')), stars:stars});
        })})
      .catch(function(e){throw e;});
  });

  Promise.all(crewLoadPromises).then(function() {
    charstars = _.object(crewsummary.map(x=>x.name), crewsummary.map(x=>x.stars));
    console.log("All crew summary were loaded");
  }).then(function() {
    const all = crewsummary.map(entry => {
      const file =`client/stt.wiki/${decodeURI(entry.wiki)}`;

      return fs.readFileAsync(file, 'utf8')
        .then(cheerio.load)
        .then(function(dom) {
          return parseCharPage(dom, entry.stars, entry.name)
        })
        .then(cacheCharInfo)
        .catch(function(e) {
          throw e;
        });
    });
    return Promise.all(all);
  }).then(function() {
    console.log('All crew pages parsed');
    charToCrew = _.groupBy(crewentries, x=>x.char);
  });

  var form = {func:'tablecontents', requestor:0, format:'json', name:'trait'};

  request.post({url:'http://got.warbytowers.co.uk/post.php', form: form}, function(err,httpResponse,body){
    if (err) throw err;
    var payload = JSON.parse(body).items;
    traits = payload.map(x => x.item);
    var traitNames = traits.map(x => x.name);
  });
  console.log('Static data reload has been requested');
}

function cacheCharInfo(info) {
  const thisTraits = info.traits.split(',').map(x=>x.trim());
  chartraits[info.name] = thisTraits;
  crewentries.push(info);
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

function parseCharForTraits($) {
    const traitheader = $('b').filter(function() {return $(this).text() === 'Traits'}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  var traits = [];
  traitbox.find('a').each(function() {
    traits.push(copyString($(this).text()));
  });
  return traits.join(', ');
}

function parseCharForChar($) {
  const traitheader = $('b').filter(function() {return $(this).text() === 'Character'}).first();
  const traitbox = traitheader.parent().parent().next('tr');
  return copyString(traitbox.find('a').text());
}

function parseCharPage($, stars, name) {

  const table = $('#Away_Team_Skills').first().parent().next().next(); //.parent().next('table').first();
  const starsRow =  table.find('tr').eq(1);
  const skillCount = starsRow.find('td').eq(1).attr('colspan');

  const skillsRow = table.find('tr').eq(2);
  const skillsCells = skillsRow.find('a');
  var skills = [];
  for (var ski =0; ski<skillCount; ski++) {
    const href = skillsCells.eq(ski).attr('href');
    if (!href) throw `No skill href for ${name} in ${skillsCells.html()}`;
    const skill = href.replace('/wiki/','').substr(0,3).toLowerCase().replace('com','cmd');
    skills.push(skill);
  }


  const ferow = table.find('tr').eq(13);
  const fedata = ferow.find('td');

  var skilldata = [];
  for (var star=0; star<stars; star++) {
    for (var skill=0; skill<skillCount; skill++) {
      const col = (star*skillCount) + skill + 1; // +1 for header column
      const cell = fedata.eq(col).find('span').first();
      if (!cell) throw (`No column ${col} in ${fedata.contents()} for ${name}`);
      var base = cell.contents().filter(function() {return this.type === 'text'; }).text();
      const basere = /\d+/;
      if (!basere.test(base)) {
        base = 0;
      }
      const rollre = /\((\d+).(\d+)\)/;
      var rolls = rollre.exec(cell.text());
      if (rolls === null) rolls = [0,0,0];
      skilldata.push({stars:star+1, skill:skills[skill], base:base, min:rolls[1], max:rolls[2]});
      // return `Base ${base} ${rolls[1]} ${rolls[2]}`;
      //cell->all_text=~m/\((\d+).(\d+)\)/s or die "No skill range detected: " . $cell->all_text;
      //my ($minroll, $maxroll) = ($1,$2);
      //push @skilldata, {stars=>$star+1, skill=>$skills[$skill], base=>$base, minroll=>$minroll, maxroll=>$maxroll};
    }

  }

  const traits = parseCharForTraits($);
  const char = parseCharForChar($);

  return {stars:stars, skill:skilldata, traits:traits, name:name, char: char};


  //return `I have skills ${skills.join()}`;

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
reloadStatic();
