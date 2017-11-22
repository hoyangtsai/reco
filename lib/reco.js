const path = require('path');
const Command = require('@tencent/reco-bin');

class Reco extends Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.name = 'reco';
    this.usage = 'Usage: reco [command] [options]';
    this.Command = Command;
    try {
      const pkgInfo = require(`${this.context.cwd}/package.json`);
      if (pkgInfo.template && pkgInfo.template.toolkit) {
        this.info('pkgInfo toolkit: ', pkgInfo.template.toolkit);
        this.load(`${pkgInfo.template.toolkit}/lib/command`);
      } else {
        this.load(path.join(__dirname, 'command'));
      }
    } catch (e) {
      if (e instanceof Error && e.code === 'MODULE_NOT_FOUND') {
        this.load(path.join(__dirname, 'command'));
      } else {
        throw e;
      }
    }
  }
}

module.exports = exports = Reco;
