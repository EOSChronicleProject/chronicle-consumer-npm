import WebSocket from "ws";
import EventEmitter from "events";
import Emittery from "emittery";

type EmitterType = {
  type: 'sync'
  adapter: EventEmitter
} | {
  type: 'async'
  adapter: Emittery
}
class ConsumerServer<T extends WebSocket = WebSocket> {
  private wsPort: number;
  private wsHost: string
  private ackEvery: number;
  private interactive: boolean;
  private async: boolean;
  private emitter: EmitterType; // Emittery or EventEmitter   
  private typemap = new Map<number, string>(); // @TODO: narrow down the values 
  private confirmed_block: number;
  private unconfirmed_block: number;
  private server?: WebSocket.Server<T>;
  private chronicleConnection?: T
  private asyncTasksInProcessingCounter = 0;
  private asyncMaxTasksThreshold: number | undefined;


  constructor(opts: {
    port: number,
    host?: string,
    ackEvery?: number
    interactive?: boolean
    async?: boolean
    asyncMaxTasksThreshold?: number
  }) {
    if (!opts.port) {
      throw Error("port not defined");
    }

    this.wsPort = opts.port;

    this.wsHost = '0.0.0.0';
    if (opts.host) {
      this.wsHost = opts.host;
    }

    this.ackEvery = 100;
    if (opts.ackEvery) {
      this.ackEvery = opts.ackEvery;
    }

    this.interactive = false;
    if (opts.interactive) {
      this.interactive = true;
    }

    if (opts.async) {
      this.async = true;
      this.emitter = {
        type: 'async',
        adapter: new Emittery()
      }
      if (opts.asyncMaxTasksThreshold) {
        this.asyncMaxTasksThreshold = opts.asyncMaxTasksThreshold;
      } else {
        throw new Error("must define `asyncMaxTasksThreshold` in async mode")
      }
    } else {
      this.async = false;
      this.emitter = {
        type: 'sync',
        adapter: new EventEmitter()
      }
    }



    this.typemap = new Map();
    this.typemap.set(1001, 'fork');
    this.typemap.set(1002, 'block');
    this.typemap.set(1003, 'tx');
    this.typemap.set(1004, 'abi');
    this.typemap.set(1005, 'abiRemoved');
    this.typemap.set(1006, 'abiError');
    this.typemap.set(1007, 'tableRow');
    this.typemap.set(1008, 'encoderError');
    this.typemap.set(1009, 'pause');
    this.typemap.set(1010, 'blockCompleted');
    this.typemap.set(1011, 'permission');
    this.typemap.set(1012, 'permissionLink');
    this.typemap.set(1013, 'accMetadata');

    this.confirmed_block = 0;
    this.unconfirmed_block = 0;
  }

  start() {
    console.log('Starting Chronicle consumer on ' + this.wsHost + ':' + this.wsPort);
    console.log('Acknowledging every ' + this.ackEvery + ' blocks');

    this.server = new WebSocket.Server({ host: this.wsHost, port: this.wsPort });
    this.server.on('connection', this._onConnection.bind(this));
  }

  stop() {
    this.server?.close();
  }

  on(eventName, listener) { return this.emitter.adapter.on(eventName, listener) }
  off(eventName, listener) { return this.emitter.adapter.off(eventName, listener) }
  once(eventName, listener) { return this.emitter.adapter.once(eventName, listener) }


  async requestBlocks(start, end) {
    if (!this.interactive) {
      throw Error('requestBlocks can only be called in interactive mode');
    }

    if (start > end) {
      throw Error('start block should not be lower than end');
    }

    this.chronicleConnection?.send(start.toString(10) + '-' + end.toString(10));
  }

  closeHandler(socket, emitDisconnect = true) {
    try {
      socket.close();
    } catch (err) {
      console.error('Graceful close of websocket threw error', err);
    } finally {
      if (emitDisconnect) {
        this['kConsumerServerClientConnected'] = false;
        this.emitter.adapter.emit('disconnected', {
          remoteAddress: socket._socket.remoteAddress,
          remoteFamily: socket._socket.remoteFamily,
          remotePort: socket._socket.remotePort
        });
      }
    }
  }

