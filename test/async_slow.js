'use strict';

const program = require('commander');
const ConsumerServer = require('..');
const util = require('util');

program
    .option('--host [value]', 'Binding address', '0.0.0.0')
    .option('--port [value]', 'Websocket server port', '8855')
    .option('--ack [value]', 'Ack every X blocks', '10')
    .option('--maxdelay [value]', 'maximum delay in milliseconds', 10000)
    .parse(process.argv);


function _delay() {return Math.floor(Math.random()*program.maxdelay);}


const server = new ConsumerServer({host: program.host,
                                   port: program.port,
                                   ackEvery: program.ack,
                                   async: true});

const setTimeoutPromise = util.promisify(setTimeout);

let acked_block = 0;

server.on('fork', function(data) {
    let block_num = data['block_num'];
    console.log('fork: ' + block_num + ' *');
});



server.on('tx', function(data) {
    return setTimeoutPromise(_delay(), data).then((data) => {
        if( data.block_num <= acked_block ) {
            console.error('acked too early: ' + acked_block);
            process.exit(1);
        }
    });
});



server.on('tableRow', function(data) {
    return setTimeoutPromise(_delay(), data).then((data) => {
        if( data.block_num <= acked_block ) {
            console.error('acked too early: ' + acked_block);
            process.exit(1);
        }
    });
});





server.on('pause', function(data) {
    let block_num = data['head'];
    console.log('pause: ' + block_num);
});


server.on('ackBlock', function(bnum) {
    acked_block = bnum;
    console.log('ack: ' + bnum + ' queue: ' + server.tasksQueue.length);
});


server.on('connected', function(data) {
    console.log('CONNECTED: ' + JSON.stringify(data));
});

server.on('disconnected', function(data) {
    console.log('DISCONNECTED: ' + JSON.stringify(data));
});


server.start();
console.log('started');
