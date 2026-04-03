'use strict'

import * as _ from 'underscore'

function reSafe(str: string) {
  return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}

export type MatchResult =
  | { success: true; name: string }
  | { success: false; message: string }

/** @deprecated Use MatchResult instead */
export type MatchCB = (err: string | null, name: string | null) => void

export function matchOne(
  allNames: Array<string>,
  desc: string,
  ...args: string[]
): MatchResult {
  let names = matchAll(allNames, ...args)

  if (names.length === 1) {
    return { success: true, name: names[0] }
  }

  const n = names.length
  if (n > 5) {
    names = _.sample(names, 5)
  }
  const nameStr = names.join(', ')

  const message =
    n === 0
      ? `Sorry don't know any matching ${desc} from ${args.join()}`
      : `${n} ${desc} matches. Did you mean ${nameStr}?`

  return { success: false, message }
}

export function matchAll(origNames: Array<string>, ...args: string[]) {
  let names = _.uniq(origNames)

  const perfect = args.join(' ').trim().toLowerCase()
  const perfectMatch = names.filter((nm) => nm.toLowerCase() === perfect)
  if (perfectMatch.length === 1) {
    return perfectMatch
  }

  let exactNames = names

  args.forEach((x) => {
    if (x) {
      const re = '\\b' + reSafe(x.toLowerCase()) + '\\b'
      exactNames = _.filter(
        exactNames,
        (nm) => nm.search(new RegExp(re, 'i')) >= 0
      )
    }
  })
  if (exactNames.length > 0) {
    return exactNames
  }

  args.forEach((x) => {
    if (x) {
      names = _.filter(names, (nm) =>
        nm.toLowerCase().includes(x.toLowerCase())
      )
    }
  })
  return names
}
