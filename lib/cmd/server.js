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
    const {
      cwd,
      argv,
      env,
    } = ctx;

    const pkgJson = require(path.join(cwd, 'package.json'));

    if (pkgJson.template.category === 'ui') {
      const server = require(path.join(
        env.NVM_BIN, '../lib/node_modules/nodinx-toolkit-ui/lib/scripts/server'));

      server(ctx);
    }
  }
}

module.exports = ServerCommand;
