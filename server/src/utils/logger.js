// server/src/utils/logger.js
const { redactSensitive } = require('./normalize');

function log(level, message, meta = {}) {
  const safeMeta = JSON.parse(JSON.stringify(meta, (_, value) => {
    if (typeof value === 'string') return redactSensitive(value);
    return value;
  }));
  console.log(JSON.stringify({ level, message, meta: safeMeta, at: new Date().toISOString() }));
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
