# Nault Development

## Application Structure

- [Nault](https://github.com/Nault/Nault) - The main wallet application (UI + Seed Generation/Block Signing/Etc).
- Communication with the network is done via nano RPC and Websocket protocols, private or public on any nano network.

## Development Prerequisites
- [NodeJS](https://nodejs.org) v16.x + NPM v8.x
- Angular CLI: `npm install -g @angular/cli`

## Development Guide
#### Clone repository and install dependencies
```bash
git clone https://github.com/Nault/Nault
cd Nault
npm install
```

#### Run the wallet in dev mode
```bash
npm run wallet:dev
```

You can use JavaScript debugger bundled with VS Code to debug. Refer [here](https://github.com/microsoft/vscode-js-debug) for additional information.

#### Run the wallet in dev mode as https (for example if using the Ledger device)
```bash
npm run wallet:dev-ssl
```

## Build Wallet (For Production)
Build a production version of the wallet for web:
```bash
npm run wallet:build
```

Build a production version of the wallet for desktop: *(Required for the desktop builds below)*
```bash
npm run wallet:build-desktop
```

## Desktop Builds

*All desktop builds require that you have built a desktop version of the wallet before running!*

Run the desktop wallet in dev mode:
```bash
npm run desktop:dev
```

You can use JavaScript debugger bundled with VS Code to debug. Refer [here](https://github.com/microsoft/vscode-js-debug) for additional information.

Build the desktop wallet for your local OS (Will be in `desktop-app\build`):
```bash
npm run desktop:local --openssl_fips=''
```

Can also run a complete build for your local OS. The "wallet:build-desktop" command is run automatically. (Will be in `desktop-app\build`):
```bash
npm run desktop:build-local
```

Build the desktop wallet for Windows+Mac+Linux (May require dependencies for your OS [View them here](https://www.electron.build/multi-platform-build)):
```bash
npm run desktop:full
```

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Adding a new component or service

* Instead of and setting up manually, a new component can be added simply by running `ng g component components/component-name` from root folder
* Similar, a service can be added by `ng g service services/service-name` and add it to the providers section in the app.module.ts

## Publishing New Release

This will only be done by repo admins. It's dependent on github workflows so if you have forked the repo and want to test releases yourself, you must change the GITHUB_TOKEN in all workflow files to another key for example WORKFLOW. Then add this key to your repo secrets with writing rights. You also need to activate workflows because it's disabled by default when you fork.

1. Bump new version (major, minor or patch). It will change the package.json version, commit and create a new tag:
```bash
npm version patch
```

2. Push the new commit and tag to origin:
```bash
git push --follow-tags
```

3. The github actions will take care of the rest. Linting, release draft, docker, desktop app building and uploading binaries based on the new version
