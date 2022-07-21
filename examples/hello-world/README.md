# hello-world connector example

This module serves as an example for implementing a SaaS connector for IdentityNow.


## 0. Environment Setup

Download and install the latest [Node v16.x](https://nodejs.org/en/download/releases/).

[npm](https://docs.npmjs.com/cli/v7/commands), Node Package Manager, is included in the Node installation.

To verify installation:
```bash
$ node -v 
v16.6.1

$ npm -v 
7.20.3
```


## 1. Project Setup

Create a new Node project via `npm init`.
Following the CLI prompt results in the creation of `package.json` file.
This file is responsible for defining all metadata, configurations, dependencies
of the project.

```bash
$ npm init
This utility will walk you through creating a package.json file.
It only covers the most common items, and tries to guess sensible defaults.

See `npm help init` for definitive documentation on these fields
and exactly what they do.

Use `npm install <pkg>` afterwards to install a package and
save it as a dependency in the package.json file.

Press ^C at any time to quit.
package name: (hello-world) 
version: (1.0.0) 0.1.0
description: Hello world connector example
entry point: (index.js) dist/index.js
test command: 
git repository: 
keywords: 
author: SailPoint Technologies, Inc.
license: (ISC) UNLICENSED
About to write to /Users/sangjin.shin/Repos/saas-connector-sdk-js/examples/hello-world/package.json:

{
  "name": "hello-world",
  "version": "0.1.0",
  "description": "Hello world connector example",
  "main": "dist/index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "SailPoint Technologies, Inc.",
  "license": "UNLICENSED"
}

Is this OK? (yes) 
```

### Install TypeScript (recommended)

Using TypeScript for static type checking is recommended.

```bash
$ npm install typescript --save-dev
```

Create a `tsconfig.json` via `tsc --init`.
This file is responsible for configuring compiler options when compiling
TypeScript source to JavaScript target for distribution.

Following configuration is recommended:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.spec.ts", "**/*.spec.js"]
}
```


## 2. Install Dependencies

Install the Connector SDK from GitHub:
```bash
$ npm install github:sailpoint/saas-connector-sdk-js#main
```

> SDK is not yet published to npm registry.

Install any other dependencies necessary, such as SaaS vendor's SDK, from npm registry:

Ex.
```bash
$ npm install @octokit/core @octokit/plugin-retry
```

Once the dependencies have been installed, they are added as entries in `package.json`.

Two files are automatically generated:
- `node_modules/`
- `package-lock.json`

`package-lock.json` file used to lock dependencies versions for repeatable build.
**Do not modify the `package-lock.json` file.** Be sure to check in both `package.json` and `package-lock.json` to git,
but do not check in the `node_modules` directory.


## 3. Implement Connector

Create a new `src/index.ts` file and initialize the `Connector` class by attaching appropriate command handlers.
Be sure to export the `Connector` object as module property `connector` so that it can be referenced from the Runtime
environment.

To fail a command, simply throw an Error from its handler.


## 4. Execute Connector Locally

Use bundled `spcx` to test/debug the connector locally.

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


## 5. Pack the Connector

Using [npm scripts](https://docs.npmjs.com/cli/v7/using-npm/scripts) is an easy way to define lifecycle for
building the connector deliverable.

Some recommended dev dependencies are [`shx`](https://www.npmjs.com/package/shx)
and [`@vercel/ncc`](https://www.npmjs.com/package/@vercel/ncc).
shx is useful for scripting cross-platform Unix commands, and ncc is useful for
bundling the project source into a single index.js file (similar to WebPack).

```bash
$ npm install shx @vercel/ncc --save-dev
```

Zip the source for deployment (will be different based on npm scripts defined):
```bash
$ npm run pack-zip

> hello-world@0.1.0 prepack-zip
> npm ci && npm run build


added 24 packages, and audited 25 packages in 23s

3 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> hello-world@0.1.0 prebuild
> npm run clean


> hello-world@0.1.0 clean
> shx rm -rf ./dist


> hello-world@0.1.0 build
> npx ncc build ./src/index.ts -o ./dist -m -C

ncc: Version 0.28.6
ncc: Compiling file index.js
ncc: Using typescript@4.3.5 (local user-provided)
43kB  dist/index.js
43kB  [3661ms] - ncc 0.28.6

> hello-world@0.1.0 pack-zip
> (cd ./dist && zip $npm_package_name-$npm_package_version.zip ./index.js)

  adding: index.js (deflated 72%)
```

## 6. Deploy the Connector

Use the SailPoint CLI, [sp-cli](https://github.com/sailpoint/sp-cli), to deploy the connector to IdentityNow.
