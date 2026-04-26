// server/src/routes/solve.routes.js
const express = require('express');
const { requireApiKey } = require('../middleware/auth');
const { createSolveController } = require('../controllers/solve.controller');

function solveRoutes(engineRef) {
  const router = express.Router();
  const controller = createSolveController(engineRef);
  router.post('/one-click', requireApiKey('agent'), controller.startSolve);
  router.get('/stream/:runId', controller.streamSolve);
  router.get('/runs/:runId', controller.getRun);
  router.get('/demo-tickets', controller.demoTickets);
  return router;
}

module.exports = { solveRoutes };
