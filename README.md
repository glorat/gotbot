# gotbot [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> 
## Introduction
This is probably the most advanced Star Trek Timelines chat bot in existence. It supports all the basic commands you'd expect from most similar bots such as
- Basic crew stats
- Extended crew stats including rankings and special links
- Crew search by traits or character type

More advanced query capability such as
- Mission drop rates
- Gauntlet success calculator
- Voyage mission time estimator
- A user manual for the discord administrator

There are killer features under development including
- Crew selection and management - keep track of all your crew
- Gauntlet crew optimizer
- Voyage crew optimizer

There is a freely available public version of this bot that can be installed on your server with two clicks. For more information, please join https://discord.gg/R8QzpjW and ask the moderator for instructions

To reach the author for help or thanks or other issues, join Discord at https://discord.gg/R8QzpjW

Bug reports in the code and pull requests are welcome but any requests for help will be closed with redirection to Discord

## Why open source?
This bot has killer features made especially for the author's fleet the Guardians of Tomorrow. But we do want to give a 
better STT experience for the whole community. The killer features could have been kept strictly secret but here are the
motivations

- For any general fleet in the community, you can run a freely hosted free version of the bot by asking at https://discord.gg/R8QzpjW
- If you are a node.js developer who can understand this code, I'm looking for people willing to help maintain and contribute to the codebase. If you are able to do that, please work with us and in exchange it is fair you get full access to the key features. If you are only seeking to use the bot, please use the freely hosted and supported version

It is my hope that by open sourcing these secrets, when the day comes this author is no longer around to maintain the bot, someone else will be able to pick up the baton. I'd be happy to help guide that person should they come forward.

## Installation

Pre-requisite knowledge for developers
- Typical node.js setup and installation
- discord.js, including obtaining Discord tokens
- cron/supervise and other schedulers

If you need help on the above, please RTM. Otherwise proceed...

Clone this repository, and run:
```sh
$ npm install
```
Copy `password_sample.js` to `data/password.js` and supply valid Discord bot tokens

## Usage

```sh
$ ./gotcron
$ node lib/cachewiki.js
$ node lib/index.js 
```
If you have daemontools installed, you can also do `supervise .` to run the node apps. You can use cron to schedule `gotcron` to be run at an appropriate interval

## License

Copyright © [Kevin Tam](http://github.com/glorat) 2018
Licensed under the GNU Affero General Public License v.3.0


[npm-image]: https://badge.fury.io/js/gotbot.svg
[npm-url]: https://npmjs.org/package/gotbot
[travis-image]: https://travis-ci.org/glorat/gotbot.svg?branch=master
[travis-url]: https://travis-ci.org/glorat/gotbot
[daviddm-image]: https://david-dm.org/glorat/gotbot.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/glorat/gotbot
