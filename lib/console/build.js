const fs = require('fs');
const utilFs = require('../../util/fs');
const del = require('del');
const spawn = require('hexo-util/lib/spawn');
// const spawn = require('child_process').spawn;
const pathFn = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');

const beautifyHtml = require('js-beautify').html;

module.exports = function(args) {
  let log = this.log;

  process.env.NODE_ENV = 'production';

  let userConfig = require(pathFn.join(process.env.PWD, 'userConfig.js'));
  let pageConfig = require(pathFn.join(process.env.PWD, userConfig.pageConfig));
  let baseConfig = Object.assign({}, userConfig, pageConfig);

  let webpackBaseConfig = require('../webpack/webpack.config.base');

  let isEntryArr = Array.isArray(baseConfig.entry);

  let webpackHtmlConfig = require('../webpack/webpack.config.html');
  let ssrConfig = webpackMerge(
    webpackBaseConfig(baseConfig), webpackHtmlConfig(baseConfig)
  );

  return webpackPromise(ssrConfig).then((stats) => {
    if (isEntryArr) {
      return Promise.map(baseConfig.entry, (page) => {
        reactDOMRender(page);
      })
    } else {
      return Promise.map(Object.keys(baseConfig.entry), key => {
        return Promise.map(baseConfig.entry[key], page => {
          reactDOMRender(page);
        })
      })
    }
  })
  .then(() => {
    if (isEntryArr) {
      let webpackConfig = require('../webpack/webpack.config');
      let buildConfig = webpackMerge(
        webpackBaseConfig(baseConfig), webpackConfig(baseConfig)
      );
      console.log(buildConfig.module);
    } else {

    }
  })
  .catch(err => {
    log.error(err);
  })
}


function webpackPromise(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) reject(new Error('Build failed'));
      resolve(stats);
    })
  })
}

function reactDOMRender(fileName) {
  global.React = require('react');
  global.ReactDOM = require('react-dom');
  global.ReactDOMServer = require('react-dom/server');

  if (typeof window === 'undefined') {
    global.window = {};
  }

  global.document = {
    querySelector: function(x) { return x; },
    getElementById: function(x) { return '#' + x; },
    getElementsByTagName: function() { return [] }
  };

  ReactDOM.render = (dom, place) => {
    let reg;
    if (place.indexOf(".") >= 0) {
      let str = place.slice((place.indexOf(".") + 1));
      reg = new RegExp("<.+class=.+" + str + "[^<]+>", "i");
    } else if (place.indexOf("#") >= 0) {
      let str = place.slice((place.indexOf("#") + 1));
      reg = new RegExp("<.+id=.+" + str + "[^<]+>", "i");
    }

    let htmlPath = pathFn.join(process.env.PWD,
      baseConfig.htmlPath, baseConfig.path, `${fileName}.html`);

    let html = ReactDOMServer.renderToStaticMarkup(dom);
    let fileHtml = String(fs.readFileSync(htmlPath))
      .replace(reg, match => { return match + html });

    let distHtmlPath = pathFn.join(process.env.PWD,
      process.env.DEV_DIR, baseConfig.path, `${fileName}.jade`);

    fs.writeFileSync(distHtmlPath,
      beautifyHtml(fileHtml,
        utilFs.readJson(pathFn.resolve(__dirname, '../../.jsbeautifyrc'))
      )
    );
  }
  try {
    let page = pathFn.join(process.env.PWD,
      process.env.DEV_DIR, baseConfig.path, `${fileName}.js`);
    require(page);
  } catch (err) {
    throw err;
  }
}