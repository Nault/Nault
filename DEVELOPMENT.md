# Nault Development

## Application Structure

- [Nault](https://github.com/Nault/Nault) - The main wallet application (UI + Seed Generation/Block Signing/Etc).
- Communication with the network is done via Nano RPC and Websocket protocols, private or public on any nano network.

## Development Prerequisites
- [NodeJS](https://nodejs.org) v12.x + NPM v6.x
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

If you want to debug in VS code, first install [debugger for chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)
Then you can just go to the debug screen and choose "Launch Chrome http"

#### Run the wallet in dev mode as https (for example if using the Ledger device)
```bash
npm run wallet:dev-ssl
```

To debug in VS code: Go to debug screen and choose "Launch Chrome https"

## Build Wallet (For Production)
Build a production version of the wallet for web:
```bash
npm run wallet:build
```

Build a production version of the wallet for desktop: *(Required for all desktop builds)*
```bash
npm run wallet:build-desktop
```

## Desktop Builds

*All desktop builds require that you have built a desktop version of the wallet before running!*

Run the desktop wallet in dev mode:
```bash
npm run desktop:dev
```

If you want to debug in VS code, first install [debugger for chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)
Then you can just go to the debug screen and choose "Electron: Main", "Electron: Renderer", or "Electron: All" for both Main and Renderer threads.

Build the desktop wallet for your local OS (Will be in `desktop-app\build`):
```bash
npm run desktop:local
```

Build the desktop wallet for Windows+Mac+Linux (May require dependencies for your OS [View them here](https://www.electron.build/multi-platform-build)):
```bash
npm run desktop:full
```

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).
