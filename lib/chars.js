const fs = require('fs');
const _ = require('underscore');

var charstars;

module.exports = {
  charStars: charStars,
  matchOne: matchOne,
  matchNames: matchNames,
  reloadStatic:reloadStatic
};

function charStars() {
  return charstars;
}

function matchOne(cb, one, two, three) {
  var names = matchNames(one, two, three);

  if (names.length === 0) {
    cb(`Sorry don't know any matching characters`);
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
    cb(`${n} matches. Did you mean ${nameStr}?`);
  }

}

function matchNames(one, two, three) {
  var names = _.keys(charstars);
  [one,two,three].forEach(x => {
    if (x) {
      names = _.filter(names, nm => nm.toLowerCase().includes(x.toLowerCase()));
    }
  });
  return names;
}

function reloadStatic() {
  fs.readFile('lib/crew.json', 'utf8', function (err, data) {
    if (err) throw err; // we'll not consider error handling for now
    charstars = JSON.parse(data);
  })
}

// Get it on startup
reloadStatic();
