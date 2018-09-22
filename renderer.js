// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Allow fetch to call a local file (for pow.wasm)
require('electron').webFrame.registerURLSchemeAsPrivileged('file', { bypassCSP: true });


const Transport = require('@ledgerhq/hw-transport-u2f').default;

window.LedgerTransport = Transport;

console.log('Set the ledger transport on the window! ', window.LedgerTransport)
