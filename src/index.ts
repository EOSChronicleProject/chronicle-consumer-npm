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
  private tasksQueue = new Array();

  constructor(opts: {
    port: number,
    host?: string,
    ackEvery?: number
    interactive?: boolean
    async?: boolean
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

    this.server = new WebSocket.Server({ host: this.wsHost, port: this.wsPort, clientTracking: true });
    this.server.on('connection', this._onConnection.bind(this));
  }

  stop() {
    this.server?.close();
    this.server?.clients?.forEach((c) => {
      c.terminate();
    });
    console.log('Stopped Chronicle consumer on ' + this.wsHost + ':' + this.wsPort);
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

      const emit_res = this.emitter.adapter.emit(event, msg);
      if (this.async) {
        this.tasksQueue.push(emit_res);
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

      if (do_ack && !this.interactive) {
        if (this.async) {
          const ack_task = this._async_ack(this.confirmed_block, this.tasksQueue);
          this.tasksQueue = new Array();
          this.tasksQueue.push(ack_task);
        }
        else {
          this._sync_ack(this.confirmed_block);
        }
      }
    });
  }

  async _async_ack(ack_block_number, tasks) {
    await Promise.all(tasks);
    await this.emitter.adapter.emit('ackBlock', ack_block_number);
    this.chronicleConnection?.send(ack_block_number.toString(10));
  }

  _sync_ack(ack_block_number) {
    this.emitter.adapter.emit('ackBlock', ack_block_number);
    this.chronicleConnection?.send(ack_block_number.toString(10));
  }
}



module.exports = ConsumerServer;


/*
 Local Variables:
 mode: javascript
 js-indent-level: 2
 indent-tabs-mode: nil
 End:
*/
