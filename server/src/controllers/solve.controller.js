// server/src/controllers/solve.controller.js
const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');
const fs = require('fs');
const { z } = require('zod');
const { env } = require('../config/env');
const { buildActionPlan } = require('../engines/actionPlanner');
const { fetchTicket, addInternalNote, mockTicket } = require('../services/zendesk.service');
const { getReservationContext, createRefundQueueRequest, createVoucherForRebooking } = require('../services/hotelplanner.service');
const { draftCustomerResponse } = require('../services/llm.service');
const { appendAudit, readAudit } = require('../services/audit.service');
const { generateDemoTickets } = require('../services/demo.service');

const solveRequestSchema = z.object({
  ticketId: z.string().optional(),
  ticket: z.object({
    id: z.string().optional(),
    channel: z.string().optional(),
    section: z.string().optional(),
    category: z.string().optional(),
    issue: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

const runs = new Map();
const emitter = new EventEmitter();

function loadAdminConfig() {
  if (!fs.existsSync(env.paths.adminConfig)) return { allowAutoClose: false, forceHumanReview: false, escalationThreshold: 1 };
  return JSON.parse(fs.readFileSync(env.paths.adminConfig, 'utf8'));
}

function saveAdminConfig(config) {
  fs.writeFileSync(env.paths.adminConfig, JSON.stringify(config, null, 2));
}

function pushRunEvent(runId, event) {
  const run = runs.get(runId);
  if (!run) return;
  const payload = { ...event, at: new Date().toISOString() };
  run.events.push(payload);
  emitter.emit(runId, payload);
}

function createSolveController(engineRef) {
  async function executeRun(runId, payload) {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    try {
      pushRunEvent(runId, { type: 'step', status: 'running', message: '[Fetching Ticket] Loading Zendesk ticket and context...' });
      await delay(450);
      const ticket = payload.ticket || await fetchTicket(payload.ticketId || 'TKT-1482');
      const normalizedTicket = { ...mockTicket(ticket.id), ...ticket };

      pushRunEvent(runId, { type: 'step', status: 'running', message: '[Checking Matrix] Matching Channel + Category + Issue against strict JSON rule engine...' });
      await delay(450);
      const match = engineRef.engine.match(normalizedTicket);
      const adminConfig = loadAdminConfig();
      const plan = buildActionPlan(match, adminConfig);

      pushRunEvent(runId, { type: 'matrix', status: match.matched ? 'matched' : 'escalated', message: match.matched ? `[Matrix Found] ${match.rule.issue}` : `[Escalation] ${match.matchType}`, data: match });
      await delay(450);

      pushRunEvent(runId, { type: 'step', status: 'running', message: '[Verifying QA Compliance] Validating required documentation, routing, refund, Slack, ticket, and supervisor rules...' });
      await delay(450);

      const reservationContext = await getReservationContext(normalizedTicket);
      pushRunEvent(runId, { type: 'context', status: 'ok', message: '[Reservation Context] Reservation/supplier context attached.', data: reservationContext });
      await delay(450);

      for (const step of plan.steps) {
        if (step.type === 'refund_queue') {
          const refundResult = await createRefundQueueRequest({ ticket: normalizedTicket, rule: match.rule, reason: step.label });
          pushRunEvent(runId, { type: 'action', status: 'queued', message: `[Refund Queue] ${step.label}`, data: refundResult });
        } else if (step.type === 'create_voucher_or_rebook') {
          const voucherResult = await createVoucherForRebooking({ ticket: normalizedTicket, rule: match.rule });
          pushRunEvent(runId, { type: 'action', status: 'queued', message: `[Voucher/Rebook] ${step.label}`, data: voucherResult });
        } else if (step.type !== 'fetch_ticket' && step.type !== 'matrix_match' && step.type !== 'qa_compliance') {
          pushRunEvent(runId, { type: 'action', status: 'planned', message: `[Planned] ${step.label}` });
        }
        await delay(180);
      }

      pushRunEvent(runId, { type: 'step', status: 'running', message: '[LLM Draft] Drafting customer/internal response only after deterministic matrix path...' });
      await delay(450);
      const draft = await draftCustomerResponse({ ticket: normalizedTicket, rule: match.rule, plan });

      const auditPayload = { runId, ticket: normalizedTicket, match, plan, draft };
      appendAudit({ type: 'solve_attempt', ...auditPayload });
      await addInternalNote(normalizedTicket.id, `Open Claw Solver Run ${runId}\nMatrix: ${match.matchType}\nRule: ${match.rule.issue}\nHuman approval required: ${plan.requiresHumanApproval}`);

      const finalStatus = plan.requiresHumanApproval ? 'human_review_required' : 'ready_for_admin_approval';
      pushRunEvent(runId, { type: 'complete', status: finalStatus, message: plan.requiresHumanApproval ? '[Action Required] Boss/Admin approval required before solving.' : '[Ready] Deterministic plan is ready for admin approval.', data: { match, plan, draft } });
      runs.get(runId).status = finalStatus;
    } catch (error) {
      pushRunEvent(runId, { type: 'error', status: 'failed', message: error.message });
      runs.get(runId).status = 'failed';
    }
  }

  return {
    startSolve(req, res) {
      const parsed = solveRequestSchema.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const runId = randomUUID();
      runs.set(runId, { id: runId, status: 'created', events: [] });
      setImmediate(() => executeRun(runId, parsed.data));
      res.status(202).json({ runId, streamUrl: `/api/solve/stream/${runId}` });
    },
    streamSolve(req, res) {
      const { runId } = req.params;
      const run = runs.get(runId);
      if (!run) return res.status(404).end();
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
      run.events.forEach(send);
      const listener = (event) => {
        send(event);
        if (event.type === 'complete' || event.type === 'error') {
          setTimeout(() => res.end(), 100);
        }
      };
      emitter.on(runId, listener);
      req.on('close', () => emitter.off(runId, listener));
    },
    getRun(req, res) {
      const run = runs.get(req.params.runId);
      if (!run) return res.status(404).json({ error: 'Run not found' });
      res.json(run);
    },
    demoTickets(req, res) {
      const count = Math.min(Number(req.query.count || 100), 500);
      res.json({ tickets: generateDemoTickets(count) });
    },
    getAdminConfig(req, res) {
      res.json(loadAdminConfig());
    },
    updateAdminConfig(req, res) {
      const next = { ...loadAdminConfig(), ...req.body, updatedAt: new Date().toISOString() };
      saveAdminConfig(next);
      appendAudit({ type: 'admin_config_updated', config: next });
      res.json(next);
    },
    audit(req, res) {
      res.json({ audit: readAudit(Number(req.query.limit || 50)) });
    },
  };
}

module.exports = { createSolveController };
