// client/src/components/LogicModal.jsx
import { XCircle, ShieldCheck } from 'lucide-react';

export default function LogicModal({ open, events, onClose }) {
  if (!open) return null;
  const last = events[events.length - 1];
  return (
    <div className="modal-backdrop">
      <div className="logic-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow"><ShieldCheck size={16} /> Transparency Mode</p>
            <h2>One-Click Solve Execution Log</h2>
          </div>
          <button className="icon-button" onClick={onClose}><XCircle /></button>
        </div>
        <div className="terminal tall">
          {events.map((event, index) => (
            <div key={`${event.at}-${index}`} className={`terminal-line ${event.status}`}>
              <span>{event.message}</span>
            </div>
          ))}
          {!events.length && <div className="terminal-line">Waiting for solver...</div>}
        </div>
        {last?.data?.draft && (
          <div className="draft-box">
            <strong>Draft response</strong>
            <p>{last.data.draft}</p>
          </div>
        )}
      </div>
    </div>
  );
}
