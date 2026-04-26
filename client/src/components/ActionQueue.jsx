// client/src/components/ActionQueue.jsx
import GlassCard from './GlassCard.jsx';

export default function ActionQueue({ events }) {
  const actionEvents = events.filter((event) => ['matrix', 'action', 'complete', 'error'].includes(event.type)).slice(-6);
  return (
    <GlassCard title="Action Required" className="action-card">
      <p className="warning-title">CALL HOTEL/SUPPLIER</p>
      <p className="muted">Items appear here when the matrix blocks automation or needs human approval.</p>
      <div className="action-list">
        {actionEvents.length === 0 && <div className="action-item">No current manual actions.</div>}
        {actionEvents.map((event, index) => (
          <div className="action-item" key={`${event.at}-${index}`}>{event.message}</div>
        ))}
      </div>
    </GlassCard>
  );
}
