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

And killer features including
- Crew selection and management - keep track of all your crew
- Gauntlet crew optimizer
- Voyage crew optimizer

To reach the author for help or thanks or other issues, join Discord at https://discord.gg/R8QzpjW

Bug reports in the code and pull requests are welcome but any requests for help will be closed with redirection to Discord

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
Copy `password_sample.js` to `password.js` and supply valid Discord bot tokens

## Usage

```sh
$ ./gotcron
$ node lib/cachewiki.js
$ node lib/index.js 
```
If you have daemontools installed, you can also do `supervise .` to run the node apps. You can use cron to schedule `gotcron` to be run at an appropriate interval

## License

Apache-2.0 © [Kevin Tam](http://github.com/glorat)


[npm-image]: https://badge.fury.io/js/gotbot.svg
[npm-url]: https://npmjs.org/package/gotbot
[travis-image]: https://travis-ci.org/glorat/gotbot.svg?branch=master
[travis-url]: https://travis-ci.org/glorat/gotbot
[daviddm-image]: https://david-dm.org/glorat/gotbot.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/glorat/gotbot
