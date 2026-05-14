import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function ViewHint({ viewId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef   = useRef();
  const panelRef = useRef();

  useEffect(() => { setOpen(false); }, [viewId]);

  useEffect(() => {
    if (!open) return;
    const onKey   = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onMouse = (e) => {
      if (!btnRef.current?.contains(e.target) && !panelRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('keydown',   onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown',   onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(8, r.left - 260 + r.width) });
    setOpen(true);
  };

  const title   = t(`hints.${viewId}.title`, { defaultValue: '' });
  const desc    = t(`hints.${viewId}.desc`,  { defaultValue: '' });
  const bullets = [1, 2, 3]
    .map(i => t(`hints.${viewId}.b${i}`, { defaultValue: '' }))
    .filter(Boolean);

  if (!title) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title={t('common.hint_btn', { defaultValue: 'Help' })}
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${open ? 'var(--gold-dim)' : 'var(--border)'}`,
          background: open ? 'var(--gold-glow)' : 'var(--surface2)',
          color: open ? 'var(--gold)' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s', lineHeight: 1,
        }}
      >?</button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            width: 280, zIndex: 10000,
            background: 'var(--surface3)',
            border: '1px solid var(--gold-dim)',
            borderRadius: 'var(--r)',
            padding: '14px 16px',
            boxShadow: '0 8px 28px rgba(0,0,0,.55)',
          }}
        >
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--gold)',
            marginBottom: 6, fontFamily: "'Crimson Pro', serif",
          }}>
            {title}
          </div>

          {desc && (
            <p style={{
              fontSize: 13, color: 'var(--text-dim)',
              marginBottom: bullets.length ? 10 : 0, lineHeight: 1.5,
            }}>
              {desc}
            </p>
          )}

          {bullets.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--gold-dim)', flexShrink: 0, marginTop: 1 }}>◆</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
