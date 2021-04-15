declare module "worker-loader!*" {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}
declare module "*.b64" {
  const importedWasm: string;
  export default importedWasm;
}