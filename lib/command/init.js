/* eslint-disable global-require,import/no-dynamic-require */
const os = require('os');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('nodinx-cli');
const inquirer = require('inquirer');
const updater = require('npm-updater');
const mkdirp = require('mkdirp');
const groupBy = require('lodash/groupBy');
const rimraf = require('mz-modules/rimraf');
const compressing = require('compressing');
const memFs = require('mem-fs');
const memEditor = require('mem-fs-editor');
const glob = require('glob');
const is = require('is-type-of');
const urllib = require('urllib');

const pkgInfo = require('../../package.json');

module.exports = reco => class InitCommand extends reco.Command {

  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco init [dir] [options]';
    this.name = 'reco-init';
    this.options = {
      type: {
        type: 'string',
        desc: 'biolerplate type ',
      },
      template: {
        desc: 'local path to biolerplate',
        type: 'string',
      },
      package: {
        desc: 'biolerplate package name',
        type: 'string',
      },
      dir: {
        desc: 'target directory',
        type: 'string',
      },
      tookit: {
        desc: 'toolkit package name or dir',
        type: 'string',
      },
      registry: {
        desc: 'npm registry, support tnpm/china/npm, default to use tnpm',
        alias: 'r',
        type: 'string',
        default: 'http://r.tnpm.oa.com',
      },
      silent: {
        desc: 'don\'t ask, just use default value',
        type: 'boolean',
      },
      force: {
        desc: 'force to override directory',
        alias: 'f',
        type: 'boolean',
        default: false,
      },
      'no-install': {
        desc: 'dont not install npm packages',
        type: 'boolean',
        default: false,
      },
      toolkit: {
        desc: 'whether to install toolkit ?',
        type: 'boolean',
        default: false,
      },
      needUpdate: {
        desc: 'need update nodinx-cli',
        type: 'boolean',
        default: false,
      },
    };
    this.pkgInfo = pkgInfo;
    this.configName = '@tencent/nodinx-init-config';
    this.fileMapping = {
      gitignore: '.gitignore',
      _gitignore: '.gitignore',
      '_.gitignore': '.gitignore',
      '_package.json': 'package.json',
      '_.eslintignore': '.eslintignore',
      '_.babelrc': '.babelrc',
    };
  }

  get description() {
    return 'Run init template project';
  }

  * run(ctx) {
    const {
      cwd,
      argv,
      env,
    } = ctx;
    debug('current dir is [%s], \n argv is [%o], \n env is [%o] \n rawArgv', cwd, argv, env, this.rawArgv);
    this.registryUrl = this.helper.getRegistryByType(argv.registry);
    this.logger.info('use registry [%s]', this.registryUrl);

    if (argv.needUpdate) {
      yield updater({
        package: this.pkgInfo,
        registry: this.registryUrl,
        level: 'major',
      });
    }

    const targetDir = yield this.findTargetDir();
    const templateDir = yield this.findTemplateDir();
    // if (argv.toolkit) yield this.helper.installToolkit(reco.ctx.recoDir, argv.toolkit);
    yield this.processFiles(targetDir, templateDir);

    if (argv.noInstall || this.rawArgv.indexOf('--no-install') !== -1) {
      this.logger.info('ingore install project deps');
      this.showInstallTookitTip();
      this.logger.info(`Usage:
      - cd ${targetDir}
      - npm install
      - npm start / npm run dev / npm test
    `);
    } else {
      yield this.installPkgDeps(targetDir);
      this.logger.info('install project dependecncies success!');
      this.showInstallTookitTip();
      this.logger.info(`Usage:
      - cd ${targetDir}
      ${argv.toolkit ? `- npm install -gd ${argv.toolkit}` : ''}
      - npm start / npm run dev / npm test
    `);
    }
  }

  showInstallTookitTip() {
    const { argv } = this.ctx;
    if (argv.toolkit) {
      const toolkitDir = this.helper.getToolkitDir(argv.toolkit, reco.ctx.recoDir);
      if (!fs.existsSync(toolkitDir)) {
        this.logger.warn(`当前项目配置了toolkit, 请先安装: npm install -gd ${argv.toolkit}`);
      }
    }
  }

  /**
   * install project deps
   * @param targetDir - 目标目录
   * @memberof InitCommand
   */
  * installPkgDeps(targetDir, pkgName, option = '') {
    const args = pkgName ? ['install', pkgName, option] : ['install'];
    if (this.registryUrl) args.push('--registry', this.registryUrl);
    return yield this.helper.spawn('npm', args, {
      cwd: targetDir,
      stdio: 'inherit',
    });
  }

  /**
   * Copy boilerplate to target dir with template scope vars replace
   *
   * @param {any} targetDir
   * @param {any} templateDir
   * @memberof InitCommand
   */
  * processFiles(targetDir, templateDir) {
    const { argv } = this.context;
    const src = path.join(templateDir, 'boilerplate');
    const locales = yield this.askForVariables(targetDir, templateDir);
    debug('locales: ', locales);
    const fsEditor = memEditor.create(memFs.create());

    const files = glob.sync('**/*', {
      cwd: src,
      dot: true,
      nodir: true,
      ignore: ['.git/**', '.svn/**', 'yarn*', 'package-lock.json', 'node_modules/**'],
    });
    files.forEach((file) => {
      const from = path.join(src, file);
      const to = path.join(targetDir, this.replaceVariables(this.fileMapping[file] || file, locales));
      fsEditor.copy(from, to, {
        process: (content) => {
          this.logger.info(`Write to ${to}`);
          if (file === '_package.json' || file === 'package.json') {
            const pkg = JSON.parse(content);
            if (pkg.template && argv.toolkit) {
              pkg.template.toolkit = argv.toolkit;
            }
            content = JSON.stringify(pkg, null, 2);
          }
          return this.replaceVariables(content, locales);
        },
      });
    });
    yield new Promise(resolve => fsEditor.commit(resolve));
    return files;
  }

  /**
   *
   *  Replace template variables with locales
   * - `{{var}}` will replace
   * - `\{{ var }}` will skip
   *
   * @param {any} content - template content
   * @param {any} locales  - variable scope
   * @memberof InitCommand
   */
  replaceVariables(content, scope) {
    return content.toString().replace(/(\\)?{{ *(\w+) *}}/g, (block, skip, key) => {
      if (skip) {
        return block.substring(skip.length);
      }
      return scope.hasOwnProperty(key) ? scope[key] : block;
    });
  }

  /**
   * Ask user to provide template variables which use by boilerplate
   *
   * @param {any} targetDir
   * @param {any} templateDir
   * @memberof InitCommand
   */
  * askForVariables(targetDir, templateDir) {
    let questions;
    try {
      questions = require(templateDir);
      // support questions function
      if (is.function(questions)) {
        questions = questions(this);
      }
      // use target dir name as `name` default
      if (questions.name && !questions.name.default) {
        questions.name.default = path.basename(targetDir).replace(/^nodinx-/, '');
      }
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        this.logger.info(`load boilerplate config failed, skip and use defaults, ${err.message}`.yellow);
      }
      return {};
    }

    this.logger.info('collection boilerplate variables...');
    const keys = Object.keys(questions);
    if (this.context.argv.silent) {
      /* eslint-disable no-param-reassign */
      const locals = keys.reduce((result, key) => {
        const defaultFn = questions[key].default;
        const filterFn = questions[key].filter;
        if (is.function(defaultFn)) {
          result[key] = defaultFn(result) || '';
        } else {
          result[key] = questions[key].default || '';
        }
        if (is.function(filterFn)) {
          result[key] = filterFn(result[key]) || '';
        }
        return result;
      }, {});
      /* eslint-enable no-param-reassign */
      this.logger.info('use default due to --silent, %j', locals);
      return locals;
    }
    return yield inquirer.prompt(keys.map((key) => {
      const question = questions[key];
      if (question.choices) {
        return {
          type: 'list',
          name: key,
          message: question.desc || question.description,
          choices: question.choices,
          pageSize: question.choices.length,
        };
      }
      return {
        type: 'input',
        name: key,
        message: question.desc || question.description,
        default: question.default,
        filter: question.filter,
        validate: question.validate,
      };
    }));
  }

  * findTemplateDir() {
    const { argv } = this.context;
    let templateDir = this.findLocalTemplateDir();
    if (templateDir) return templateDir;

    let pkgName = argv.package;
    if (!pkgName) {
      const boilerplateMapping = yield this.fetchBoilerplateMapping(pkgName);
      let boilerplate;
      if (argv.type && boilerplateMapping.hasOwnProperty(argv.type)) {
        boilerplate = boilerplateMapping[argv.type];
      } else {
        boilerplate = yield this.askForBoilerplateType(boilerplateMapping);
      }
      this.logger.info(`use boilerplate: ${boilerplate.name}(${boilerplate.package})`);
      pkgName = boilerplate.package;
      if (!argv.toolkit) {
        argv.toolkit = boilerplate.toolkit;
      }
    }
    this.logger.info(`use toolkit: ${argv.toolkit}`);
    templateDir = yield this.downloadBoilerplate(pkgName);
    return templateDir;
  }

  * downloadBoilerplate(pkgName) {
    const pkgInfo = yield this.helper.getPackageInfo(this.registryUrl, pkgName, false, this.logger.info);
    const tgzUrl = pkgInfo.dist.tarball;
    const saveDir = path.join(os.tmpdir(), 'nodinx-boilerplate');
    yield rimraf(saveDir);

    this.logger.info(`start downloading pkg ${tgzUrl}`);
    const response = yield urllib.request(tgzUrl, {
      streaming: true,
      followRedirect: true,
    });
    yield compressing.tgz.uncompress(response.res, saveDir);
    this.logger.info(`Extract to ${saveDir}`);
    return path.join(saveDir, '/package');
  }

  /**
   *
   * return local template dir, when use `reco init --template=PATH`
   * @returns {string}
   * @memberof InitCommand
   */
  findLocalTemplateDir() {
    const {
      argv,
      cwd,
    } = this.context;
    let templateDir;

    if (argv.template) {
      templateDir = path.resolve(cwd, argv.template);
      if (!fs.existsSync(templateDir)) {
        this.logger.info(`${templateDir} is not exists`.red);
        return null;
      } else if (!fs.existsSync(path.resolve(templateDir, 'boilerplate'))) {
        this.logger.info(`${templateDir} must contain boilerplate folder`.red);
        return null;
      }
      return templateDir;
    }
    return null;
  }

  * fetchBoilerplateMapping(pkgName) {
    const pkgInfo = yield this.helper.getPackageInfo(this.registryUrl, pkgName || this.configName, true, this.logger.info);
    const mapping = pkgInfo.config.boilerplate;
    Object.keys(mapping).forEach((key) => {
      const item = mapping[key];
      item.name = item.name || key;
      item.from = pkgInfo;
    });
    return mapping;
  }

  * askForBoilerplateType(mapping) {
    const groupMapping = groupBy(mapping, value => value.category || 'other');
    const groupNames = Object.keys(groupMapping);

    let group;
    if (groupNames.length > 1) {
      const answers = yield inquirer.prompt({
        name: 'group',
        type: 'list',
        message: 'Please select a boilerplate group ? ',
        choices: groupNames,
        pageSize: groupNames.length,
      });
      group = groupMapping[answers.group];
    } else {
      group = groupMapping[groupNames[0]];
    }

    // ask for boilerplate
    const choices = Object.keys(group).map((key) => {
      const item = group[key];
      return {
        name: `${key} - ${item.description}`,
        value: item,
      };
    });
    choices.unshift(new inquirer.Separator());
    const answers = yield inquirer.prompt({
      name: 'type',
      type: 'list',
      message: 'Please select a boilerplate type',
      choices,
      pageSize: choices.length,
    });
    return answers.type;
  }

  * findTargetDir() {
    const {
      argv,
      cwd,
    } = this.context;
    const dir = argv._[0] || argv.dir || '';
    let targetDir = path.resolve(cwd, dir);
    const isValid = this.validateTargetDir(targetDir, argv.force);
    if (!isValid) {
      const answer = yield inquirer.prompt({
        name: 'dir',
        message: 'Please enter a valid target dir: ',
        default: dir || '.',
        filter: dir => path.resolve(cwd, dir),
        validate: dir => this.validateTargetDir(dir, argv.force),
      });
      targetDir = answer.dir;
    }
    this.logger.info(`Target directory is ${targetDir}`);
    return targetDir;
  }

  validateTargetDir(dir, force) {
    // create dir if not exist
    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
      return true;
    }

    // just a file
    if (!fs.statSync(dir).isDirectory()) {
      this.logger.info(`${dir} already exists as a file`.red);
      return false;
    }

    // check if directory is empty
    const files = fs.readdirSync(dir).filter(name => name[0] !== '.');
    if (files.length > 0) {
      if (force) {
        this.logger.info(`${dir} already exists and will be override due to --force option`.red);
        return true;
      }
      this.logger.info(`${dir} already exists and not empty: ${JSON.stringify(files)}`.red);
      return false;
    }

    return true;
  }
};

