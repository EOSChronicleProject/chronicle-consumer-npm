'use strict';

const program = require('commander');
const ConsumerServer = require('..');

program
    .option('--host [value]', 'Binding address', '0.0.0.0')
    .option('--port [value]', 'Websocket server port', '8855')
    .option('--ack [value]', 'Ack every X blocks', '10')
    .parse(process.argv);


const server = new ConsumerServer({host: program.host,
                                   port: program.port,
                                   ackEvery: program.ack});


server.on('fork', function(data) {
    let block_num = data['block_num'];
    console.log('fork: ' + block_num);
});




server.on('tx', function(data) {
    let tx_printed = false;
    let trace = data.trace;
    if(trace.status == 'executed') {
        for(let i=0; i< trace.action_traces.length; i++) {
            let atrace = trace.action_traces[i];
            if(atrace.receipt.receiver == atrace.act.account) {
                if(atrace.act.name == 'transfer') {
                    if(!tx_printed) {
                        console.log('tx: ' + trace.id);
                        tx_printed = true;
                    }
                    let d = atrace.act.data;
                    console.log(' ' + atrace.act.account + ' ' +
                                d.from + '->' +
                                d.to + ': ' +
                                d.quantity);
                }           
            }
        }
    }
});



server.on('blockCompleted', function(data) {
    let block_num = data['block_num'];
    console.log('block completed: ' + block_num);
});



server.on('ackBlock', function(bnum) {
    console.log('ack: ' + bnum);
});


server.on('connected', function() {
    console.log('CONNECTED');
});

server.on('disconnected', function() {
    console.log('DISCONNECTED');
});

server.start();

console.log('started');
