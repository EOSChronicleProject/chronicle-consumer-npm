import WebSocket from 'ws';
import EventEmitter from 'events';
import Emittery from 'emittery';

function _regeneratorRuntime() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */

  _regeneratorRuntime = function () {
    return exports;
  };

  var exports = {},
      Op = Object.prototype,
      hasOwn = Op.hasOwnProperty,
      $Symbol = "function" == typeof Symbol ? Symbol : {},
      iteratorSymbol = $Symbol.iterator || "@@iterator",
      asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
      toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }), obj[key];
  }

  try {
    define({}, "");
  } catch (err) {
    define = function (obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
        generator = Object.create(protoGenerator.prototype),
        context = new Context(tryLocsList || []);
    return generator._invoke = function (innerFn, self, context) {
      var state = "suspendedStart";
      return function (method, arg) {
        if ("executing" === state) throw new Error("Generator is already running");

        if ("completed" === state) {
          if ("throw" === method) throw arg;
          return doneResult();
        }

        for (context.method = method, context.arg = arg;;) {
          var delegate = context.delegate;

          if (delegate) {
            var delegateResult = maybeInvokeDelegate(delegate, context);

            if (delegateResult) {
              if (delegateResult === ContinueSentinel) continue;
              return delegateResult;
            }
          }

          if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
            if ("suspendedStart" === state) throw state = "completed", context.arg;
            context.dispatchException(context.arg);
          } else "return" === context.method && context.abrupt("return", context.arg);
          state = "executing";
          var record = tryCatch(innerFn, self, context);

          if ("normal" === record.type) {
            if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
            return {
              value: record.arg,
              done: context.done
            };
          }

          "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
        }
      };
    }(innerFn, self, context), generator;
  }

  function tryCatch(fn, obj, arg) {
    try {
      return {
        type: "normal",
        arg: fn.call(obj, arg)
      };
    } catch (err) {
      return {
        type: "throw",
        arg: err
      };
    }
  }

  exports.wrap = wrap;
  var ContinueSentinel = {};

  function Generator() {}

  function GeneratorFunction() {}

  function GeneratorFunctionPrototype() {}

  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });
  var getProto = Object.getPrototypeOf,
      NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);

  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function (method) {
      define(prototype, method, function (arg) {
        return this._invoke(method, arg);
      });
    });
  }

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);

      if ("throw" !== record.type) {
        var result = record.arg,
            value = result.value;
        return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
          invoke("next", value, resolve, reject);
        }, function (err) {
          invoke("throw", err, resolve, reject);
        }) : PromiseImpl.resolve(value).then(function (unwrapped) {
          result.value = unwrapped, resolve(result);
        }, function (error) {
          return invoke("throw", error, resolve, reject);
        });
      }

      reject(record.arg);
    }

    var previousPromise;

    this._invoke = function (method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function (resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
    };
  }

  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];

    if (undefined === method) {
      if (context.delegate = null, "throw" === context.method) {
        if (delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel;
        context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);
    if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
    var info = record.arg;
    return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
  }

  function pushTryEntry(locs) {
    var entry = {
      tryLoc: locs[0]
    };
    1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal", delete record.arg, entry.completion = record;
  }

  function Context(tryLocsList) {
    this.tryEntries = [{
      tryLoc: "root"
    }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
  }

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) return iteratorMethod.call(iterable);
      if ("function" == typeof iterable.next) return iterable;

      if (!isNaN(iterable.length)) {
        var i = -1,
            next = function next() {
          for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;

          return next.value = undefined, next.done = !0, next;
        };

        return next.next = next;
      }
    }

    return {
      next: doneResult
    };
  }

  function doneResult() {
    return {
      value: undefined,
      done: !0
    };
  }

  return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
    var ctor = "function" == typeof genFun && genFun.constructor;
    return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
  }, exports.mark = function (genFun) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
  }, exports.awrap = function (arg) {
    return {
      __await: arg
    };
  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    void 0 === PromiseImpl && (PromiseImpl = Promise);
    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
    return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
      return result.done ? result.value : iter.next();
    });
  }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
    return this;
  }), define(Gp, "toString", function () {
    return "[object Generator]";
  }), exports.keys = function (object) {
    var keys = [];

    for (var key in object) keys.push(key);

    return keys.reverse(), function next() {
      for (; keys.length;) {
        var key = keys.pop();
        if (key in object) return next.value = key, next.done = !1, next;
      }

      return next.done = !0, next;
    };
  }, exports.values = values, Context.prototype = {
    constructor: Context,
    reset: function (skipTempReset) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
    },
    stop: function () {
      this.done = !0;
      var rootRecord = this.tryEntries[0].completion;
      if ("throw" === rootRecord.type) throw rootRecord.arg;
      return this.rval;
    },
    dispatchException: function (exception) {
      if (this.done) throw exception;
      var context = this;

      function handle(loc, caught) {
        return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i],
            record = entry.completion;
        if ("root" === entry.tryLoc) return handle("end");

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc"),
              hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
          } else {
            if (!hasFinally) throw new Error("try statement without catch or finally");
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          }
        }
      }
    },
    abrupt: function (type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];

        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
      var record = finallyEntry ? finallyEntry.completion : {};
      return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
    },
    complete: function (record, afterLoc) {
      if ("throw" === record.type) throw record.arg;
      return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
    },
    finish: function (finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
      }
    },
    catch: function (tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];

        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;

          if ("throw" === record.type) {
            var thrown = record.arg;
            resetTryEntry(entry);
          }

          return thrown;
        }
      }

      throw new Error("illegal catch attempt");
    },
    delegateYield: function (iterable, resultName, nextLoc) {
      return this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
    }
  }, exports;
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

