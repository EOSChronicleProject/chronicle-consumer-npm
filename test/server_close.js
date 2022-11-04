'use strict';

const program = require('commander');
const ConsumerServer = require('..');

program
    .option('--host [value]', 'Binding address', '0.0.0.0')
    .option('--port [value]', 'Websocket server port', '8855')
    .option('--ack [value]', 'Ack every X blocks', '10')
    .option('--async', 'Run asynchronous emitter')
    .parse(process.argv);


const server = new ConsumerServer({host: program.host,
                                   port: program.port,
                                   ackEvery: program.ack,
                                   async: program.async});


server.on('fork', function(data) {
    let block_num = data['block_num'];
    console.log('fork: ' + block_num);
});


server.on('blockCompleted', function(data) {
    let block_num = data['block_num'];
    console.log('block completed: ' + block_num);
});

server.on('ackBlock', function(bnum) {
    console.log('ack: ' + bnum);
});


server.on('connected', function(data) {
    console.log('CONNECTED: ' + JSON.stringify(data));
});

server.on('disconnected', function(data) {
    console.log('DISCONNECTED: ' + JSON.stringify(data));
});

server.start();
console.log('started');

setTimeout(function() { server.stop() }, 10000);
