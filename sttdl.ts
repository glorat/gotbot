/*
    sttdl.ts - Download game config from STT
    Copyright (C) 2019  Kevin Tam

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as fs from 'async-file';
import cfg from './config';

import STTApiLite from './lib/modules/STTApiLite/lib/STTApiLite';
let password = require(cfg.dataPath + 'password');

let STTApi = new STTApiLite();

async function main() {
  let token = password.stttoken ? password.stttoken
    : await STTApi.login(password.sttuser, password.sttpass,true);

  STTApi.loginWithToken(token);

  console.log('Using OAuth token ' + token);
  let crew = await STTApi.executeGetRequest('character/get_avatar_crew_archetypes');
  // Post-process the data so that gotcron handle this better
  crew.crew_avatars.forEach((e:any)=>{
    e.name = e.name.replace(/\u2019/g,"'").replace(/\"/g,"''");
    e.wiki="/wiki/" + e.name.replace(/ /g,'_');
    e.wikiPath = "https://stt.wiki" + e.wiki;
  });
  await fs.writeFile(cfg.dataPath + "sttcrew.json", JSON.stringify(crew.crew_avatars));

}

main();
