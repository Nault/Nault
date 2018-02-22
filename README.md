# NanoVault

NanoVault is a fully client-side signing wallet for sending and receiving [Nano](https://github.com/nanocurrency/raiblocks) 
on your [Windows/Mac/Linux](https://github.com/cronoh/nanovault/releases) or online at [https://nanovault.io](https://nanovault.io)

![RaiVault Desktop Screenshot](https://s3-us-west-2.amazonaws.com/nanovault.io/Desktop-Preview.png)
![RaiVault Mobile Screenshot](https://s3-us-west-2.amazonaws.com/nanovault.io/Mobile-Preview.png)

# Install NanoVault

NanoVault can be used on the web at [nanovault.io](https://nanovault.io) or on your desktop (Windows/Mac/Linux).

To install the desktop version, head over to the [releases section](https://github.com/cronoh/nanovault/releases) and download the latest version of the application for your OS to get started!

___

# Table of Contents
* [Install](#install-nanovault)
* [Development Prerequisites](#development-prerequisites)
* [Application Structure](#application-structure)
* [Development Guide](#development-guide)

# Install NanoVault
NanoVault is available on your desktop (Windows/Mac/Linux) - just head over to the [releases section](https://github.com/cronoh/nanovault/releases) and download the latest version for your OS.

You can also use NanoVault from the web at [nanovault.io](https://nanovault.io)

___

#### Everything below is only for contributing to the development of NanoVault
#### To download NanoVault go to the [releases section](https://github.com/cronoh/nanovault/releases), or use the web wallet at [nanovault.io](https://nanovault.io)

___


# Development Prerequisites
- Node Package Manager: [Install NPM](https://www.npmjs.com/get-npm)
- Angular CLI: `npm install -g @angular/cli`


# Application Structure

The application is broken into a few separate pieces:

- NanoVault - The main UI for the wallet
- NanoVault-Server - Brokers public communication between the wallet UI and the Nano Node
- NanoVault-WS - Receives new blocks from the Nano node and sends them in real time to the wallet ui.


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

