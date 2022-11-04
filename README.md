# chronicle-consumer: a Node.js library for Chronicle data processing

The library allows an application receive real-time notifications or
historical data from an EOSIO blockchain, such as Telos, EOS, WAX,
Lynxchain, Europechain, and many others.

This development is sponsored by [Telos
blockchain](https://www.telos.net/) community as part of [Worker
Proposal #95](https://chainspector.io/governance/worker-proposals/95).

[Chronicle](https://github.com/EOSChronicleProject/eos-chronicle) is a
software package for receiving and decoding the data flow that is
exported by `state_history_plugin` of `nodeos`, the blockchain node
daemon [developed by Block One](https://developers.eos.io/).

State history contains all data about transaction traces and rows
added or deleted in smart contract memory. It exports this data in
binary form, and the binary flow needs to be decoded using the
contract ABI. That's what Chronicle is doing, and it exports the data
as JSON ojects.

The `chronicle-consumer` module lets you build a consumer process for
Chronicle export and react on blockchain updates as your application
needs.

["tests" folder in chronicle-consumer
repository](https://github.com/EOSChronicleProject/chronicle-consumer-npm/tree/master/tests)
and the [examples
repository](https://github.com/EOSChronicleProject/chronicle-consumer-npm-examples)
provide practical examples on using the library.


## Installing

```
npm install chronicle-consumer
```

## Usage

Chronicle sets a default number of unacknowledged blocks to 1000,
which due to asynchronous manner of nodejs will generate a large queue
of pending messages within the nodejs process. It is recommended to
use a lower value in Chronicle configuration, such as
`exp-ws-max-unack = 200`.

The module defines an event emitter class, and your application
subscribes to events of interest.

The consumer process opens a Websocket server on a specified port, and
this server accepts only one connection from Chronicle. If you need to
process multiple streams of Chronicle data, you need to create
multiple server instances using different TCP port numbers.

The module allows one of two modes of operation: synchronous and
asynchronous. Default mode is synchronous, so that events are emitted
synchronously and are not expected to fire any asynchronous tasks.

In asynchronous mode, event handlers are expected to return promise
objects which would eventually resolve. The handler of `ackBlock`
event should return a promise that resolves when all asynchronous
tasks resolve. See `tests/async_slow.js` for a reference.

If asynchronous processing is potentially taking a significant time,
such as writing to a slow database, the nodejs process may run out of
memory due to too many pending requests. In this case, it is
recommended to specify a higher memory limits in nodejs process, as
follows: `node --max-old-space-size=4096 app.js`.

Synchronous mode:

```
const ConsumerServer = require('chronicle-consumer');

const server = new ConsumerServer({port: 8899});

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

server.start();
```

Asynchronous mode, with random timers:

```
const ConsumerServer = require('chronicle-consumer');

function _delay() {return Math.floor(Math.random()*10000);}

const setTimeoutPromise = util.promisify(setTimeout);

var pendingTasks = new Array();

const server = new ConsumerServer({port: 8899, async: true});

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

server.on('blockCompleted', function(data) {
    pendingTasks.push(setTimeoutPromise(_delay(), data).then((data) => {
        console.log('block completed: ' + data['block_num']);
    }));
});

server.on('ackBlock', function(bnum) {
    console.log('ack: ' + bnum);
    return Promise.all(pendingTasks).then(() => {
        pendingTasks = new Array();
        console.log('ack: ' + bnum + ' all pending tasks finished');
    });
});
```


## Constructor

The constructor takes an object representing options for the
server. Only the `port` option is mandatory, indicating the TCP port
tpo listen to.

`host` defines the IP address to bind the server to. Default is
`0.0.0.0` (meaning Chronicle can connect from anywhere). It is
recommended to secure this connection, and use `127.0.0.1` if
applicable.

`ackEvery` defines how frequently the process sends acknowledgements
to Chronicle, in blocks. All blocks that have not been acknowledged
are discarded by Chronicle on next restart. By default, Chronicle
pauses sending the data as soon as 1000 blocks have not been
acknowledged. It's not recommended to set `ackEvery` too low, as it
adds overhead in processing. Values of 10 to 100 are
reasonable. Default value is 100. It is also recommended to lower the
default setting in Chronicle, such as `exp-ws-max-unack = 200`.

`interactive`, if set to `true`, turns the consumer in nteractive
mode. Correspondingly, Chronicle process should also be started in
interactive mode. In this mode, instead of a constant stream of
blo0ckchain data, the process needs to request a block range from
Chronicle, by using `async requestBlocks(start, end)` method.

`async`, if set to `true`, the emitter works in asynchronous mode
(using Emittery module).

The constructor does not start the websocket server. Once you
subscribe to events using `on` method, you need to call the `start()`
method.


## `start()`

The `start()` method creates a websocket server that should listen on
the specified TCP port.

## `stop()`

This method closes the websocket server.

## `async requestBlocks(start, end)`

The method is only applicable to interactive mode, and it requests a
range of blocks from Chronicle. The process does not need to wait for
full delivery of block data, and multiple ranges can be requested in a
row.


## Events

In synchronous mode, all events are emitted sequentially, in order to
guarantee the exactly the same order of execution as transactions are
executed on the blockchain.

In asynchronous mode, the order of execution cannot be guaranteed, so
the program should take into account that transactions and table
deltas will be mixed up between the blocks and within each block. Also
`blockCompleted` event, although emitted, does not have any sense in
asynchronous mode.

It is important to understand the workflow: the consumer process
acknowledges block numbers to Chronicle, and it must acknowledge only
the blocks that have been properly processed. If the data is written
to a database, all data needs to be committed prior to sending the
acknowledgement.

It is also important to understand forks in EOSIO blockchains: due to
geographical distance and network conditions, the handover between
block producers may result in one or several blocks re-produced by the
next BP in the schedule. This creates a microfork: the block that was
previously signed is no longer valid, and a new block with the same
number is generated. Once 2/3+1 producers have validated a block, it
becomes irreversible and final.

Also when Chronicle process starts, it emits an explicit FORK event
indicating that it may have erased blocks that were not acknowledged,
and a new block data is coming.


### Event: `fork`

Event data: an opject with the following fields:

* `block_num`: block number that is invalidated, as well as all blocks
  past this one.

* `depth`: informative field indicating the number of blocks being
  invalidated. Do not rely on this number.

* `fork_reason`: informative field indicating why the event was
 emitted: `network` (fork occurred in the EOSIO network), `restart`
 (explicit fork on Chronicle restart), `resync` (full resync from the
 genesis).

* `last_irreversible`: last irreversible block number.

Upon receiving a `fork` event, the application must erase all
previously received data for the fork block and all blocks past
it. Subsequent events will have the new data for the block number that
was indicated in the fork event.

In asynchronous mode, the event handler must return a promise that
resolves when the data cleanup finishes.


### Event: `block`

It is recommended to disable block events by using `skip-block-events
= true` in Chronicle configuration. The event data is a full JSON
representation of a raw blockchain block. This data is bulky and
CPU-intensive, and rarely used.


### Event: `tx`

The event represents a single transaction with a full trace of its all
inline actions.

Event data: an opject with the following fields:

* `block_num`: block number.

* `block_timestamp`: block timestamp in UTC time zone in EOSIO
  timestamp notation.

* `trace`: full transaction trace, similar to that returned by
  Hyperion or legacy history plugin. It includes all inline actions
  and receipts. Important members are:
  
  * `id` containing the transaction identifier,
  
  * `status` which is set to `executed` if a transaction was successful,
  
  * `action_traces` which is an array of action traces,
  

It is practical to ignore notifications caused by
`require_recipient()` call in the smart contracts. In order to skip
them, you only process action traces where recipient is equal to the
contract account:

```
    if(atrace.receipt.receiver == atrace.act.account) {
    ....
    }
```


### Event: `abi`

The event indicates that a smart contract has updated its ABI, with
the full copy of ABI in the event data.

### Event: `abiRemoved`

The event indicates that a smart contract has removed ots ABI.

### Event: `abiError`

The event indicates that there was an error processing the ABI in
Chronicle. It typically indicates that invalid data types are used in
it.


### Event: `tableRow`

The event indicates that a table row is added, modified or deleted in
a smart contract within a specified block. Unfortunately there is no
way to associate it with a transaction ID.

The event data is an object as follows:

* `block_num`: block number.

* `block_timestamp`: block timestamp in UTC time zone in EOSIO
  timestamp notation.

* `added`: boolean. If set to `false`, the row has been
  deleted. Otherwise it was inserted or updated.

* `kvo`: key-value object with the following fields:

  * `code`: contract account,

  * `scope`: table scope in name representation,

  * `table`: table name,

  * `primary_key`: 64-bit integer primary key, identfying the row,

  * `payer`: account name charged for the row memory,

  * `value`: an object representing the row structure. If ABI is
    invalid or unavailable, value is presented as a hexademical
    string with raw byte contents.


### Event: `encoderError`

The event is reporting internal errors if they occur during the
processing of state history.


### Event: `pause`

The event indicates that Chronicle has paused receiving the data from
state history plugin because there were no acknowledgements for
blocks, exceeding the maximum number of unacknowledged blocks.

The application normally does not need to subscribe to this event.


### Event: `blockCompleted`

In synchronous mode, this is the last in the sequence of events that
are emitted for a specific block number. It is guaranteed that there
will not be new events for this block, unless there is a fork.

In asynchronous mode this event does not make any sense, and the
application is not expected to subscribe to it.

Data fields:

* `block_num`: block number.

* `block_timestamp`: block timestamp in UTC time zone in EOSIO
  timestamp notation.

* `block_id`: 32-byte block identifyer (SHA256 of block contents).

* `last_irreversible`: last irreversible block number.


### Events: `permission`, `permissionLink`, `accMetadata`

These events indicate updates in account information that is not part
of contract data.

`permission` reports an update in public key or permission definition
for an account.

`permissionLink` indicates that a particular permission is allowed to
execute an action on a smart contract.

`accMetadata` contains `code_hash` field which indicates that either a
new smart contract code is uploaded, or the code was deleted.


### Event: `ackBlock`

The event data is the block number that is about to be acknowledged
back to Chronicle.

In synchronous mode, the application should commit all written data to
nonvolatile storage (or commit data to an SQL server and finish a
transaction).

In asynchronous mode, the handler should return a promise that
resolves only when all the previously received data is processed and
committed.

### Events: `connected`, `disconnected`

The events indicate that a Chronicle process has opened or closed a
websocket connection to the consumer process. The event data is an
object with fields as follows:

* `remoteAddress`: the IPv4 or IPv6 address of the Chronicle process;
* `remoteFamily`: `IPv4` or `IPv6`;
* `remotePort`: TCP port number of remote side.





# License and copyright

Copyright 2020 cc32d9@gmail.com

```
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```