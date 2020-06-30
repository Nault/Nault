const NanoCurrency = require('nanocurrency')
// When the parent theard requires it, render the HTML
self.addEventListener("message", async (message) => {
  //TODO: Pass threshold to nanocurrency lib once supported
  const { blockHash, workerIndex, workerCount } = message.data;
  const result = await NanoCurrency.computeWork(blockHash, { workerIndex, workerCount });
  self.postMessage(result);
});