var ConsumerServer = /*#__PURE__*/function () {
  // Emittery or EventEmitter   
  // @TODO: narrow down the values 
  function ConsumerServer(opts) {
    this.wsPort = void 0;
    this.wsHost = void 0;
    this.ackEvery = void 0;
    this.interactive = void 0;
    this.async = void 0;
    this.emitter = void 0;
    this.typemap = new Map();
    this.confirmed_block = void 0;
    this.unconfirmed_block = void 0;
    this.server = void 0;
    this.chronicleConnection = void 0;
    this.asyncTasksInProcessingCounter = 0;
    this.asyncMaxTasksThreshold = void 0;

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
      };

      if (opts.asyncMaxTasksThreshold) {
        this.asyncMaxTasksThreshold = opts.asyncMaxTasksThreshold;
      } else {
        throw new Error("must define `asyncMaxTasksThreshold` in async mode");
      }
    } else {
      this.async = false;
      this.emitter = {
        type: 'sync',
        adapter: new EventEmitter()
      };
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

  var _proto = ConsumerServer.prototype;

  _proto.start = function start() {
    console.log('Starting Chronicle consumer on ' + this.wsHost + ':' + this.wsPort);
    console.log('Acknowledging every ' + this.ackEvery + ' blocks');
    this.server = new WebSocket.Server({
      host: this.wsHost,
      port: this.wsPort
    });
    this.server.on('connection', this._onConnection.bind(this));
  };

  _proto.stop = function stop() {
    var _this$server;

    (_this$server = this.server) == null ? void 0 : _this$server.close();
  };

  _proto.on = function on(eventName, listener) {
    return this.emitter.adapter.on(eventName, listener);
  };

  _proto.off = function off(eventName, listener) {
    return this.emitter.adapter.off(eventName, listener);
  };

  _proto.once = function once(eventName, listener) {
    return this.emitter.adapter.once(eventName, listener);
  };

  _proto.requestBlocks = /*#__PURE__*/function () {
    var _requestBlocks = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(start, end) {
      var _this$chronicleConnec;

      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (this.interactive) {
                _context.next = 2;
                break;
              }

              throw Error('requestBlocks can only be called in interactive mode');

            case 2:
              if (!(start > end)) {
                _context.next = 4;
                break;
              }

              throw Error('start block should not be lower than end');

            case 4:
              (_this$chronicleConnec = this.chronicleConnection) == null ? void 0 : _this$chronicleConnec.send(start.toString(10) + '-' + end.toString(10));

            case 5:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function requestBlocks(_x, _x2) {
      return _requestBlocks.apply(this, arguments);
    }

    return requestBlocks;
  }();

  _proto.closeHandler = function closeHandler(socket, emitDisconnect) {
    if (emitDisconnect === void 0) {
      emitDisconnect = true;
    }

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
  };

  _proto._onConnection = function _onConnection(socket) {
    var _this = this;

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
    socket.on('close', function () {
      console.log('Graceful close of Chronicle connection initiated');

      _this.closeHandler(socket);
    });
    socket.on('error', function () {
      console.error('Error close of Chronicle connection initiated');

      _this.closeHandler(socket);
    });
    socket.on('message', function (data) {
      var msgType = data.readInt32LE(0);
      data.readInt32LE(4);
      var msg = JSON.parse(data.toString('utf8', 8));

      var event = _this.typemap.get(msgType);

      if (!event) {
        throw Error('Unknown msgType: ' + msgType);
      }

      var res = _this.emitter.adapter.emit(event, msg);

      if (_this.async) {
        if (typeof res === 'boolean') throw new Error("in async mode res should be a promise, not boolean"); // once promise comes in -- increment the counter

        _this.asyncTasksInProcessingCounter++; // console.log("tasksTracker: consumerModule: counter incr: event+traceId:", `${event}+${msg?.trace?.id}`)

        res["finally"](function () {
          // console.log("tasksTracker: consumerModule: counter decr: event+traceId:", `${event}+${msg?.trace?.id}`)
          // once promise is resolved -- decrement the counter
          if (_this.asyncTasksInProcessingCounter === _this.asyncMaxTasksThreshold) {
            // if going below threshold, enforce ack
            // console.log("enforcing ack signal because threshold surpassed")
            _this._async_ack(_this.confirmed_block);
          }

          _this.asyncTasksInProcessingCounter--;
        });
      }

      var block_num;
      var do_ack = false;

      switch (msgType) {
        case 1010:
          /* BLOCK_COMPLETED */
          block_num = msg['block_num'];
          _this.unconfirmed_block = block_num;

          if (_this.unconfirmed_block - _this.confirmed_block >= _this.ackEvery) {
            _this.confirmed_block = block_num;
            do_ack = true;
          }

          break;

        case 1001:
          /* FORK */
          block_num = msg['block_num'];
          _this.confirmed_block = block_num - 1;
          _this.unconfirmed_block = block_num - 1;
          do_ack = true;
          break;
      }

      if (do_ack) {
        if (_this.async) {
          if (!_this.asyncMaxTasksThreshold) throw new Error("asyncMaxTasksThreshold must be defined in async mode");

          if (_this.asyncTasksInProcessingCounter >= _this.asyncMaxTasksThreshold) {
            // console.log("received ack signal but not sending ack, because threshold not passed: this.asyncTasksInProcessingCounter >= this.asyncMaxTasksThreshold", `${this.asyncTasksInProcessingCounter} >= ${this.asyncMaxTasksThreshold}`)
            return;
          } // if we're here, then we're ready to send ack


          _this._async_ack(_this.confirmed_block);
        } else {
          _this._sync_ack(_this.confirmed_block);
        }
      }
    });
  };

  _proto._async_ack = /*#__PURE__*/function () {
    var _async_ack2 = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(ack_block_number) {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (this.chronicleConnection) {
                _context2.next = 2;
                break;
              }

              throw new Error('chronicleConnection must be defined');

            case 2:
              if (this.interactive) {
                _context2.next = 14;
                break;
              }

              if (!(this.emitter.type !== 'async')) {
                _context2.next = 5;
                break;
              }

              throw new Error('emitter type must be async');

            case 5:
              _context2.prev = 5;
              _context2.next = 8;
              return this.emitter.adapter.emit('ackBlock', ack_block_number);

            case 8:
              this.chronicleConnection.send(ack_block_number.toString(10));
              _context2.next = 14;
              break;

            case 11:
              _context2.prev = 11;
              _context2.t0 = _context2["catch"](5);
              console.error('critical error: ackBlock listener threw error');

            case 14:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this, [[5, 11]]);
    }));

    function _async_ack(_x3) {
      return _async_ack2.apply(this, arguments);
    }

    return _async_ack;
  }();

  _proto._sync_ack = function _sync_ack(ack_block_number) {
    if (!this.chronicleConnection) throw new Error('chronicleConnection must be defined');

    if (!this.interactive) {
      this.emitter.adapter.emit('ackBlock', ack_block_number);
      this.chronicleConnection.send(ack_block_number.toString(10));
    }
  };

  return ConsumerServer;
}();

module.exports = ConsumerServer;
//# sourceMappingURL=chronicle-consumer.esm.js.map
