const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const format = require('util').format;
const open = require('opn');
const net = require('net');

const webpackMerge = require('webpack-merge');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const chalk = require('chalk');
const ifaces = require('os').networkInterfaces();
const ProgressPlugin = require('webpack/lib/ProgressPlugin');

const userConfig = require(path.join(process.cwd(), 'userConfig.js'));
const pageConfig = require(path.join(process.cwd(), userConfig.pageConfig));
const baseConfig = Object.assign({}, userConfig, pageConfig);

module.exports = function(args) {
  let ip = 'localhost';
  let port = parseInt(args.port || args.p) || 6001;
  let self = this;
  let log = this.log;
  let timeoutLog;

  process.env.NODE_ENV = 'development';
  process.env.SERVER_PORT = port;

  return checkPort(ip, port).then(function() {
    return copyLibrary();
  }).then(function() {
    let webpackBaseConfig = require('../webpack/webpack.config.base');
    let webpackDevServerConfig = require('../webpack/webpack.config.devServer');
    let webpackConfig = webpackMerge(
      webpackBaseConfig(baseConfig), webpackDevServerConfig(baseConfig));

    if (Array.isArray(baseConfig.extLoaders)) {
      for (let i in baseConfig.extLoaders) {
        webpackConfig.module.loaders.push(baseConfig.extLoaders[i]);
      }
    }

    return webpackConfig;
  }).then(function(webpackConfig) {
    let compiler = webpack(webpackConfig);

    compiler.apply(new ProgressPlugin(function (percentage, msg, current, active, modulepath) {
      clearTimeout(timeoutLog);

      if (process.stdout.isTTY && percentage < 1) {
        process.stdout.cursorTo(0);
        modulepath = modulepath ? ' …' + modulepath.substr(modulepath.length - 30) : '';
        current = current ? ' ' + current : '';
        active = active ? ' ' + active : '';
        process.stdout.write((percentage * 100).toFixed(0) + '% '
          + msg + current + active + modulepath + ' ');
        process.stdout.clearLine(1);
      } else if (percentage === 1) {
        timeoutLog = setTimeout(() => {
          self.log.info(chalk.yellow(
            'Webpack server is running. Press Ctrl+C to stop.'));
          self.log.info(chalk.yellow('Server listening at:'));

          Object.keys(ifaces).map(key => {
            ifaces[key].map(details => {
              if (details.family === 'IPv4') {
                self.log.info(`http://${details.address}:` + chalk.green(`${port}`));
              }
            });
          });
          self.log.info(`http://${ip}:` + chalk.green(`${port}`));
        });
      }
    }))

    return compiler;
  }).then(function(compiler) {
    let publicPath = path.join(
      `/${process.env.DEV_DIR}/`, baseConfig.path, '/').replace(/\\/g, '/');

    return startServer(compiler, publicPath, ip, port);
  }).then(function(server) {
    var addr = formatAddress(ip, port, baseConfig.htmlPath);

    if (args.o || args.open) {
      open(addr);
    }

    return server;
  }).catch(function(err) {
    switch (err.code) {
      case 'EADDRINUSE':
        self.log.fatal('Port %d has been used. Try another port instead.', port);
        break;
    }
    throw err;
  })
}


function copyLibrary() {
  return new Promise(function(resolve, reject) {
    let fullDevDir = path.join(process.cwd(), process.env.DEV_DIR);
    let reactFile = path.join(fullDevDir, 'react.js');

    if (!fs.existsSync(fullDevDir)) {
      try {
        fs.mkdirSync(fullDevDir);
      } catch (err) {
        reject(err);
      }
    }

    if (!fs.existsSync(reactFile)) {
      try {
        fs.writeFileSync(reactFile,
          fs.readFileSync(path.join(
            __dirname, '../react/react_dev.js')
          ), 'utf-8'
        );
      } catch (err) {
        reject(err);
      }
    }

    resolve();
  });
}

function startServer(compiler, publicPath, ip, port) {
  return new Promise(function(resolve, reject) {
    let server = new WebpackDevServer(compiler, {
      contentBase: process.env.PWD.replace(/\\/g, '/'),
      publicPath: publicPath,
      inline: true,
      hot: true,
      stats: {
        colors: true
      }
    });

    server.listen(port, 'localhost', function(error) {
      if (error) {
        reject(error);
      }
      resolve(server);
    });
  });
}

function checkPort(ip, port) {
  return new Promise(function(resolve, reject) {
    if (port > 65535 || port < 1) {
      return reject(new Error(
        `Port number ${port} is invalid.
        Try a port number between 1 and 65535.`));
    }

    let server = net.createServer();
    server.listen(port, ip);

    server.once('error', reject);

    server.once('listening', function() {
      server.close();
      resolve();
    });
  });
}

function formatAddress(ip, port, root) {
  if (ip === '0.0.0.0') ip = 'localhost';

  return format('http://%s:%d/%s', ip, port, root);
}