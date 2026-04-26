// server/src/services/audit.service.js
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const { redactSensitive } = require('../utils/normalize');

function appendAudit(event) {
  const dir = path.dirname(env.paths.auditLog);
  fs.mkdirSync(dir, { recursive: true });
  const safe = JSON.parse(JSON.stringify(event, (_, value) => {
    if (typeof value === 'string') return redactSensitive(value);
    return value;
  }));
  fs.appendFileSync(env.paths.auditLog, JSON.stringify({ ...safe, at: new Date().toISOString() }) + '\n');
}

function readAudit(limit = 50) {
  if (!fs.existsSync(env.paths.auditLog)) return [];
  return fs.readFileSync(env.paths.auditLog, 'utf8')
    .split('\n')
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

module.exports = { appendAudit, readAudit };
