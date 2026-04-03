'use strict'
import { Guild } from 'discord.js'
import { describe, it, expect, beforeAll } from 'vitest'
import assert from 'assert'
import * as _ from 'underscore'
import * as cli from '../lib/cli.js'
import cfg from '../config.js'

console.log(cfg.nedbpath)
console.log(cfg.dataPath)

import * as api from '../lib/Interfaces.js'
import * as db from '../lib/crewdb.js'
import * as fleets from '../lib/fleetdb.js'

function defaultContext(userId = '-1', username = 'test') {
  const channel: Record<string, any> = {
    id: userId,
    name: 'test channel',
    send: () => {},
  }
  const sender = { send: () => {} }
  return {
    author: { username, id: userId },
    channel,
    fleetId: userId,
    isEntitled: function () {
      return true
    },
    emojify: (x: string) => x,
    boldify: (x: string) => x,
    sender,
  }
}

describe('gotBot', function () {
  function sendCommand(
    cmd: string,
    context?: api.Context | any
  ): Promise<string> {
    assert(cli.isCliSentence(cmd))
    if (context == null) {
      context = defaultContext()
    }
    return cli.sendCommand(cmd, context)
  }

  describe('stats command', function () {
    it('should have Rakal Troi stats!', async function () {
      const cmd = '-dev bot stats rakal'
      const msg = await sendCommand(cmd)
      expect(msg).toContain('Rakal Troi')
    })

    it('should not have unknown stats!', async function () {
      const cmd = '-dev bot stats unknownnnn'
      const data = await sendCommand(cmd)
      expect(data).toContain(
        "don't know any matching character from unknownnnn"
      )
    })

    it('should show choices for multi-match', async function () {
      const data = await sendCommand('-dev bot stats mirr sisko')
      expect(data).toContain('2 character matches. Did you mean')
    })

    it('should match exact names', async function () {
      const data = await sendCommand('-dev bot stats mirror sisko')
      expect(data).toContain('Mirror Sisko')
      expect(data).toContain('Scoundrel')
    })
  })

  describe('estats command', function () {
    it('should return an embed object', async function () {
      const data = await sendCommand('-dev bot estats mirror sisko')
      expect(data).toBe('EMBED')
    })
  })

  it('should fail unknown commands', async function () {
    const cmd = '-dev bot unknowncommand'
    const data = await sendCommand(cmd)
    expect(data).toContain('unknown command unknowncommand')
  })

  describe('best command', function () {
    it('should best base eng', async function () {
      const data = await sendCommand('-dev bot best base eng')
      expect(data).toContain('Ahdar')
    })

    it('should best gauntlet med', async function () {
      const data = await sendCommand('-dev bot best gauntlet med')
      expect(data).toContain('Mirror Phlox')
    })

    it('should best gauntlet med sec', async function () {
      const data = await sendCommand('-dev bot best gauntlet med sec')
      expect(data).toContain('Mirror Phlox')
    })

    it('should best base cmd -f1', async function () {
      const data = await sendCommand('-dev bot best base cmd -f1')
      expect(data).toContain('Captain Tribble')
    })

    it('should best gauntlet', async function () {
      const data = await sendCommand('-dev bot best gauntlet')
      expect(data).toContain('Locutus')
    })

    it('should validate query type', async function () {
      const data = await sendCommand('-dev bot best foo')
      expect(data).toContain('Must be base|gauntlet')
    })

    it('should validate skill type', async function () {
      const data = await sendCommand('-dev bot best base foo')
      expect(data).toContain('Must be cmd|dip')
    })
  })

  describe('search command', function () {
    it('should find two kais', async function () {
      const cmd = '-dev bot search kai'
      const data = await sendCommand(cmd)
      expect(data).toContain('3 results for Kai')
      expect(data).toContain('Kai Opaka')
      expect(data).toContain('Kai Winn')
    })

    it('should find tuvix under both tuvok', async function () {
      const cmd = '-dev bot search tuvok'
      const data = await sendCommand(cmd)
      expect(data).toContain('Tuvix')
    })

    it('and neelix', async function () {
      const cmd = '-dev bot search tuvok'
      const data = await sendCommand(cmd)
      expect(data).toContain('Tuvix')
    })

    it('should not have Mirror Garak in klingon', async function () {
      const cmd = '-dev bot search klingon'
      const data = await sendCommand(cmd)
      expect(data).not.toContain('Mirror Garak')
    })
  })

  it('should handle foo', async function () {
    const cmd = '-dev bot foo'
    const data = await sendCommand(cmd)
    expect(data).toContain(
      'Hi test (-1). Thanks for sending in channel test channel'
    )
  })

  describe('gaunt command', function () {
    it('should calculate even match', async function () {
      const cmd = '-dev bot gaunt 5 100 900 100 900 5 100 900 100 900'
      const data = await sendCommand(cmd)
      expect(data).toMatch(/You would win (49|50|51)% of the time/)
    })
  })

  describe('hello command', function () {
    it('should say hello', async function () {
      const data = await sendCommand('-dev bot hello')
      expect(data).toContain('Hi test (-1)')
    })
  })

  describe('crew commands', function () {
    it('should list crew', async function () {
      const data = await sendCommand('-dev bot crew list')
      expect(data).toMatch(/you have these/)
    })

    it('should add crew', async function () {
      const data = await sendCommand('-dev bot crew add rog win -s2')
      expect(data).toMatch(/Hi test. I have added Rogue Kai Winn/)
      expect(data).toContain('cmd 643')
    })

    it('should add more crew', async function () {
      const data = await sendCommand('-dev bot crew add rakal -f')
      expect(data).toMatch(/Hi test. I have added Rakal Troi/m)
      expect(data).toContain('cmd 521')
    })

    it('should fully equip crew to a fuse level', async function () {
      const data = await sendCommand('-dev bot equip rog win -s3')
      expect(data).toMatch(/updated stats for Rogue Kai Winn/m)
      expect(data).toContain('cmd 721')
    })

    it('should fully equip crew to a fuse and skill level', async function () {
      const data = await sendCommand('-dev bot equip rog win -s3 -l1')
      expect(data).toMatch(/updated stats for Rogue Kai Winn/m)
      expect(data).toContain('cmd 721 ')
    })

    it('should save stars and level in char', async function () {
      const qry = { _id: '-1' }
      const doc = await new Promise<any>((resolve) => {
        db.users.findOne(qry, function (err: any, doc: any) {
          resolve(doc)
        })
      })
      const name = 'Rogue Kai Winn'
      expect(doc).toBeTruthy()
      const char = _.find(doc.crew, (x: any) => x.name === name)
      expect(char).toBeTruthy()
      expect(char.level).toBe(1)
      expect(char.stars).toBe(3)
      expect(char.maxstars).toBe(5)
      expect(char.cmd.base).toBe(721)
    })

    it('should *not* vault crew not in roster', async function () {
      const data = await sendCommand('-dev bot crew vault cap jane')
      expect(data).toContain('There is no Captain Janeway in your roster')
    })

    it('should vault someone in the roster', async function () {
      const data = await sendCommand('-dev bot crew vault rog win')
      expect(data).toContain('Rogue Kai Winn has been added to your vault')
    })

    it('should *not* vault someone already in the vault', async function () {
      const data = await sendCommand('-dev bot crew vault rog win')
      expect(data).toContain('There is no Rogue Kai Winn in your roster')
    })

    it('should unvault someone already in the vault', async function () {
      const data = await sendCommand('-dev bot crew unvault rog win')
      expect(data).toContain('has been taken out of your vault')
      const qry = { _id: '-1' }
      const doc = await new Promise<any>((resolve) => {
        db.users.findOne(qry, function (err: any, doc: any) {
          resolve(doc)
        })
      })
      const name = 'Rogue Kai Winn'
      expect(doc).toBeTruthy()
      const char = _.find(doc.crew, (x: any) => x.name === name)
      expect(char).toBeTruthy()
      expect(char.level).toBe(100)
      expect(char.stars).toBe(5)
    })

    describe('gcalc command', function () {
      it('should provide analysis for your crew', async function () {
        const ctx = defaultContext('-2', 'gcalc-test') as unknown as api.Context
        let data = await sendCommand('-dev bot crew add rog win -ff', ctx)
        expect(data).toContain('Rogue Kai Winn')
        data = await sendCommand('-dev bot crew add rakal -ff', ctx)
        expect(data).toContain('Rakal Troi')
        data = await sendCommand('-dev bot crew add locutus borg -ff', ctx)
        expect(data).toContain('Locutus of Borg')
        data = await sendCommand('-dev bot crew add captain sisko -ff', ctx)
        expect(data).toContain('Captain Sisko')
        data = await sendCommand('-dev bot crew add kai opaka -ff', ctx)
        expect(data).toContain('Kai Opaka')

        data = await sendCommand('-dev bot gcalc', ctx)
        expect(data).toContain('Locutus of Borg')
        expect(data).toContain('Captain Sisko')
        expect(data).toContain('Kai Opaka')
        expect(data).toContain('Gauntlet strength 2022')
      })

      it('should provide analysis for your best lineup', async function () {
        const data = await sendCommand('-dev bot gcalc --best')
        expect(data).toContain(
          'Your best 5 crew for dip and traits Cultural Figure, Villain, Inspiring'
        )
        expect(data).toContain('Locutus of Borg')
      })
    })

    it('should remove crew', async function () {
      const data = await sendCommand('-dev bot crew remove rog win')
      expect(data).toMatch(/I have removed Rogue Kai Winn/)
    })

    it('should search', async function () {
      const data = await sendCommand('-dev bot crew search troi')
      expect(data).toMatch(/1\/1 matches for troi/i)
    })

    it('should remove more crew', async function () {
      const data = await sendCommand('-dev bot crew remove rakal')
      expect(data).toMatch(/I have removed Rakal Troi/)
    })
  })

  describe('voyage command', function () {
    it('should handle best crew', async function () {
      const data = await sendCommand('-dev bot voyage cmd dip --best')
      expect(data).toContain('Your best crew')
    })
  })

  describe('voytime command', function () {
    it('should calculate antimatter levels', async function () {
      const data = await sendCommand(
        '-dev bot voytime 2000 2000 2000 2000 2000 2000 2500 3'
      )
      expect(data).toContain('795 antimatter')
    })

    it('should solve for 0 antimatter', async function () {
      const data = await sendCommand(
        '-dev bot voytime 2000 2000 2000 2000 2000 2000'
      )
      expect(data).toContain('Estimated voyage length of 3h 37m')
    })
  })

  describe('farm command', function () {
    it('should match strings', async function () {
      const data = await sendCommand('-dev bot farm 0 desktop monitor')
      expect(data).toContain('Did you mean')
    })

    it('should farm desktop monitor', async function () {
      const data = await sendCommand('-dev bot farm 0 desktop monitor tng')
      expect(data).toContain('```')
    })
  })

  describe('boss command', async () => {
    it('should set correct difficulty', async () => {
      const fleet = await fleets.setBossDifficulty('-1', 5)
      expect(fleet).toBeTruthy()
    })

    it('should handle boss command', async () => {
      const data = await sendCommand('-dev bot boss')
      expect(data).toContain('Showing 25 of 80 eligible')
    })

    it('should handle boss add', async () => {
      const data = await sendCommand('-dev bot boss add iden')
      expect(data).toContain('Iden will be excluded')
    })

    it('should handle boss reset', async () => {
      const data = await sendCommand('-dev bot boss reset')
      expect(data).toContain('is reset')
    })
  })

  describe('manual cmd', () => {
    it('should prevent manual for non-admins', async () => {
      const data = await sendCommand('-dev bot manual')
      expect(data).toMatch(/^Only the server administrator can run this/)
    })

    it('should show manual for admins', async () => {
      const ctx = defaultContext() as unknown as api.Context
      ctx.guild = { ownerId: '-1' } as unknown as Guild
      const data = await sendCommand('-dev bot manual', ctx)
      expect(data).toMatch(/^Server manual done/)
    })
  })

  describe('event cmd', function () {
    it('should reset event chars', async function () {
      let data = await sendCommand('-dev bot event reset')
      expect(data).toBe('Event crew reset')
      data = await sendCommand('-dev bot event')
      expect(data).toContain('0 matches')
    })

    it('should add and list event chars', async function () {
      let data = await sendCommand('-dev bot event add troi')
      expect(data).toContain('Deanna Troi')
      data = await sendCommand('-dev bot crew add rakal troi -ff')
      data = await sendCommand('-dev bot crew vault rakal troi')
      data = await sendCommand('-dev bot event')
      expect(data).toContain('R (Troi)')
    })
  })
})

import * as missions from '../lib/missions.js'

describe('missions', function () {
  beforeAll(async () => {
    await missions.ready
  })

  it('should have an item list', async function () {
    const all = missions.allMissionItems()
    expect(all.length).toBeGreaterThan(200)
    expect(all).toContain('Polyalloy')
  })

  it('should match items', async function () {
    const result = missions.matchItem('desktop', 'monitor', 'tng')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.name).toBe('Desktop Monitor (TNG)')
    }
  })

  it('should fuzzy search items', async function () {
    const result = missions.matchItem('polya')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.name).toBe('Polyalloy')
    }
  })

  it('should query for an item', async function () {
    const match = missions.findByStarItem(0, 'Desktop Monitor (TNG)')
    expect(match.length).toBe(1)
    match.forEach((m: any) => {
      console.log(`${m.name} ${m.level} ${m.cost}`)
    })
  })
})
