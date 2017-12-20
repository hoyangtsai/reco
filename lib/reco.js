const path = require('path');
const Command = require('@tencent/reco-bin');
const fs = require('mz/fs');
const pkg = require('../package.json');

class Reco extends Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.name = 'reco';
    this.usage = 'Usage: reco [command] [options]';
    this.logger.info(`Load reco@${pkg.version} succeed!`);
    this.Command = Command;
    this.ctx.recoDir = path.resolve(__dirname, '..');
    this.logger.info(`Current recoDir: ${this.ctx.recoDir}`);
    try {
      const pkgInfo = require(`${this.context.cwd}/package.json`);
      if (pkgInfo.template && pkgInfo.template.toolkit) {
        const toolkit = pkgInfo.template.toolkit;
        const usePkg = toolkit.startsWith('@tencent');
        const toolkitDir = this.helper.getToolkitDir(toolkit, this.ctx.recoDir);
        this.logger.info('user project config toolkit: ', toolkit);
        this.logger.info(`final toolkit dir: ${toolkitDir}`);
        if (fs.existsSync(toolkitDir)) {
          const toolkitPkg = require(`${toolkitDir}/package.json`);
          this.logger.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
          this.load(`${toolkitDir}/lib/command`);
        } else {
          if (!usePkg) {
            throw new Error(`User project toolkit '${toolkit}' is not exists! please update it!`);
          }
          this.logger.error(`项目没有安装"${toolkit}", 请先安装: npm install -gd ${toolkit}`);
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
