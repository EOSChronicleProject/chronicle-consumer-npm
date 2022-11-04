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

var pendingTasks = new Array();

server.on('fork', function(data) {
    let block_num = data['block_num'];
    console.log('fork: ' + block_num);
    
    return Promise.all(pendingTasks).then(() => {
        pendingTasks = new Array();
        console.log('fork: ' + block_num + ' all pending tasks finished');
    });
});



server.on('tx', function(data) {
    pendingTasks.push(setTimeoutPromise(_delay(), data).then((data) => {
        let trace = data.trace;
        if(trace.status == 'executed') {
            let msg = 'tx: ' + trace.id + ' ';
            for(let i=0; i< trace.action_traces.length; i++) {
                let atrace = trace.action_traces[i];
                if(atrace.receipt.receiver == atrace.act.account) {
                    msg += atrace.act.name + ' ';
                }
            }
            console.log(msg);
        }
    }));
});


server.on('tableRow', function(data) {
    pendingTasks.push(setTimeoutPromise(_delay(), data).then((data) => {
        console.log('row ' + (data.added?'added':'removed') + ': ' +
                    data.kvo.code + ' ' + data.kvo.scope + ' ' + data.kvo.table + ' ' +
                    data.kvo.primary_key);
    }));
});



          

server.on('pause', function(data) {
    let block_num = data['block_num'];
    console.log('pause: ' + block_num);
});


server.on('ackBlock', function(bnum) {
    console.log('ack: ' + bnum);
    return Promise.all(pendingTasks).then(() => {
        pendingTasks = new Array();
        console.log('ack: ' + bnum + ' all pending tasks finished');
    });
});


server.on('connected', function(data) {
    console.log('CONNECTED: ' + JSON.stringify(data));
});

server.on('disconnected', function(data) {
    console.log('DISCONNECTED: ' + JSON.stringify(data));
});


server.start();
console.log('started');
