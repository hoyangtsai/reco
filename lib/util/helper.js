const path = require('path');
const assert = require('assert');
const fs = require('fs');
const homedir = require('node-homedir');
const urllib = require('urllib');
const spawn = require('cross-spawn');
const Transform = require('stream').Transform;

module.exports = {

  spawn: (cmd, args = [], options = {
    verbose: false,
    silent: false,
  }) => new Promise((resolve, reject) => {
    if (!cmd) reject(new TypeError('Argument cmd is required'));
    /* eslint-disable no-param-reassign */
    if (!options && args && !Array.isArray(args)) {
      options = args;
      args = [];
    }
    /* eslint-enable no-param-reassign */

    const task = spawn(cmd, args, options);
    const encoding = options.hasOwnProperty('encoding') ? options.encoding : 'utf8';
    const stdoutCache = new CacheStream();
    const stderrCache = new CacheStream();

    if (task.stdout) {
      const stdout = task.stdout.pipe(stdoutCache);
      options.verbose && stdout.pipe(process.stdout);
    }

    if (task.stderr) {
      const stderr = task.stderr.pipe(stderrCache);
      !options.silent && stderr.pipe(process.stderr);
    }

    if (!task.stdout && !task.stderr) {
      task.on('exit', (code) => {
        if (code) {
          const err = new Error(`Spawn failed, code is ${code}`);
          err.code = code;
          return reject(err);
        }
        return resolve();
      });
    }

    task.on('close', (code) => {
      if (code) {
        const err = new Error(stderrCache.getCacheString(encoding));
        err.code = code;
        return reject(err);
      }
      return resolve(stdoutCache.getCacheString(encoding));
    });

    task.on('error', reject);
  }),
  /**
   * get registryUrl by short name
   * @param {String} key - short name, support `china / npm / npmrc`, default to read from .npmrc
   * @return {String} registryUrl
   */
  getRegistryByType(key) {
    switch (key) {
      case 'tnpm':
        return 'http://r.tnpm.oa.com';
      case 'china':
        return 'https://registry.npm.taobao.org';
      case 'npm':
        return 'https://registry.npmjs.org';
      default:
        {
          if (/^https?:/.test(key)) {
            return key.replace(/\/$/, '');
          }
        // support .npmrc
          const home = homedir();
          let url = process.env.npm_registry || process.env.npm_config_registry || 'https://registry.cnpmjs.org';
          if (fs.existsSync(path.join(home, '.cnpmrc')) || fs.existsSync(path.join(home, '.tnpmrc'))) {
            url = 'https://r.tnpm.oa.com';
          }
          url = url.replace(/\/$/, '');
          return url;
        }
    }
  },

  /**
   * Get package info from registry
   *
   * @param {String} registryUrl - registry url
   * @param {String} pkgName - package name
   * @param {Boolean} withFallback  - when http request fail, whethe to request local
   * @param {Function} log - log function, default is console.log
   */
  * getPackageInfo(registryUrl, pkgName, withFallback, log = console.log) {
    log(`fetching npm info of ${pkgName}`);
    try {
      const result = yield urllib.request(`${registryUrl}/${pkgName}/latest`, {
        dataType: 'json',
        followRedirect: true,
      });
      assert(result.status === 200, `npm info ${pkgName} failed, got error: ${result.status}, ${result.data.reason}`);
      return result.data;
    } catch (err) {
      if (withFallback) {
        log(`use fallbck for package ${pkgName}`);
        return require(`${pkgName}/package.json`); // eslint-disable-line import/no-dynamic-require,global-require
      }
      throw err;
    }
  },
};

class CacheStream extends Transform {

  constructor() {
    super();
    this._cache = [];
  }

  _transform(chunk, enc, callback) {
    const buf = chunk instanceof Buffer ? chunk : new Buffer(chunk, enc);

    this._cache.push(buf);
    this.push(buf);
    callback();
  }

  destroy() {
    this._cache.length = 0;
  }

  getCache() {
    return Buffer.concat(this._cache);
  }

  getCacheString(encoding) {
    const buff = this.getCache();
    this.destroy();
    if (!encoding) return buff;
    return buff.toString(encoding);
  }
}
