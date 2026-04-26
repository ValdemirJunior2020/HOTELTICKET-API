// client/src/components/TicketQueue.jsx
import GlassCard from './GlassCard.jsx';

export default function TicketQueue({ tickets, selectedTicket, onSelect }) {
  return (
    <GlassCard title="Zendesk Ticket Queue" className="queue-card">
      <div className="ticket-list">
        {tickets.slice(0, 8).map((ticket) => (
          <button
            key={ticket.id}
            className={`ticket-row ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
            onClick={() => onSelect(ticket)}
          >
            <span>{ticket.id}</span>
            <strong>{ticket.issue}</strong>
            <small>{ticket.section}</small>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
