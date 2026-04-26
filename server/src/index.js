// server/src/index.js
const { createApp } = require('./app');
const { env } = require('./config/env');
const logger = require('./utils/logger');

const app = createApp();
app.listen(env.port, () => {
  logger.info('HotelPlanner Solver API running', { port: env.port, env: env.nodeEnv });
});
