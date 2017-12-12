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
    this.ctx.recoDir = path.resolve(__dirname, '..');
    this.logger.info(`Load reco@${pkg.version} succeed! argv: argv: `, this.ctx.argv, ', rawArgv: ', this.ctx.rawArgv);
    try {
      const pkgInfo = require(`${this.context.cwd}/package.json`);
      if (pkgInfo.template && pkgInfo.template.toolkit) {
        const toolkit = pkgInfo.template.toolkit;
        const usePkg = toolkit.startsWith('@tencent');
        const toolkitDir = this.helper.getToolkitDir(toolkit, this.ctx.recoDir);
        this.logger.info('user project config toolkit: ', toolkit);
        this.logger.info(`final toolkit dir: ${toolkitDir}`);
        if (!fs.existsSync(toolkitDir)) {
          if (usePkg) {
            this.logger.info('toolkit is configed as package, but without install, so just install it...');
            this.helper.installToolkit(this.ctx.recoDir, toolkit, () => {
              const toolkitPkg = require(`${toolkitDir}/package.json`);
              this.load(`${toolkitDir}/lib/command`);
              this.logger.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
            });
          } else {
            throw new Error(`User project toolkit '${toolkit}' is not exists! please update it!`);
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
