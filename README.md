# NanoVault

NanoVault is a fully client-side signing wallet for sending and receiving [Nano](https://github.com/nanocurrency/raiblocks) 
on your [desktop](https://github.com/cronoh/nanovault/releases) or [in your browser](https://nanovault.io)

![NanoVault Screenshot](https://s3-us-west-2.amazonaws.com/nanovault.io/NanoVault-Preview.png)
___

# Table of Contents
* [Install](#install-nanovault)
* [Bugs/Feedback](#bugsfeedback)
* [Application Structure](#application-structure)
* [Development Prerequisites](#development-prerequisites)
* [Development Guide](#development-guide)
* [Acknowledgements](#acknowledgements)


# Install NanoVault
NanoVault is available on your desktop (Windows/Mac/Linux) - just head over to the [releases section](https://github.com/cronoh/nanovault/releases) and download the latest version for your OS.

You can also use NanoVault from any device on the web at [nanovault.io](https://nanovault.io)


# Bugs/Feedback
If you run into any issues, please use the [GitHub Issue Tracker](https://github.com/cronoh/nanovault/issues) or head over to our [Discord Server](https://discord.gg/kCeAuJM)!  
We are continually improving and adding new features based on the feedback you provide, so please let your opinions be known!

To get an idea of some of the things that are planned for the near future, check out the [Road Map](https://github.com/cronoh/nanovault/wiki/Road-Map).

___

#### Everything below is only for contributing to the development of NanoVault
#### To download NanoVault go to the [releases section](https://github.com/cronoh/nanovault/releases), or use the web wallet at [nanovault.io](https://nanovault.io)

___

# Application Structure

The application is broken into a few separate pieces:

- [NanoVault](https://github.com/cronoh/nanovault) - The main wallet application (UI + Seed Generation/Block Signing/Etc).
- [NanoVault-Server](https://github.com/cronoh/nanovault-server) - Serves the Wallet UI and brokers public communication between the wallet and the Nano Node.
- [NanoVault-WS](https://github.com/cronoh/nanovault-ws) - Websocket server that receives new blocks from the Nano node and sends them in real time to the wallet ui.


# Development Prerequisites
- Node Package Manager: [Install NPM](https://www.npmjs.com/get-npm)
- Angular CLI: `npm install -g @angular/cli`


# Development Guide
#### Clone repository and install dependencies
```bash
git clone https://github.com/cronoh/nanovault
cd nanovault
npm install
```

#### Run the app
```bash
ng serve --open
```

# Build
Build a production version of the wallet:
```bash
ng build --prod
```

Build the desktop versions of the wallet:
```bash
npm run dist-full
```

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

# Acknowledgements
Special thanks to the following!
- [numtel/nano-webgl-pow](https://github.com/numtel/nano-webgl-pow) - WebGL PoW Implementation
- [jaimehgb/RaiBlocksWebAssemblyPoW](https://github.com/jaimehgb/RaiBlocksWebAssemblyPoW) - CPU PoW Implementation
- [dcposch/blakejs](https://github.com/dcposch/blakejs) - Blake2b Implementation
- [dchest/tweetnacl-js](https://github.com/dchest/tweetnacl-js) - Cryptography Implementation
