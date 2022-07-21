# Connector SDK for JavaScript (BETA)

## Overview

Connector SDK for JavaScript is a framework for developing a SaaS connector for IdentityNow.

## Getting Started

### Setup

Create a Node.js project and install SDK. We strongly recommend using
[TypeScript](https://www.typescriptlang.org/download) to take advantage of static type checking.

```bash
npm install @sailpoint/connector-sdk
```

#### Installing from Source

To install the SDK from GitHub:
```bash
npm install github:sailpoint/saas-connector-sdk-js#main
```

To install the SDK from local clone, run `npm pack` from SDK project, then run in target project:
```bash
npm install <path-to-sailpoint-connector-sdk-semver.tgz>
```

### Import

```typescript
import { createConnector } from '@sailpoint/connector-sdk'
```

### Usage

Initialize `Connector` object in index.ts/.js and export it to the module.

```typescript
// index.ts
import {
    Connector,
    Context,
    createConnector,
    readConfig,
    Response,
    StdAccountReadInput,
    StdAccountReadOutput
} from '@sailpoint/connector-sdk'

// Get connector source config
const config = readConfig()

export const connector: Connector = createConnector()
    .stdAccountRead((context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
        // TODO: Fetch account from source

        res.send({
            identity: 'john.doe',
            uuid: '1234',
            attributes: {
                email: 'john.doe@example.com',
            },
        })
    })
    .command('my:custom:command', (context, input, res) => {
        // TODO: implement me!
    })
```
### Logging

Use SDK provided logger to ensure log statements will include command execution context fields.
```typescript
import {logger} from '@sailpoint/connector-sdk'
```

### Examples

See complete examples in the [examples](examples) directory.

<br/>

## Connector Local Development with `spcx`

`spcx` provides:
- ability to execute the connector locally
- ability to invoke mock commands against locally-running connector for testing/debugging
- built-in TypeScript support, with watch run and inline source map

`spcx` starts up an HTTP server locally (default port=3000) that can be used to invoke a command against the connector.
`spcx` cleanly imports the connector module from specified file path at every request, so the server does not need to be
restarted after every code edit. Just start it up once and keep on using until you are done!

For connectors written in TypeScript, `spcx` automatically spawns a child process to execute
[`tsc`](https://www.typescriptlang.org/tsconfig) with `--watch` and `--inlineSourceMap` options, as well as
user-defined compiler options in the project's `tsconfig.json`.
`--watch` option prevents needing to manually recompile after code edit,
and `--inlineSourceMap` option allows debugger to function with breakpoints set in original TypeScript source.

```bash
$ spcx <connector-file-js> [port=3000]
```

`spcx` can also be run using npm script, e.g. `$ npm run dev`:

```json
{
  "scripts": {
    "dev": "spcx dist/index.js"
  }
}
```

--

To invoke a command, simply provide command's `type`, `input`, and connector `config`

Ex: `POST http://localhost:3000`
```json
{
  "type": "std:account:read",
  "input": {
    "identity": "john.doe"
  },
  "config": {
    "key": "value"
  }
}
```


## Contributing

### Building Source

- [Node.js >= 16.2.0](https://nodejs.org/en/download/releases/)

To build the SDK source (generates output in `dist` directory):
```bash
npm run build
```

To run unit tests:
```bash
npm run test
```

To run prettier to format code:
```bash
npm run prettier
```
