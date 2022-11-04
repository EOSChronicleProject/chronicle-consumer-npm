
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./chronicle-consumer.cjs.production.min.js')
} else {
  module.exports = require('./chronicle-consumer.cjs.development.js')
}
