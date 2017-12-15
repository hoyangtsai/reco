const path = require('path');
const Command = require('@tencent/reco-bin');
const fs = require('mz/fs');
const pkg = require('../package.json');

class Reco extends Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.name = 'reco';
    this.usage = 'Usage: reco [command] [options]';
    this.Command = Command;
    this.logger.info(`Load reco@${pkg.version} succeed! `);
    try {
      const pkgInfo = require(`${this.context.cwd}/package.json`);
      if (pkgInfo.template && pkgInfo.template.toolkit) {
        const toolkit = pkgInfo.template.toolkit;
        const usePkg = toolkit.startsWith('@tencent');
        if (usePkg) {
          const modulePath = path.resolve(__dirname, '../../..');
          const toolkitDir = this.helper.getToolkitDir(toolkit, modulePath);
          this.logger.info('user project config toolkit: ', toolkit);
          this.logger.info(`final toolkit dir: ${toolkitDir}`);
          if (!fs.existsSync(toolkitDir)) {
            this.logger.info('toolkit is required as package, but not found. Just install it...');
            this.helper.installToolkit(toolkit, ['-S', '--prefix', this.context.cwd]).then(() => {
              const toolkitPkg = require(`${toolkitDir}/package.json`);
              this.load(`${toolkitDir}/lib/command`);
              this.logger.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
            });
          } else {
            const toolkitPkg = require(`${toolkitDir}/package.json`);
            this.load(`${toolkitDir}/lib/command`);
            this.logger.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
          }
        } else {
          const toolkitPkg = require(`${toolkitDir}/package.json`);
          this.logger.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
          this.load(`${toolkitDir}/lib/command`);
        }
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
