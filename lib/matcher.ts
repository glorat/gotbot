'use strict';

import _ = require('underscore');

function reSafe(str:string) {
  return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}

// FIXME: How to declare cb in typescript?
export type MatchCB = (err:string|null, name:string|null) => void

export function matchOne(cb: MatchCB, allNames:Array<string>, desc:string, ...args: string[]) {
  let names = matchAll(allNames, ...args);

  if (names.length === 0) {
    cb(`Sorry don't know any matching ${desc} from ${args.join()}`, null);
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

export function matchAll(origNames:Array<string>, ...args: string[]) {
  let names = _.uniq(origNames);

  let perfect = args.join(' ').trim().toLowerCase();
  let perfectMatch = names.filter(nm => nm.toLowerCase() === perfect);
  if (perfectMatch.length === 1) {return perfectMatch;}

  let exactNames = names;

  args.forEach(x => {
    if (x) {
      const re = '\\b' + reSafe(x.toLowerCase()) + '\\b';
      exactNames = _.filter(exactNames, nm => nm.search(new RegExp(re, 'i'))>=0);
    }
  });
  if (exactNames.length >0) {return exactNames;}

  args.forEach(x => {
    if (x) {
      names = _.filter(names, nm => nm.toLowerCase().includes(x.toLowerCase()));
    }
  });
  return names;
}
