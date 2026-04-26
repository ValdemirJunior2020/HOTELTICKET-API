// server/src/routes/admin.routes.js
const express = require('express');
const { requireApiKey } = require('../middleware/auth');
const { createSolveController } = require('../controllers/solve.controller');

function adminRoutes(engineRef) {
  const router = express.Router();
  const controller = createSolveController(engineRef);
  router.get('/config', requireApiKey('admin'), controller.getAdminConfig);
  router.put('/config', requireApiKey('admin'), controller.updateAdminConfig);
  router.get('/audit', requireApiKey('admin'), controller.audit);
  router.post('/override', requireApiKey('admin'), (req, res) => {
    res.json({ approved: true, override: req.body, at: new Date().toISOString() });
  });
  return router;
}

module.exports = { adminRoutes };
