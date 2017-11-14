const debug = require('debug')('nodinx-cli');
const Command = require('../command');
const path = require('path');

class ServerCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco server [env] [options]';
    this.options = {
      port: {
        desc: 'http port',
        alias: 'p',
        type: 'number',
        default: 8080,
      },
      open: {
        desc: 'whethe open the browser',
        alias: 'o',
        type: 'boolean',
        default: false,
      },
    };
  }

  get description() {
    return 'Run webpack dev server';
  }

  * run(ctx) {
    const { cwd } = ctx;

    const pkgJson = require(path.join(cwd, 'package.json'));
    if (!pkgJson.template || !pkgJson.template.toolkit) {
      console.error('Current project missing template info, please contact @allanyu to setting it!');
      return;
    }

    const toolkit = pkgJson.template.toolkit;
    const toolkitInfo = require(`${toolkit}/package.json`);
    this.log('toolkitInfo: ', toolkitInfo.name);
  }
}

module.exports = ServerCommand;
