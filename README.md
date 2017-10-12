# nodinx cli

## 前置要求
安装 Node 环境，最低要求 Node.js 6 LTS 版本。<br />
[https://nodejs.org/en/download/](https://nodejs.org/en/download/)

### Mac 系统推荐使用 [Homewbrew](https://brew.sh/) 或 [NVM](https://github.com/creationix/nvm) 安装 Node.js

1. Homebrew
```bash
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew install node
```

2. NVM
```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.3/install.sh | bash
nvm install node
```

更多 NVM 介绍: [安裝多版本 Node.js](http://km.oa.com/group/1847/articles/show/272868)

## 安装
```bash
npm install -g nodinx-cli
```

## 初始化

在当前目录下，生成一个完整的项目文件夹，包含配置文件。

```bash
nodx init [project_name]
```
## options说明

```
Usage: nodx init [dir] [options]

Commands:
  completion  generate bash completion script

Global Options:
  -h, --help     Show help                                                                                     [boolean]
  -v, --version  Show version number                                                                           [boolean]

Options:
  --type          biolerplate type                                                                              [string]
  --template      local path to biolerplate                                                                     [string]
  --package       biolerplate package name                                                                      [string]
  --dir           target directory                                                                              [string]
  --registry, -r  npm registry, support tnpm/china/npm, default to use tnpm   [string] [default: "http://r.tnpm.oa.com"]
  --silent        don't ask, just use default value                                                            [boolean]
  --force, -f     force to override directory                                                 [boolean] [default: false]
  --no-install    dont not install npm packages                                               [boolean] [default: false]
  --needUpdate    need update nodinx-cli                                                      [boolean] [default: false]
```

## 支持的模版

- ui: Pure webrebuild biolerplate
- comby: Comby component library biolerplate
- web: Wsrd runion and nodinx biolerplate
- zongchuang: Zhongchuang web biolerplate