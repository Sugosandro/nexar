import { useState, useRef, useEffect } from 'react';
import { useWorld } from '../hooks/useWorld';

export default function GlobalSearch({ onOpen }) {
  const { elements, arcs, fazioni, magie, elColor, elIcon, allCats } = useWorld();
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [selIdx,  setSelIdx]  = useState(0);
  const inputRef  = useRef(null);
  const cats = allCats();

  const q = query.toLowerCase().trim();

  const results = q ? [
    ...elements.map(e => ({
      id: e.id, type: 'element', label: e.name,
      sub: cats.find(c => c.id === e.cat)?.name || '',
      color: elColor(e), icon: elIcon(e),
    })),
    ...arcs.map(a => ({
      id: a.id, type: 'arc', label: a.name,
      sub: 'Arco narrativo', color: '#e8a0a8', icon: '📖',
    })),
    ...fazioni.map(f => ({
      id: f.id, type: 'fazione', label: f.name,
      sub: 'Fazione', color: '#f0c060', icon: '⚔',
    })),
    ...magie.map(m => ({
      id: m.id, type: 'magia', label: m.name,
      sub: 'Sistema di magia', color: '#a0d0c0', icon: '✨',
    })),
  ].filter(r => r.label.toLowerCase().includes(q)).slice(0, 10) : [];

  useEffect(() => { setSelIdx(0); }, [query]);

  const handleSelect = (r) => {
    onOpen(r.type === 'magia' ? 'magia' : r.type, r.id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selIdx]) handleSelect(results[selIdx]);
    if (e.key === 'Escape') { setQuery(''); setOpen(false); inputRef.current?.blur(); }
  };

  // Shortcut globale Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 320, minWidth: 180 }}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '5px 11px',
        transition: 'border-color .2s',
        ...(open ? { borderColor: 'var(--gold-dim)' } : {}),
      }}>
        <span style={{ fontSize: 13, opacity: .5 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Cerca ovunque…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)', fontFamily: "'Crimson Pro', serif",
            fontSize: 13, width: '100%',
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', opacity: .6 }}>
          Ctrl+K
        </span>
      </div>

      {/* Dropdown risultati */}
      {open && query && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border-light)',
          borderRadius: 'var(--r)', boxShadow: '0 8px 32px rgba(0,0,0,.6)',
          zIndex: 300, overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Nessun risultato per "{query}"
            </div>
          ) : (
            <>
              {results.map((r, i) => (
                <div key={`${r.type}-${r.id}`}
                  onMouseDown={() => handleSelect(r)}
                  onMouseEnter={() => setSelIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                    background: i === selIdx ? 'var(--surface2)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 10, color: r.color, marginTop: 1 }}>{r.sub}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>↵</span>
                </div>
              ))}
              <div style={{ padding: '6px 14px', fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                {results.length} risultat{results.length !== 1 ? 'i' : 'o'} • ↑↓ per navigare
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}