# Nault

Nault is a community driven fork of the popular Nano wallet [NanoVault](https://github.com/cronoh/nanovault) 💙

It's a fully client-side signing wallet for sending and receiving [Nano](https://github.com/nanocurrency/nano-node/) either directly in your browser at [nault.cc](https://nault.cc) or with the [desktop app](https://github.com/Nault/Nault/releases/latest).

Seamless integration with any Nano compatible RPC backend/websocket and the aim to be more frequently maintained are some of the main features. Those together will greatly increase the stability, performance and uptime.

![Nault Screenshot](/src/assets/img/preview.png)
___

# Table of Contents
* [How To Use](#how-to-use)
* [Bugs/Feedback](#bugsfeedback)
* [Application Structure](#application-structure)
* [Development Prerequisites](#development-prerequisites)
* [Development Guide](#development-guide)
* [Acknowledgements](#acknowledgements)
* [Donations](#donations)


# How To Use
Nault is available on your desktop (Windows/Mac/Linux) - just head over to the [latest release](https://github.com/BitDesert/Nault/releases/latest) and download the version for your OS.

You can also use Nault from any device on the web at [nault.cc](https://nault.cc)

# Bugs/Feedback
If you run into any issues, please use the [GitHub Issue Tracker](https://github.com/BitDesert/Nault/issues) or head over to the [TNC Discord Server](http://discord.nanocenter.org/)!  
We are continually improving and adding new features based on the feedback you provide, so please let your opinions be known!

___

#### Everything below is only for contributing to the development of Nault
#### To download Nault as a desktop app go to the [releases section](https://github.com/BitDesert/Nault/releases), or use the web wallet at [nault.cc](https://nault.cc)

___

# Application Structure

- [Nault](https://github.com/Nault/Nault) - The main wallet application (UI + Seed Generation/Block Signing/Etc).
- Communication with the network is done via Nano RPC and Websocket protocols, private or public on any nano network.


# Development Prerequisites
- [NodeJS](https://nodejs.org) v12.x + NPM v6.x
- Angular CLI: `npm install -g @angular/cli`


# Development Guide
#### Clone repository and install dependencies
```bash
git clone https://github.com/BitDesert/Nault
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

If electron is not installed globally, you may have run this:
```bash
npm run desktop:dev-path
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

# Acknowledgements
Special thanks to the following!
- [NanoVault](https://github.com/cronoh/nanovault) - The original one
- [numtel/nano-webgl-pow](https://github.com/numtel/nano-webgl-pow) - WebGL PoW Implementation
- [jaimehgb/RaiBlocksWebAssemblyPoW](https://github.com/jaimehgb/RaiBlocksWebAssemblyPoW) - CPU PoW Implementation
- [dcposch/blakejs](https://github.com/dcposch/blakejs) - Blake2b Implementation
- [dchest/tweetnacl-js](https://github.com/dchest/tweetnacl-js) - Cryptography Implementation

# Donations
If you have found Nault useful and are feeling generous, you can donate at 
`nano_3niceeeyiaa86k58zhaeygxfkuzgffjtwju9ep33z9c8qekmr3iuc95jbqc8`

Thanks a lot!
