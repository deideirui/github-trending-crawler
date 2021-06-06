const { stdChannel, runSaga } = require('little-saga')

const { run } = require('./lib')

runSaga({ channel: stdChannel() }, run)
