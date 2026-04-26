// server/src/config/env.js
const path = require('path');
require('dotenv').config();

const root = path.resolve(__dirname, '..', '..');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  adminApiKey: process.env.ADMIN_API_KEY || 'dev-admin-key',
  agentApiKey: process.env.AGENT_API_KEY || 'dev-agent-key',
  zendesk: {
    baseUrl: process.env.ZENDESK_BASE_URL || '',
    email: process.env.ZENDESK_EMAIL || '',
    apiToken: process.env.ZENDESK_API_TOKEN || '',
    webhookSecret: process.env.ZENDESK_WEBHOOK_SECRET || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    enabled: String(process.env.LLM_ENABLED || 'false').toLowerCase() === 'true',
  },
  hotelplanner: {
    reservationApiUrl: process.env.HP_RESERVATION_API_URL || '',
    reservationApiKey: process.env.HP_RESERVATION_API_KEY || '',
    refundApiUrl: process.env.HP_REFUND_API_URL || '',
    refundApiKey: process.env.HP_REFUND_API_KEY || '',
    supplierApiUrl: process.env.HP_SUPPLIER_API_URL || '',
    supplierApiKey: process.env.HP_SUPPLIER_API_KEY || '',
  },
  paths: {
    ruleEngine: path.resolve(root, process.env.RULE_ENGINE_PATH || 'src/data/rule-engine.json'),
    adminConfig: path.resolve(root, process.env.ADMIN_CONFIG_PATH || 'src/data/admin-config.json'),
    auditLog: path.resolve(root, process.env.AUDIT_LOG_PATH || 'src/data/audit-log.jsonl'),
  },
};

module.exports = { env };