  _onConnection(socket) {
    if (this['kConsumerServerClientConnected']) {
      console.error('Rejected a new Chronicle connection because one is active already');
      return this.closeHandler(socket, false);
    }

    this['kConsumerServerClientConnected'] = true;
    this.chronicleConnection = socket;
    this.emitter.adapter.emit('connected', {
      remoteAddress: socket._socket.remoteAddress,
      remoteFamily: socket._socket.remoteFamily,
      remotePort: socket._socket.remotePort
    });

    socket.on('close', () => {
      console.log('Graceful close of Chronicle connection initiated');
      this.closeHandler(socket);
    });

    socket.on('error', () => {
      console.error('Error close of Chronicle connection initiated');
      this.closeHandler(socket);
    });

    socket.on('message', (data) => {
      const msgType = data.readInt32LE(0);
      const opts = data.readInt32LE(4);
      const msg = JSON.parse(data.toString('utf8', 8));

      const event = this.typemap.get(msgType);
      if (!event) {
        throw Error('Unknown msgType: ' + msgType);
      }

      const res = this.emitter.adapter.emit(event, msg);
      if (this.async) {
        if (typeof res === 'boolean') throw new Error("in async mode res should be a promise, not boolean")

        // once promise comes in -- increment the counter
        this.asyncTasksInProcessingCounter++;
        // console.log("tasksTracker: consumerModule: counter incr: event+traceId:", `${event}+${msg?.trace?.id}`)
        res.finally(() => {
          // console.log("tasksTracker: consumerModule: counter decr: event+traceId:", `${event}+${msg?.trace?.id}`)
          // once promise is resolved -- decrement the counter
          if (this.asyncTasksInProcessingCounter === this.asyncMaxTasksThreshold) {
            // if going below threshold, enforce ack
            // console.log("enforcing ack signal because threshold surpassed")
            this._async_ack(this.confirmed_block);
          }
          this.asyncTasksInProcessingCounter--;
        });
      }

      let block_num;
      let do_ack = false;
      switch (msgType) {

        case 1010:           /* BLOCK_COMPLETED */
          block_num = msg['block_num'];
          this.unconfirmed_block = block_num;
          if (this.unconfirmed_block - this.confirmed_block >= this.ackEvery) {
            this.confirmed_block = block_num;
            do_ack = true;
          }
          break;

        case 1001:           /* FORK */
          block_num = msg['block_num'];
          this.confirmed_block = block_num - 1;
          this.unconfirmed_block = block_num - 1;
          do_ack = true;
          break;
      }

      if (do_ack) {
        if (this.async) {

          if (!this.asyncMaxTasksThreshold) throw new Error("asyncMaxTasksThreshold must be defined in async mode")

          if (this.asyncTasksInProcessingCounter >= this.asyncMaxTasksThreshold) {
            // console.log("received ack signal but not sending ack, because threshold not passed: this.asyncTasksInProcessingCounter >= this.asyncMaxTasksThreshold", `${this.asyncTasksInProcessingCounter} >= ${this.asyncMaxTasksThreshold}`)
            return;
          } else {
            // console.log("received ack signal and sending ack, because threshold passed: this.asyncTasksInProcessingCounter >= this.asyncMaxTasksThreshold", `${this.asyncTasksInProcessingCounter} >= ${this.asyncMaxTasksThreshold}`)
          }
          // if we're here, then we're ready to send ack
          this._async_ack(this.confirmed_block);
        }
        else {
          this._sync_ack(this.confirmed_block);
        }
      }
    });
  }

  async _async_ack(ack_block_number) {
    if (!this.chronicleConnection) throw new Error('chronicleConnection must be defined')

    if (!this.interactive) {
      if (this.emitter.type !== 'async') throw new Error('emitter type must be async')

      try {
        await this.emitter.adapter.emit('ackBlock', ack_block_number);
        this.chronicleConnection.send(ack_block_number.toString(10));
      } catch (e) {
        console.error('critical error: ackBlock listener threw error')
      }

    }
  }

  _sync_ack(ack_block_number) {
    if (!this.chronicleConnection) throw new Error('chronicleConnection must be defined')

    if (!this.interactive) {
      this.emitter.adapter.emit('ackBlock', ack_block_number);
      this.chronicleConnection.send(ack_block_number.toString(10));
    }
  }
}



module.exports = ConsumerServer;
