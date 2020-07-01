# Nault

Nault is a community driven fork of the popular Nano wallet [NanoVault](https://github.com/cronoh/nanovault) 💙

It's a fully client-side signing wallet for sending and receiving [Nano](https://github.com/nanocurrency/nano-node/) in your browser either from publicly hosted [nault.cc](https://nault.cc) or by [cloning the site](https://github.com/BitDesert/Nault/tree/gh-pages) and run it locally for example in [Web Server for Chrome](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb?hl=en).

The main difference compared to the original NanoVault is the "server-less" hosting via [vercel](https://nault.vercel.app), seamless integration with any Nano compatible RPC backend/websocket and the aim to be more frequently maintained. Those features together will greatly increase the stability, performance and uptime.

![Nault Screenshot](/.github/nault.png)
___

# Table of Contents
* [Install](#install-nanovault)
* [Bugs/Feedback](#bugsfeedback)
* [Application Structure](#application-structure)
* [Development Prerequisites](#development-prerequisites)
* [Development Guide](#development-guide)
* [Acknowledgements](#acknowledgements)


# Install Nault
Nault can be cloned and built from source or downloaded as [latest web version](https://github.com/BitDesert/Nault/tree/gh-pages) to be run directly in your own webserver like [this Crome extension](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb?hl=en).
You can also use Nault from any device on the web at [nault.cc](https://nault.cc/) or run it as a [desktop app](https://github.com/BitDesert/Nault/releases) built on electron.


# Bugs/Feedback
If you run into any issues, please use the [GitHub Issue Tracker](https://github.com/BitDesert/Nault/issues) or head over to the [TNC Discord Server](http://discord.nanocenter.org/)!  
We are continually improving and adding new features based on the feedback you provide, so please let your opinions be known!

___

#### Everything below is only for contributing to the development of Nault
#### To download Nault as a desktop app go to the [releases section](https://github.com/BitDesert/Nault/releases), or use the web wallet at [nault.cc](https://nault.cc/)

___

# Application Structure

- [Nault](https://github.com/BitDesert/Nault) - The main wallet application (UI + Seed Generation/Block Signing/Etc).
- Communication with the network is done via Nano RPC and Websocket protocols, private or public on any nano network.


# Development Prerequisites
- Node Package Manager: [Install NPM](https://www.npmjs.com/get-npm)
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

If you have found Nault useful and are feeling generous, you can donate at `nano_3niceeeyiaa86k58zhaeygxfkuzgffjtwju9ep33z9c8qekmr3iuc95jbqc8`
