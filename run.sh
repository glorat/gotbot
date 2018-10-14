#!/bin/bash
export NODE_ENV=production
[ -d client/stt.wiki/wiki ] || ./gotcron.sh
[ -f ./wikidb.json ] || node lib/cachewiki.js
echo $$ > data/run.pid
exec node lib/index.js 
