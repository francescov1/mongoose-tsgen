mongoose-tsgen
==============

A Mongoose Typescript typings generator

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen)
[![Downloads/week](https://img.shields.io/npm/dw/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen)
[![License](https://img.shields.io/npm/l/mongoose-tsgen.svg)](https://github.com/francescov1/mongoose-tsgen/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g mongoose-tsgen
$ mongoose-tsgen COMMAND
running command...
$ mongoose-tsgen (-v|--version|version)
mongoose-tsgen/0.0.0 darwin-x64 node-v14.3.0
$ mongoose-tsgen --help [COMMAND]
USAGE
  $ mongoose-tsgen COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mongoose-tsgen hello [FILE]`](#mongoose-tsgen-hello-file)
* [`mongoose-tsgen help [COMMAND]`](#mongoose-tsgen-help-command)

## `mongoose-tsgen hello [FILE]`

describe the command here

```
USAGE
  $ mongoose-tsgen hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ mongoose-tsgen hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/francescov1/mongoose-tsgen/blob/v0.0.0/src/commands/hello.ts)_

## `mongoose-tsgen help [COMMAND]`

display help for mongoose-tsgen

```
USAGE
  $ mongoose-tsgen help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_
<!-- commandsstop -->
