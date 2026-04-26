// server/src/services/zendesk.service.js
const axios = require('axios');
const { env } = require('../config/env');

function authConfig() {
  if (!env.zendesk.baseUrl || !env.zendesk.email || !env.zendesk.apiToken) return null;
  return {
    baseURL: env.zendesk.baseUrl,
    auth: { username: `${env.zendesk.email}/token`, password: env.zendesk.apiToken },
  };
}

async function fetchTicket(ticketId) {
  const config = authConfig();
  if (!config) return mockTicket(ticketId);
  const response = await axios.get(`/api/v2/tickets/${ticketId}.json`, config);
  return response.data.ticket;
}

async function addInternalNote(ticketId, note) {
  const config = authConfig();
  if (!config) return { mocked: true, ticketId, note };
  const response = await axios.put(`/api/v2/tickets/${ticketId}.json`, {
    ticket: { comment: { body: note, public: false } },
  }, config);
  return response.data;
}

function mockTicket(ticketId) {
  return {
    id: ticketId || 'TKT-1482',
    channel: 'Ticket',
    section: 'Hotel & Reservation Issues',
    issue: 'Reservation not found at check-in',
    subject: 'Guest at hotel and reservation cannot be found',
    description: 'Guest is at front desk. Hotel cannot locate booking. Same day check-in.',
    requester: { name: 'Demo Guest' },
  };
}

module.exports = { fetchTicket, addInternalNote, mockTicket };
