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
    
    for(let i=0; i< data.trace.action_traces.length; i++) {
        let trace = data.trace.action_traces[i];
        if(trace.receipt.receiver == trace.act.account) {
            if(trace.act.name == 'transfer') {
                if(!tx_printed) {
                    console.log('tx: ' + data.trace.id);
                    tx_printed = true;
                }

                let d = trace.act.data;
                
                console.log(' ' + trace.act.account + ' ' +
                            d.from + '->' +
                            d.to + ': ' +
                            d.quantity);
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
