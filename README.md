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

The module defines an event emitter class, and your application
subscribes to events of interest.

The consumer process opens a Websocket server on a specified port, and
this server accepts only one connection from Chronicle. If you need to
process multiple streams of Chronicle data, you need to create
multiple server instances using different TCP port numbers.

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
pauses sendoiong the data if 1000 bloicks have not been
acknowledged. It's not recommended to set `ackEvery` too low, as it
adds overhead in processing. Values of 10 to 100 are
reasonable. Default value is 100.

`interactive`, if set to `true`, turns the consumer in nteractive
mode. Correspondingly, Chronicle process should also be started in
interactive mode. In this mode, instead of a constant stream of
blo0ckchain data, the process needs to request a block range from
Chronicle, by using `async requestBlocks(start, end)` method.

The constructor does not start the websocket server. Once you
subscribe to events using `on` method, you need to call the `start()`
method.


## `start()`

The `start()` method creates a websocket server that should listen on
the specified TCP port.

## `async requestBlocks(start, end)`

The method is only applicable to interactive mode, and it requests a
range of blocks from Chronicle. the process does not need to wait for
full delivery of block data, and multiple ranges can be requested in a
row.


## Events

All events are emitted synhronously, in order to guarantee the exactly
the same order of execution as transactions are executed on the
blockchain.

It is important to understand the workflow: the consumer process
acknowledges block numbers to Chronicle, and it must acknowledge only
the blocks that have been properly processed. If the data is written
to a database, all data needs to be committed prior to sending the
acknowledgement.

The application may fire up asynchronous processing of events as they
get emitted, for better efficiency. In this case, it must make sure to
process the 'ackBlock' event and commit all data to nonvolatile memory
prior to returning from the event handler.

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

This is the last in the sequence of events that are emitted for a
specific block number. It is guaranteed that there will not be new
events for this block, unless there is a fork.

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
back to Chronicle. If the program performs any asynchronous
processing, it needs to wait until the asynchronous calls finish and
the data is stored to nonvolatile memory if needed, and then exit from
event handler.

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



















