const Command = require('@tencent/reco-bin');

class CreateCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco create [type] [options]';
    this.options = {
      name: {
        desc: 'the name of module or component',
        alias: 'n',
        type: 'string',
        default: 'foo',
      },
    };
  }

  get description() {
    return 'Run create module or component';
  }

  * run(context) {
    console.log('Run create cmd: argv:', this.yargs.argv);
  }
}

module.exports = CreateCommand;
