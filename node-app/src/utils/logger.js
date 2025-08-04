const pino = require('pino');
const fs = require('fs');

const logStream = fs.createWriteStream('./logs/app.log', { flags: 'a' });

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  logStream
);

module.exports = logger;
