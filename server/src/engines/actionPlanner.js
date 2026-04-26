// server/src/engines/actionPlanner.js
function buildActionPlan(matchResult, adminConfig = {}) {
  const rule = matchResult.rule;
  const steps = [];

  steps.push({ type: 'fetch_ticket', label: 'Fetch Zendesk ticket and reservation context', status: 'pending' });
  steps.push({ type: 'matrix_match', label: matchResult.matched ? `Strict matrix match: ${rule.issue}` : `Human escalation: ${matchResult.matchType}`, status: 'pending' });
  steps.push({ type: 'qa_compliance', label: 'Verify QA compliance checks from matrix', status: 'pending', checks: rule.compliance_checks || [] });

  for (const action of rule.required_actions || []) {
    const lower = String(action).toLowerCase();
    let type = 'manual_action';
    if (lower.includes('call supplier')) type = 'call_supplier';
    else if (lower.includes('call the hotel') || lower.includes('call hotel')) type = 'call_hotel';
    else if (lower.includes('voucher')) type = 'create_voucher_or_rebook';
    else if (lower.includes('refund')) type = 'refund_queue';
    else if (lower.includes('vipres')) type = 'vipres_escalation';
    else if (lower.includes('ticket')) type = 'create_ticket';
    steps.push({ type, label: action, status: 'pending' });
  }

  steps.push({ type: 'llm_email_draft', label: 'Draft customer response after deterministic rule path', status: 'pending' });

  const requiresHuman = !matchResult.safeToAutoResolve || rule.automation_policy === 'human_approval_required';
  steps.push({
    type: requiresHuman ? 'human_approval' : 'ready_to_solve',
    label: requiresHuman ? 'Hold for boss/admin approval before closure' : 'Ready for automated Zendesk update after audit log',
    status: 'pending',
  });

  return {
    canAutoClose: !requiresHuman && adminConfig.allowAutoClose === true,
    requiresHumanApproval: requiresHuman || adminConfig.forceHumanReview === true,
    matrixVersion: matchResult.rule.version,
    steps,
  };
}

module.exports = { buildActionPlan };
