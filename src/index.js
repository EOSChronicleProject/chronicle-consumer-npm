'use strict';

const WebSocket = require('ws')

import EventEmitter from 'events';

class ConsumerServer extends EventEmitter {

    constructor(opts) {
        super();

        if(!opts.port) {
            throw Error("port not defined");
        }

        this.wsPort = opts.port;

        this.wsHost = '0.0.0.0';
        if(opts.host) {
            this.wsHost = opts.host;
        }
        
        this.ackEvery = 100;
        if(opts.ackEvery) {
            this.ackEvery = opts.ackEvery;
        }

        this.interactive = false;
        if(opts.interactive) {
            this.interactive = true;
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


    async requestBlocks(start, end) {
        if(!opts.interactive) {
            throw Error('requestBlocks can only be called in interactive mode');
        }

        if(start > end) {
            throw Error('start block should not be lower than end');
        }

        this.chronicleConnection.send(start.toString(10) + '-' + end.toString(10));
    }
    

    _onConnection(socket) {
        if(this['kConsumerServerClientConnected']) {
            WebSocket.abortHandshake(socket, 400);
            console.error('Rejected a new Chronicle connection because one is active already');
            return;
        }

        this['kConsumerServerClientConnected'] = true;
        this.chronicleConnection = socket;
        
        socket.on('close', function (data) {
            this['kConsumerServerClientConnected'] = false;
        }.bind(this));
        
        socket.on('message', function (data) {
            let msgType = data.readInt32LE(0);
            let opts = data.readInt32LE(4);
            let msg = JSON.parse(data.toString('utf8', 16));

            let event = this.typemap.get(msgType);
            if(!event) {
                throw Error('Unknown msgType: ' + msgType);
            }

            this.emit(event, msg);

            switch (code) {
                
            case 1010:           /* BLOCK_COMPLETED */
                let block_num = msg['block_num'];
                this.unconfirmed_block = block_num;
                if(this.unconfirmed_block - this.confirmed_block >= this.ackEvery) {
                    this.confirmed_block = block_num;
                    this.emit('ackBlock', block_num);
                    this._ack(this.confirmed_block);
                }
                break;
                
            case 1001:           /* FORK */
                let block_num = msg['block_num'];
                this.confirmed_block = block_num - 1;
                this.unconfirmed_block = $block_num - 1;
                this._ack(this.confirmed_block);
                break;
                
            case 1009:           /* RCVR_PAUSE */
                if(this.unconfirmed_block > this.confirmed_block) {
                    this.confirmed_block = this.unconfirmed_block;
                    this._ack(this.confirmed_block);
                }
                break;
            }

        }.bind(this));
    }

    _ack(ack_block_number) {
        if(!this.interactive) {
            this.chronicleConnection.send(ack_block_number.toString(10));
        }
    }
}
        
    

export {ConsumerServer};
