// server/src/middleware/security.js
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

function applySecurity(app) {
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 180, standardHeaders: true, legacyHeaders: false }));
}

module.exports = { applySecurity };
