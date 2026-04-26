// server/src/engines/matrixEngine.js
const fs = require('fs');
const { normalizeText, makeCaseKey } = require('../utils/normalize');

class MatrixEngine {
  constructor(ruleEngine) {
    this.version = ruleEngine.version || 'unknown';
    this.strictMatching = ruleEngine.strict_matching !== false;
    this.defaultRule = ruleEngine.default_escalation_rule;
    this.rules = Array.isArray(ruleEngine.rules) ? ruleEngine.rules : [];
    this.notes = Array.isArray(ruleEngine.notes) ? ruleEngine.notes : [];
    this.index = this.buildIndex(this.rules);
  }

  static fromFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return new MatrixEngine(JSON.parse(raw));
  }

  buildIndex(rules) {
    const byCaseKey = new Map();
    const byChannelIssue = new Map();
    const byIssue = new Map();
    const byId = new Map();

    for (const rule of rules) {
      const channel = normalizeText(rule.channel || 'Ticket');
      const issue = normalizeText(rule.issue || '');
      const section = normalizeText(rule.section || rule.category || '');
      const caseKey = normalizeText(rule.key || makeCaseKey(rule.channel, rule.issue));
      byCaseKey.set(caseKey, rule);
      byChannelIssue.set(`${channel}::${issue}`, rule);
      if (!byIssue.has(issue)) byIssue.set(issue, []);
      byIssue.get(issue).push(rule);
      byId.set(rule.id, rule);
      rule.__index = { channel, issue, section, caseKey };
    }

    return { byCaseKey, byChannelIssue, byIssue, byId };
  }

  reload(ruleEngine) {
    this.version = ruleEngine.version || this.version;
    this.strictMatching = ruleEngine.strict_matching !== false;
    this.defaultRule = ruleEngine.default_escalation_rule;
    this.rules = Array.isArray(ruleEngine.rules) ? ruleEngine.rules : [];
    this.notes = Array.isArray(ruleEngine.notes) ? ruleEngine.notes : [];
    this.index = this.buildIndex(this.rules);
  }

  getRuleById(id) {
    return this.index.byId.get(id) || null;
  }

  listRules() {
    return this.rules.map(({ __index, ...rule }) => rule);
  }

  match(ticket) {
    const channel = normalizeText(ticket.channel || 'Ticket');
    const issue = normalizeText(ticket.issue || ticket.issueType || '');
    const section = normalizeText(ticket.section || ticket.category || '');
    const caseKey = normalizeText(ticket.caseKey || makeCaseKey(ticket.channel || 'Ticket', ticket.issue || ticket.issueType || ''));

    const caseKeyRule = this.index.byCaseKey.get(caseKey);
    if (caseKeyRule) return this.formatMatch(caseKeyRule, 'CASE_KEY_EXACT', 1, ticket);

    const channelIssueRule = this.index.byChannelIssue.get(`${channel}::${issue}`);
    if (channelIssueRule) {
      const ruleSection = normalizeText(channelIssueRule.section || channelIssueRule.category || '');
      if (!section || section === ruleSection) {
        return this.formatMatch(channelIssueRule, 'CHANNEL_ISSUE_EXACT', 1, ticket);
      }
      return this.defaultEscalation(ticket, 'CATEGORY_MISMATCH_REQUIRES_HUMAN_CONFIRMATION', [channelIssueRule]);
    }

    const sameIssueRules = this.index.byIssue.get(issue) || [];
    if (sameIssueRules.length === 1 && !this.strictMatching) {
      return this.formatMatch(sameIssueRules[0], 'ISSUE_EXACT_NON_STRICT', 0.99, ticket);
    }
    if (sameIssueRules.length > 0) {
      return this.defaultEscalation(ticket, 'CHANNEL_OR_CATEGORY_MISMATCH', sameIssueRules);
    }

    return this.defaultEscalation(ticket, 'NO_STRICT_MATRIX_RULE_FOUND', this.suggestRules(ticket));
  }

  suggestRules(ticket) {
    const text = normalizeText(`${ticket.issue || ''} ${ticket.subject || ''} ${ticket.description || ''}`);
    if (!text) return [];
    const tokens = new Set(text.split(' ').filter(Boolean));
    return this.rules
      .map((rule) => {
        const ruleTokens = new Set(normalizeText(`${rule.issue} ${rule.section}`).split(' ').filter(Boolean));
        let overlap = 0;
        for (const token of tokens) if (ruleTokens.has(token)) overlap += 1;
        return { rule, overlap };
      })
      .filter((x) => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 5)
      .map((x) => x.rule);
  }

  formatMatch(rule, matchType, confidence, ticket) {
    return {
      matched: true,
      matchType,
      confidence,
      safeToAutoResolve: rule.automation_policy !== 'human_approval_required' && confidence === 1,
      rule: this.stripInternal(rule),
      defaultedToHuman: false,
      input: this.safeTicket(ticket),
    };
  }

  defaultEscalation(ticket, reason, suggestions = []) {
    return {
      matched: false,
      matchType: reason,
      confidence: 0,
      safeToAutoResolve: false,
      rule: this.defaultRule,
      defaultedToHuman: true,
      suggestions: suggestions.map((rule) => this.stripInternal(rule)),
      input: this.safeTicket(ticket),
    };
  }

  stripInternal(rule) {
    const { __index, ...safeRule } = rule;
    return safeRule;
  }

  safeTicket(ticket) {
    return {
      id: ticket.id || ticket.ticketId || null,
      channel: ticket.channel || 'Ticket',
      section: ticket.section || ticket.category || null,
      issue: ticket.issue || ticket.issueType || null,
      subject: ticket.subject || null,
    };
  }
}

module.exports = { MatrixEngine };
