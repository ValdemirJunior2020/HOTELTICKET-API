// client/src/components/KpiCard.jsx
import GlassCard from './GlassCard.jsx';

export default function KpiCard({ rulesCount, runStatus }) {
  return (
    <GlassCard title="KPIs" className="kpi-card">
      <p className="muted">Matrix Rules Loaded</p>
      <strong className="big-number">{rulesCount}</strong>
      <p className="muted">Strict Match Policy</p>
      <strong className="percent">100%</strong>
      <p className="muted">AI Status</p>
      <strong className="green">{runStatus || 'Active (Guarded)'}</strong>
    </GlassCard>
  );
}
