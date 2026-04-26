// server/src/routes/rules.routes.js
const express = require('express');
const { requireApiKey } = require('../middleware/auth');
const { createRulesController } = require('../controllers/rules.controller');

function rulesRoutes(engineRef) {
  const router = express.Router();
  const controller = createRulesController(engineRef);
  router.get('/', controller.listRules);
  router.get('/notes', controller.notes);
  router.post('/match', requireApiKey('agent'), controller.matchRule);
  router.post('/rebuild', requireApiKey('admin'), controller.rebuildRules);
  return router;
}

module.exports = { rulesRoutes };
