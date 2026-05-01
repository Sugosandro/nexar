import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementModal from '../components/ElementModal';

export default function TimelineView({ onOpenElement, showToast }) {
  const { elements, arcs, addEl } = useWorld();

  const [arcFilter,  setArcFilter]  = useState(null);
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter,   setToFilter]   = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [expanded,   setExpanded]   = useState(new Set());

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  let events = elements.filter(e => e.cat === 'event');

  if (arcFilter) {
    const arc = arcs.find(a => a.id === arcFilter);
    if (arc) events = events.filter(e =>
      (arc.members || []).includes(e.id) ||
      (e.tags || []).some(t => (arc.members || []).includes(t))
    );
  }

  if (fromFilter) events = events.filter(e => !e.date || e.date >= fromFilter);
  if (toFilter)   events = events.filter(e => !e.date || e.date <= toFilter);

  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return y * 10000 + m * 100 + d;
    }
    const nums = str.match(/\d+/g)?.map(Number) || [];
    return nums[0] || 0;
  };

  const sorted = [...events].sort((a, b) => {
    const da = parseDate(a.date), db = parseDate(b.date);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  const catColor = (e) => {
    const colors = { char: '#7ab8d4', place: '#8fbd7c', object: '#d4956a', event: '#b88fc4' };
    return colors[e.cat] || '#888';
  };

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">Time<span>line</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuovo evento</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>

        {/* Filtro date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px' }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Da</label>
            <input type="text" placeholder="Data inizio…" value={fromFilter} onChange={e => setFromFilter(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: 130 }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px' }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>A</label>
            <input type="text" placeholder="Data fine…" value={toFilter} onChange={e => setToFilter(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: 130 }} />
          </div>
          {(fromFilter || toFilter) && (
            <button onClick={() => { setFromFilter(''); setToFilter(''); }}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: 11, padding: '4px 9px', fontFamily: "'Crimson Pro', serif" }}>
              ✕ Azzera
            </button>
          )}
        </div>

        {/* Filtri arco */}
        {arcs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)' }}>Arco:</span>
            <button
              onClick={() => setArcFilter(null)}
              style={{ background: !arcFilter ? 'var(--gold-glow)' : 'none', border: `1px solid ${!arcFilter ? 'var(--gold-dim)' : 'var(--border)'}`, color: !arcFilter ? 'var(--gold)' : 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all .2s' }}>
              Tutti
            </button>
            {arcs.map(a => (
              <button key={a.id}
                onClick={() => setArcFilter(a.id)}
                style={{ background: arcFilter === a.id ? 'var(--arc-dim)' : 'none', border: `1px solid ${arcFilter === a.id ? 'var(--arc)' : 'var(--border)'}`, color: arcFilter === a.id ? 'var(--arc)' : 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all .2s' }}>
                📖 {a.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Nessun evento</div>
          <div className="empty-sub">
            {arcFilter || fromFilter || toFilter
              ? 'Nessun evento corrisponde ai filtri applicati'
              : 'Crea il primo evento della timeline'}
          </div>
        </div>
      ) : (
        <div className="tl-track">
          {sorted.map(ev => {
            const isOpen    = expanded.has(ev.id);
            const taggedEls = (ev.tags || []).map(tid => elements.find(e => e.id === tid)).filter(Boolean);
            const evArcs    = arcs.filter(a => (a.members || []).includes(ev.id));
            const color     = '#b88fc4';

            return (
              <div key={ev.id} style={{ position: 'relative', marginBottom: 10 }}>
                {/* Pallino sulla linea */}
                <div style={{ position: 'absolute', left: -27, top: 18, width: 8, height: 8, borderRadius: '50%', background: color, border: '2px solid var(--surface)' }} />

                {/* Card */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isOpen ? 'var(--border-light)' : 'var(--border)'}`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 7,
                    overflow: 'hidden',
                    transition: 'border-color .2s, box-shadow .2s',
                    boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,.4)' : 'none',
                  }}
                >
                  {/* Header sempre visibile — cliccabile per espandere */}
                  <div
                    onClick={() => toggleExpand(ev.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    {/* Data */}
                    {ev.date && (
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: color, flexShrink: 0, minWidth: 90 }}>
                        {ev.date}
                      </div>
                    )}

                    {/* Nome */}
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: 'var(--text)', flex: 1 }}>
                      {ev.name}
                    </div>

                    {/* Badge archi (sempre visibili) */}
                    {evArcs.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {evArcs.map(a => (
                          <span key={a.id} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'var(--arc-dim)', color: 'var(--arc)' }}>
                            📖 {a.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Freccia espansione */}
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▼</span>
                  </div>

                  {/* Corpo espanso */}
                  {isOpen && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                      {ev.desc && (
                        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginTop: 10, marginBottom: taggedEls.length ? 12 : 0 }}>
                          {ev.desc}
                        </div>
                      )}

                      {/* Tag */}
                      {taggedEls.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                          {taggedEls.map(te => {
                            const tcolor = catColor(te);
                            return (
                              <span key={te.id}
                                onClick={e => { e.stopPropagation(); onOpenElement(te.id); }}
                                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: tcolor + '22', border: `1px solid ${tcolor}55`, color: tcolor, cursor: 'pointer', fontStyle: 'italic', transition: 'opacity .2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = .7}
                                onMouseLeave={e => e.currentTarget.style.opacity = 1}
                              >
                                {te.name}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Apri scheda completa */}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-g" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onOpenElement(ev.id); }}>
                          Apri scheda completa →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ElementModal
          defaultCat="event"
          onSave={async (data) => { await addEl(data); setShowModal(false); showToast('✓ Evento creato'); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}