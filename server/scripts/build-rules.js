// server/scripts/build-rules.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const projectRoot = path.resolve(__dirname, '..', '..');
const inputDir = path.join(projectRoot, 'matrix-input');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'rule-engine.json');

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u200b/g, '').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

function splitActions(text) {
  const value = clean(text);
  if (!value) return [];
  const parts = value.split(/(?=(?:^|\s)\(?\d+\)?\.?\s+)/g)
    .map((part) => part.replace(/^\s*\(?\d+\)?\.?\s*/, '').trim())
    .filter(Boolean);
  return parts.length ? parts : value.split(/;\s+/).map((x) => x.trim()).filter(Boolean);
}

function activeRule(value) {
  const text = normalize(value);
  return Boolean(text && !['no', 'none', 'n a', 'na'].includes(text));
}

function inferTriggers(issue, instructions, slack, refund, ticket, supervisor) {
  const text = [issue, instructions, slack, refund, ticket, supervisor].map(clean).join(' ').toLowerCase();
  const pairs = [
    ['same day', 'same_day_check_in'],
    ['check-in', 'check_in_problem'],
    ['check in', 'check_in_problem'],
    ['20 minutes', 'supplier_unconfirmed_20_minutes'],
    ['10 minutes', 'supplier_unconfirmed_10_minutes'],
    ['15 minutes', 'voucher_unanswered_15_minutes'],
    ['supplier', 'call_supplier'],
    ['hotel', 'call_hotel'],
    ['foc', 'foc_required'],
    ['refund queue', 'refund_queue_required'],
    ['voucher', 'voucher_or_rebook'],
    ['supervisor', 'supervisor_review'],
    ['vipres', 'vipres_escalation'],
    ['legal', 'legal_or_government'],
    ['call review', 'call_review_needed'],
  ];
  const triggers = [];
  for (const [needle, trigger] of pairs) {
    if (text.includes(needle) && !triggers.includes(trigger)) triggers.push(trigger);
  }
  if (activeRule(supervisor) && !triggers.includes('supervisor_required')) triggers.push('supervisor_required');
  return triggers;
}

function complianceChecks(instructions, slack, refund, ticket, supervisor) {
  const checks = ['Issue must map to a strict matrix rule before automation; otherwise escalate to human supervisor.'];
  const text = clean(instructions).toLowerCase();
  if (text.includes('call')) checks.push('Document every call/outreach attempt and staff name/email/cancellation or confirmation number when available.');
  if (text.includes('foc')) checks.push('FOC must be requested and documented before refunding where required.');
  if (activeRule(refund)) checks.push('Refund queue must be used exactly when matrix requires it; advise approved refund timeline only when allowed.');
  if (activeRule(ticket)) checks.push('Create/route ticket only when matrix requires it.');
  if (activeRule(slack)) checks.push('Slack/channel escalation must follow matrix limits, including same-day restrictions where stated.');
  if (activeRule(supervisor)) checks.push('Supervisor/VIPRES escalation required before final automated closure.');
  return checks;
}

function makeRule({ channel, section, issue, instructions, slack, refund, ticket, supervisor, sourceFile, sheetName, rowNumber, rawCells }) {
  const safeChannel = clean(channel) || 'Ticket';
  const safeIssue = clean(issue);
  const safeSection = clean(section) || 'Uncategorized';
  const id = crypto.createHash('sha1').update(`${sourceFile}:${sheetName}:${rowNumber}:${safeChannel}:${safeIssue}`).digest('hex').slice(0, 12);
  const lowerText = `${safeIssue} ${instructions}`.toLowerCase();
  const supervisorNeeded = activeRule(supervisor) || lowerText.includes('vipres') || lowerText.includes('legal') || lowerText.includes('call review');
  return {
    id,
    key: `${safeChannel} | ${safeIssue}`,
    channel: safeChannel,
    section: safeSection,
    category: safeSection,
    issue: safeIssue,
    issue_normalized: normalize(safeIssue),
    required_actions: splitActions(instructions),
    matrix_instructions: clean(instructions),
    routing_rules: {
      slack: clean(slack),
      refund_queue: clean(refund),
      create_ticket: clean(ticket),
      supervisor: clean(supervisor),
    },
    escalation_triggers: inferTriggers(safeIssue, instructions, slack, refund, ticket, supervisor),
    compliance_checks: complianceChecks(instructions, slack, refund, ticket, supervisor),
    automation_policy: supervisorNeeded ? 'human_approval_required' : 'auto_draft_then_human_review',
    source: { file: sourceFile, sheet: sheetName, row: rowNumber },
    raw_cells: rawCells || {},
  };
}

