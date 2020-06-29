/* SystemJS module definition */
declare var module: NodeModule;
declare module 'worker-loader!*' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
interface NodeModule {
  id: string;
}

interface Window {
  require: NodeRequire;
}
