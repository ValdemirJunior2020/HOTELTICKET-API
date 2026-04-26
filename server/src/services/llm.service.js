// server/src/services/llm.service.js
const OpenAI = require('openai');
const { env } = require('../config/env');

async function draftCustomerResponse({ ticket, rule, plan }) {
  if (!env.openai.enabled || !env.openai.apiKey) {
    return fallbackDraft(ticket, rule, plan);
  }

  const client = new OpenAI({ apiKey: env.openai.apiKey });
  const prompt = [
    'You are drafting a polite HotelPlanner support response.',
    'Do not invent approvals, refund amounts, cancellation confirmations, or completed actions.',
    'Only summarize the deterministic matrix-required next steps below.',
    `Ticket subject: ${ticket.subject || ''}`,
    `Matrix issue: ${rule.issue}`,
    `Required actions: ${(rule.required_actions || []).join(' | ')}`,
    `Human approval required: ${plan.requiresHumanApproval}`,
  ].join('\n');

  const completion = await client.chat.completions.create({
    model: env.openai.model,
    messages: [
      { role: 'system', content: 'You write concise, compliant customer service drafts.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  return completion.choices?.[0]?.message?.content?.trim() || fallbackDraft(ticket, rule, plan);
}

function fallbackDraft(ticket, rule, plan) {
  const approval = plan.requiresHumanApproval
    ? 'This ticket requires a supervisor review before final resolution.'
    : 'The required matrix workflow has been prepared for review.';
  return `Hello, thank you for contacting HotelPlanner. We reviewed your request regarding ${ticket.subject || rule.issue}. ${approval} Our team will follow the required process and document the outcome on your reservation.`;
}

module.exports = { draftCustomerResponse };
