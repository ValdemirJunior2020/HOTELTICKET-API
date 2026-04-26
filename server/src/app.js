// server/src/app.js
const express = require('express');
const morgan = require('morgan');
const { env } = require('./config/env');
const { applySecurity } = require('./middleware/security');
const { MatrixEngine } = require('./engines/matrixEngine');
const healthRoutes = require('./routes/health.routes');
const { rulesRoutes } = require('./routes/rules.routes');
const { solveRoutes } = require('./routes/solve.routes');
const { adminRoutes } = require('./routes/admin.routes');

function createApp() {
  const app = express();
  applySecurity(app);
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined'));

  const engineRef = { engine: MatrixEngine.fromFile(env.paths.ruleEngine) };

  app.use('/api/health', healthRoutes);
  app.use('/api/rules', rulesRoutes(engineRef));
  app.use('/api/solve', solveRoutes(engineRef));
  app.use('/api/admin', adminRoutes(engineRef));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((error, req, res, next) => {
    res.status(500).json({ error: error.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
