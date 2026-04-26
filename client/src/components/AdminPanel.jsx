// client/src/components/AdminPanel.jsx
import { useEffect, useState } from 'react';
import GlassCard from './GlassCard.jsx';
import { getAdminConfig, updateAdminConfig, rebuildRules } from '../api/client.js';

export default function AdminPanel({ onRulesRebuilt }) {
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getAdminConfig().then(setConfig).catch((error) => setMessage(error.message));
  }, []);

  async function toggle(key) {
    const next = { ...config, [key]: !config[key] };
    setConfig(next);
    const saved = await updateAdminConfig(next);
    setConfig(saved);
  }

  async function rebuild() {
    setMessage('Rebuilding matrix rule engine...');
    const result = await rebuildRules();
    setMessage(`Rebuilt ${result.count} rules.`);
    onRulesRebuilt?.();
  }

  return (
    <GlassCard title="Boss/Admin Control Panel" className="admin-card">
      {!config ? <p className="muted">Loading admin controls...</p> : (
        <div className="admin-grid">
          <label className="toggle-row">
            <span>Boss visibility</span>
            <input type="checkbox" checked={Boolean(config.bossVisibility)} onChange={() => toggle('bossVisibility')} />
          </label>
          <label className="toggle-row">
            <span>Force human review</span>
            <input type="checkbox" checked={Boolean(config.forceHumanReview)} onChange={() => toggle('forceHumanReview')} />
          </label>
          <label className="toggle-row">
            <span>Allow auto-close</span>
            <input type="checkbox" checked={Boolean(config.allowAutoClose)} onChange={() => toggle('allowAutoClose')} />
          </label>
          <button className="secondary-button" onClick={rebuild}>Rebuild Matrix JSON</button>
        </div>
      )}
      {message && <p className="system-message">{message}</p>}
    </GlassCard>
  );
}
