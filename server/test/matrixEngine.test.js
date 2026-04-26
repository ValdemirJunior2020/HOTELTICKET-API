// server/test/matrixEngine.test.js
const { MatrixEngine } = require('../src/engines/matrixEngine');

const fixture = {
  version: 'test',
  strict_matching: true,
  default_escalation_rule: {
    id: 'DEFAULT-HUMAN-ESCALATION',
    issue: 'Issue not strictly defined in matrix',
    required_actions: ['Route to human review'],
    automation_policy: 'human_approval_required',
  },
  rules: [
    {
      id: 'r1',
      key: 'Ticket | Reservation not found at check-in',
      channel: 'Ticket',
      section: 'Hotel & Reservation Issues',
      issue: 'Reservation not found at check-in',
      required_actions: ['Call Supplier', 'Create Voucher and Rebook'],
      routing_rules: { slack: "YES - Only for same day check in's", refund_queue: 'YES', create_ticket: 'NONE', supervisor: 'YES' },
      compliance_checks: ['Document supplier call'],
      automation_policy: 'human_approval_required',
    },
    {
      id: 'r2',
      key: 'Ticket | Asking for a refund on "REFUND PROTECTION PLAN"',
      channel: 'Ticket',
      section: 'Post Stay Issues',
      issue: 'Asking for a refund on "REFUND PROTECTION PLAN"',
      required_actions: ['Void the policy if within 14 days', 'Process RPP amount in Refund Queue if outside 14 days'],
      routing_rules: { slack: 'NO', refund_queue: 'YES', create_ticket: 'NONE', supervisor: 'NO' },
      compliance_checks: ['Refund RPP only when guest asks for it'],
      automation_policy: 'auto_draft_then_human_review',
    },
  ],
};

describe('MatrixEngine strict matching', () => {
  test('matches exact Channel + Issue + Section', () => {
    const engine = new MatrixEngine(fixture);
    const result = engine.match({ channel: 'Ticket', section: 'Hotel & Reservation Issues', issue: 'Reservation not found at check-in' });
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('CASE_KEY_EXACT');
    expect(result.confidence).toBe(1);
    expect(result.rule.id).toBe('r1');
  });

  test('defaults unknown issue to human escalation', () => {
    const engine = new MatrixEngine(fixture);
    const result = engine.match({ channel: 'Ticket', section: 'Billing', issue: 'Guest wants something not in matrix' });
    expect(result.matched).toBe(false);
    expect(result.defaultedToHuman).toBe(true);
    expect(result.rule.id).toBe('DEFAULT-HUMAN-ESCALATION');
  });

  test('does not auto-resolve when rule requires supervisor', () => {
    const engine = new MatrixEngine(fixture);
    const result = engine.match({ channel: 'Ticket', issue: 'Reservation not found at check-in' });
    expect(result.safeToAutoResolve).toBe(false);
  });

  test('can mark a strict non-supervisor rule as safe for auto plan preparation', () => {
    const engine = new MatrixEngine(fixture);
    const result = engine.match({ channel: 'Ticket', issue: 'Asking for a refund on "REFUND PROTECTION PLAN"' });
    expect(result.matched).toBe(true);
    expect(result.safeToAutoResolve).toBe(true);
  });
});
