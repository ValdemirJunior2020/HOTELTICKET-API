// server/src/utils/normalize.js
function normalizeText(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

function compactKey(value = '') {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function makeCaseKey(channel = 'Ticket', issue = '') {
  return `${String(channel || 'Ticket').trim()} | ${String(issue || '').trim()}`;
}

function redactSensitive(value = '') {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted_email]')
    .replace(/\b\d{13,19}\b/g, '[redacted_card]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted_ssn]');
}

module.exports = { normalizeText, compactKey, makeCaseKey, redactSensitive };
