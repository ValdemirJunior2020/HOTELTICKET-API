// server/src/controllers/rules.controller.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { env } = require('../config/env');
const { MatrixEngine } = require('../engines/matrixEngine');

function createRulesController(engineRef) {
  return {
    listRules(req, res) {
      res.json({ version: engineRef.engine.version, count: engineRef.engine.rules.length, rules: engineRef.engine.listRules() });
    },
    matchRule(req, res) {
      res.json(engineRef.engine.match(req.body || {}));
    },
    rebuildRules(req, res) {
      const result = spawnSync('node', [path.resolve(__dirname, '../../scripts/build-rules.js')], {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
      });
      if (result.status !== 0) {
        return res.status(500).json({ error: 'Rule rebuild failed', stderr: result.stderr, stdout: result.stdout });
      }
      engineRef.engine = MatrixEngine.fromFile(env.paths.ruleEngine);
      return res.json({ message: 'Rule engine rebuilt', stdout: result.stdout, version: engineRef.engine.version, count: engineRef.engine.rules.length });
    },
    notes(req, res) {
      res.json({ notes: engineRef.engine.notes });
    },
  };
}

module.exports = { createRulesController };
