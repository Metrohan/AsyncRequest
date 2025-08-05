// require coffee if possible; js otherwise
try {
  require('coffee-script/register');
  AsyncPool = require('./src/async-pool');
}
catch (e) {
  AsyncPool = require('./lib/async-pool')
}
module.exports = AsyncPool;
