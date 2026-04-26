// server/src/services/hotelplanner.service.js
async function getReservationContext(ticket) {
  return {
    itinerary: ticket.itinerary || 'DEMO-ITINERARY',
    hotelName: ticket.hotelName || 'Demo Hotel',
    prepaid: true,
    checkInToday: /same day|check-in|front desk/i.test(`${ticket.subject || ''} ${ticket.description || ''}`),
    supplier: 'Demo Supplier',
  };
}

async function createRefundQueueRequest({ ticket, rule, amount, reason }) {
  return {
    status: 'queued_for_review',
    ticketId: ticket.id,
    ruleId: rule.id,
    amount: amount || null,
    reason: reason || rule.issue,
  };
}

async function createVoucherForRebooking({ ticket, rule }) {
  return {
    status: 'voucher_requested',
    ticketId: ticket.id,
    ruleId: rule.id,
  };
}

module.exports = { getReservationContext, createRefundQueueRequest, createVoucherForRebooking };
