// client/src/components/GlassCard.jsx
export default function GlassCard({ title, children, className = '', action }) {
  return (
    <section className={`glass-card ${className}`}>
      <div className="card-header">
        <h2>{title}</h2>
        {action || <span className="dots">•••</span>}
      </div>
      {children}
    </section>
  );
}
