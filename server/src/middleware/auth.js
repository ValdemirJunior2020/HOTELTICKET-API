// server/src/middleware/auth.js
const { env } = require('../config/env');

function requireApiKey(role = 'agent') {
  return (req, res, next) => {
    if (env.nodeEnv === 'development' && !req.headers['x-api-key']) return next();
    const key = req.headers['x-api-key'];
    const expected = role === 'admin' ? env.adminApiKey : env.agentApiKey;
    if (!key || key !== expected) {
      return res.status(401).json({ error: 'Unauthorized API key' });
    }
    return next();
  };
}

module.exports = { requireApiKey };
