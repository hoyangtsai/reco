const path = require('path');
const Command = require('@tencent/reco-bin');
const fs = require('mz/fs');
const co = require('co');
const pkg = require('../package.json');

class Reco extends Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.name = 'reco';
    this.usage = 'Usage: reco [command] [options]';
    this.Command = Command;
    this.ctx.recoDir = path.resolve(__dirname, '..');
    this.logger.info(`Load reco@${pkg.version} succeed!`);
    try {
      const pkgInfo = require(`${this.context.cwd}/package.json`);
      if (pkgInfo.template && pkgInfo.template.toolkit) {
        const toolkit = pkgInfo.template.toolkit;
        const usePkg = toolkit.startsWith('@tencent');
        const toolkitDir = this.helper.getToolkitDir(toolkit, this.ctx.recoDir);
        this.info('user project config toolkit: ', toolkit);
        this.info(`final toolkit dir: ${toolkitDir}`);
        if (!fs.existsSync(toolkitDir)) {
          if (usePkg) {
            this.info('toolkit is configed as package, but without install, so just install it...');
            co(function* () {
              yield this.installToolkit(toolkit);
              const toolkitPkg = require(`${toolkitDir}/package.json`);
              this.load(`${toolkitDir}/lib/command`);
              this.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
            }.bind(this));
          } else {
            throw new Error(`User project toolkit '${toolkit}' is not exists! please update it!`);
          }
        } else {
          const toolkitPkg = require(`${toolkitDir}/package.json`);
          this.info(`Load ${toolkitPkg.name}@${toolkitPkg.version} succeed!`);
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

  * installToolkit(pkgName) {
    const args = ['install', pkgName];
    const registryUrl = this.helper.getRegistryByType('tnpm');
    if (registryUrl) args.push('--registry', registryUrl);
    try {
      yield this.helper.spawn('npm', args, {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
      this.logger.info(`Install ${pkgName} succeed`);
    } catch (err) {
      this.logger.error(`Install ${pkgName} failed, error: `, err);
    }
  }
}

module.exports = exports = Reco;
