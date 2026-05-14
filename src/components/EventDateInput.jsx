import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

export default function EventDateInput({ value, onChange, placeholder, inputStyle = {} }) {
  const { t } = useTranslation();
  const { elements } = useWorld();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const events = elements
    .filter(e => e.cat === 'event' && e.date)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const filtered = q.trim()
    ? events.filter(e =>
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        (e.date || '').toLowerCase().includes(q.toLowerCase()))
    : events;

  const handleChange = (v) => { onChange(v); setQ(v); setOpen(true); };
  const handlePick   = (ev) => { onChange(ev.date); setQ(''); setOpen(false); };

  const base = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    color: 'var(--text)',
    fontFamily: "'Playfair Display', serif",
    fontSize: 12,
    padding: '4px 8px',
    outline: 'none',
  };

  return (
    <div style={{ position: 'relative', flex: '1 1 110px', minWidth: 0 }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder || t('rel.data_ph')}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        style={{ ...base, ...inputStyle }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border-light)',
          borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.55)',
          zIndex: 900, maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.map(ev => (
            <div key={ev.id} onMouseDown={() => handlePick(ev)}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'baseline' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <span style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', flexShrink: 0, minWidth: 60 }}>{ev.date}</span>
              <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
