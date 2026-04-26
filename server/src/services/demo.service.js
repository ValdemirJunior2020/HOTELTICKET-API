// server/src/services/demo.service.js
const demoIssues = [
  'Reservation not found at check-in',
  'Overbooking leading to relocation (“walked” reservation) or Hotel Is Closed Down',
  'Incorrect  dates or modifying dates',
  'Payment declined at check-in despite prepayment',
  'Asking for a refund on "REFUND PROTECTION PLAN"',
  'Legal or Government Complaints',
  'Unknown edge case not in matrix',
];

function generateDemoTickets(count = 100) {
  return Array.from({ length: count }, (_, index) => {
    const issue = demoIssues[index % demoIssues.length];
    return {
      id: `DEMO-${String(index + 1).padStart(4, '0')}`,
      channel: 'Ticket',
      section: issue === 'Legal or Government Complaints' ? 'Escalations' : 'Hotel & Reservation Issues',
      issue,
      subject: issue,
      description: `Synthetic ticket for deterministic matrix QA test: ${issue}`,
      priority: index % 7 === 0 ? 'urgent' : 'normal',
      createdAt: new Date(Date.now() - index * 3600000).toISOString(),
    };
  });
}

module.exports = { generateDemoTickets };
