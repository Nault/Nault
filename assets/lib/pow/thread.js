self.importScripts('pow.js');

var ready = false;

Module['onRuntimeInitialized'] = function() {
  postMessage('ready');
};

onmessage = function(ev) {
  var PoW = Module.cwrap("launchPoW", 'string', ['string']);
  var hash = ev.data;
  //let generate = Module.ccall("launchPoW", 'string', ['string'], hash);
  var generate = PoW(hash);

  if (generate != "0000000000000000") {
    postMessage(generate); // Worker return
  } else {
    postMessage(false);
  }
};
