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


server.on('block', function(data) {
    let block_num = data['block_num'];
    console.log('block: ' + block_num);
});


server.on('tx', function(data) {
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
});


server.on('abi', function(data) {
    console.log('abi: ' + data.account);
});


server.on('abiRemoved', function(data) {
    console.log('abi removed: ' + data.account);
});

server.on('abiError', function(data) {
    console.log('abi error: ' + data.account);
});


server.on('tableRow', function(data) {
    console.log('row ' + (data.added?'added':'removed') + ': ' +
                data.kvo.code + ' ' + data.kvo.scope + ' ' + data.kvo.table + ' ' +
                data.kvo.primary_key);
});


server.on('encoderError', function(data) {
    console.log('encoder error: ' + data.errors.join(' '));
});

server.on('pause', function(data) {
    let block_num = data['block_num'];
    console.log('pause: ' + block_num);
});


server.on('blockCompleted', function(data) {
    let block_num = data['block_num'];
    console.log('block completed: ' + block_num);
});


server.on('permission', function(data) {
    console.log('permission: ' + data.permission.owner + '@' + data.permission.name);
});


server.on('permissionLink', function(data) {
    console.log('permission link: ' +
                [data.permission_link.account,
                 data.permission_link.code,
                 data.permission_link.message_type,
                 data.permission_link.required_permission].join(' '));
});


server.on('accMetadata', function(data) {
    console.log('acc metadata: ' + data.account_metadata.name + ' '
                + data.account_metadata.code_metadata);
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
