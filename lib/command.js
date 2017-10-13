const BaseCommand = require('./common/command');
const helper = require('./util/helper');

require('colors');

class Command extends BaseCommand {
  constructor(rawArgv) {
    super(rawArgv);
    this.name = 'nodx';
    this.parserOptions = {
      execArgv: true,
      removeAlias: true,
    };
    this.log = this.log.bind(this);
    Object.assign(this.helper, helper);
  }

  get context() {
    const context = super.context;

    // compatible
    if (context.debugPort) context.debug = context.debugPort;

    // remove unuse args
    context.argv.$0 = undefined;

    return context;
  }

  log(...args) {
    args[0] = `[${this.name}] `.blue + args[0]; // eslint-disable-line no-param-reassign
    console.log(...args);
  }
}

module.exports = Command;
