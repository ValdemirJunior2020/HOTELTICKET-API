// server/src/routes/health.routes.js
const express = require('express');
const { env } = require('../config/env');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    name: 'HotelPlanner One-Click Ticket Solver API',
    status: 'ok',
    environment: env.nodeEnv,
    llmConfigured: Boolean(env.openai.apiKey),
    llmEnabled: env.openai.enabled,
    at: new Date().toISOString(),
  });
});

module.exports = router;