function parseReferenceSheet(rows, sourceFile, sheetName) {
  const headerIndex = rows.findIndex((row) => row.map(normalize).includes('issue') && row.map(normalize).includes('matrix instructions'));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map(clean);
  const index = Object.fromEntries(headers.map((header, i) => [normalize(header), i]));
  const rules = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i].map(clean);
    const issue = row[index.issue];
    if (!issue) continue;
    rules.push(makeRule({
      channel: row[index.channel],
      section: row[index.section],
      issue,
      instructions: row[index.matrix_instructions],
      slack: row[index.slack_rule],
      refund: row[index.refundqueue_rule],
      ticket: row[index.ticket_rule],
      supervisor: row[index.supervisor_rule],
      sourceFile,
      sheetName,
      rowNumber: i + 1,
      rawCells: Object.fromEntries(headers.map((header, col) => [header, row[col] || ''])),
    }));
  }
  return rules;
}

function parseServiceMatrix(rows, sourceFile, sheetName) {
  const rules = [];
  let section = 'Uncategorized';
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].slice(0, 6).map(clean);
    if (!row.some(Boolean)) continue;
    if (row[0] && normalize(row[1]) === 'instructions') {
      section = row[0];
      continue;
    }
    const [issue, instructions, slack, refund, ticket, supervisor] = row;
    if (!issue || !instructions || instructions.length < 20) continue;
    if (issue.startsWith('**')) continue;
    rules.push(makeRule({
      channel: /voice/i.test(sheetName) ? 'Voice' : 'Ticket',
      section,
      issue,
      instructions,
      slack,
      refund,
      ticket,
      supervisor,
      sourceFile,
      sheetName,
      rowNumber: i + 1,
      rawCells: { A: issue, B: instructions, C: slack, D: refund, E: ticket, F: supervisor },
    }));
  }
  return rules;
}

function parseNotes(rows, sourceFile, sheetName) {
  return rows.map((row, i) => row.slice(0, 6).map(clean))
    .filter((row) => row.some(Boolean))
    .map((row, i) => ({ source: sourceFile, sheet: sheetName, row: i + 1, topic: row[0], note: row.slice(1).filter(Boolean).join(' | ') }));
}

function build() {
  if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
  const files = fs.readdirSync(inputDir).filter((name) => /\.(xlsx|xls|csv)$/i.test(name));
  const rules = [];
  const notes = [];
  const seen = new Set();

  for (const file of files) {
    const fullPath = path.join(inputDir, file);
    const workbook = XLSX.readFile(fullPath);
    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
      let parsed = [];
      if (/ticket matrix \(reference\)/i.test(sheetName)) parsed = parseReferenceSheet(rows, file, sheetName);
      if (/^(ticket matrix|voice matrix)$/i.test(sheetName)) parsed = parsed.concat(parseServiceMatrix(rows, file, sheetName));
      if (/items to note|matrix notes/i.test(sheetName)) notes.push(...parseNotes(rows, file, sheetName));
      for (const rule of parsed) {
        const key = `${normalize(rule.channel)}::${rule.issue_normalized}`;
        if (!seen.has(key)) {
          rules.push(rule);
          seen.add(key);
        }
      }
    }
  }

  const engine = {
    version: `2026.${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    generated_at: new Date().toISOString(),
    strict_matching: true,
    default_escalation_rule: {
      id: 'DEFAULT-HUMAN-ESCALATION',
      key: 'DEFAULT | Undefined Issue',
      channel: 'Any',
      section: 'Human Escalation',
      issue: 'Issue not strictly defined in matrix',
      required_actions: ['Do not automate solve. Route to supervisor/VIPRES human review with full ticket context.'],
      routing_rules: { slack: 'NO', refund_queue: 'NO', create_ticket: 'YES - Human review ticket', supervisor: 'YES' },
      escalation_triggers: ['undefined_matrix_issue', 'confidence_below_1_0'],
      compliance_checks: ['System must not invent a process when the matrix does not define the issue.'],
      automation_policy: 'human_approval_required',
    },
    rules,
    notes,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(engine, null, 2));
  console.log(`Built rule engine: ${rules.length} rules, ${notes.length} notes -> ${outputPath}`);
}

build();
