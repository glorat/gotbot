'use strict';

import _ = require('underscore');

function reSafe(str:string) {
  return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}

// FIXME: How to declare cb in typescript?
export type MatchCB = (err:string|null, name:string|null) => void

export function matchOne(cb: MatchCB, allNames:Array<string>, desc:string, one:string, two:string="", three:string="") {
  var names = matchAll(allNames, one, two, three);

  if (names.length === 0) {
    cb(`Sorry don't know any matching ${desc} from ${[one,two,three].join()}`, null);
  }
  else if (names.length ===1 ) {
    const name = names[0];
    cb (null, name);
  }
  else {
    const n = names.length;
    if (n > 5) {
      names = _.sample(names, 5);
    }
    const nameStr = names.join(', ');
    cb(`${n} ${desc} matches. Did you mean ${nameStr}?`, null);
  }
}

export function matchAll(origNames:Array<string>, one:string, two:string, three:string) {
  let names = _.uniq(origNames);

  let perfect = [one,two,three].join(' ').trim().toLowerCase();
  let perfectMatch = names.filter(nm => nm.toLowerCase() === perfect);
  if (perfectMatch.length === 1) {return perfectMatch;}

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
