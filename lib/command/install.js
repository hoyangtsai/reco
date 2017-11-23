const path = require('path');
const Command = require('@tencent/reco-bin');

class InstallCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco install [pkg] [options]';
    this.name = 'install';
    this.options = {
      pkg: {
        desc: 'npm toolkit package',
        alias: 'p',
        type: 'string',
      },
      registry: {
        desc: 'npm registry, support tnpm/china/npm, default to use tnpm',
        alias: 'r',
        type: 'string',
        default: 'http://r.tnpm.oa.com',
      },
    };
  }

  get description() {
    return 'Install reco package';
  }

  * run(ctx) {
    const { argv } = ctx;
    const pkgName = argv._[0] || argv.pkg;
    if (!pkgName) {
      this.logger.error('Argument pkg is required!');
      return;
    }
    const args = ['install', pkgName];
    const registryUrl = this.helper.getRegistryByType(argv.registry);
    if (registryUrl) args.push('--registry', registryUrl);
    try {
      yield this.helper.spawn('npm', args, {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit',
      });
      this.logger.info(`Install ${pkgName} succeed`);
    } catch (err) {
      this.logger.error(`Install ${pkgName} failed, error: `, err);
    }
  }
}

module.exports = InstallCommand;
