import { useState, useMemo } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementModal from '../components/ElementModal';

// ── helpers ──────────────────────────────────────────────────────────────────
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

const IMP_STARS = { protagonista: '⭐⭐⭐', primario: '⭐⭐', secondario: '⭐', minore: '·' };
const IMP_COLOR = { protagonista: '#f0c060', primario: '#b88fc4', secondario: '#7ab8d4', minore: '#888' };

// Colore card per evento range
const RANGE_COLOR = '#d4956a';

export default function TimelineView({ onOpenElement, showToast }) {
  const { elements, arcs, fazioni, allCats, addEl } = useWorld();
  const cats = allCats();

  // ── filtri ──
  const [arcFilter,  setArcFilter]  = useState('');
  const [fazFilter,  setFazFilter]  = useState('');
  const [catFilter,  setCatFilter]  = useState('');  // sottocategoria (eventSide)
  const [impFilter,  setImpFilter]  = useState('');
  const [typeFilter, setTypeFilter] = useState('');  // '' | 'point' | 'range'
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter,   setToFilter]   = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [expanded,   setExpanded]   = useState(new Set());

  // ── lati: quali categorie vanno a sx / dx ──
  const [leftCat,  setLeftCat]  = useState('');
  const [rightCat, setRightCat] = useState('');

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allEvents = elements.filter(e => e.cat === 'event');

  const filtered = useMemo(() => {
    let evs = allEvents;

    if (arcFilter) {
      const arc = arcs.find(a => a.id === arcFilter);
      if (arc) evs = evs.filter(e =>
        (arc.members || []).includes(e.id) ||
        (e.tags || []).some(t => (arc.members || []).includes(t))
      );
    }
    if (fazFilter) {
      const faz = fazioni.find(f => f.id === fazFilter);
      if (faz) evs = evs.filter(e =>
        (faz.members || []).includes(e.id) ||
        (e.tags || []).some(t => (faz.members || []).includes(t))
      );
    }
    if (catFilter)  evs = evs.filter(e => (e.eventSide || '') === catFilter);
    if (impFilter)  evs = evs.filter(e => (e.importance || 'minore') === impFilter);
    if (typeFilter) evs = evs.filter(e => (e.eventType || 'point') === typeFilter);
    if (fromFilter) evs = evs.filter(e => !e.date || e.date >= fromFilter);
    if (toFilter)   evs = evs.filter(e => !e.date || e.date <= toFilter);

    return [...evs].sort((a, b) => {
      const da = parseDate(a.date), db = parseDate(b.date);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [allEvents, arcFilter, fazFilter, catFilter, impFilter, typeFilter, fromFilter, toFilter]);

  const hasFilters = arcFilter || fazFilter || catFilter || impFilter || typeFilter || fromFilter || toFilter;

  const resetFilters = () => {
    setArcFilter(''); setFazFilter(''); setCatFilter('');
    setImpFilter(''); setTypeFilter(''); setFromFilter(''); setToFilter('');
  };

  // ── calcola posizione lato (left / right / center) ──
  const getSide = (ev) => {
    if (!leftCat && !rightCat) return 'right'; // default: tutti a destra
    if (leftCat  && ev.eventSide === leftCat)  return 'left';
    if (rightCat && ev.eventSide === rightCat) return 'right';
    return 'center'; // nessuna corrispondenza → sopra la linea
  };

  // ── componente card evento ──
  const EventCard = ({ ev, side }) => {
    const isOpen     = expanded.has(ev.id);
    const isRange    = ev.eventType === 'range';
    const taggedEls  = (ev.tags || []).map(tid => elements.find(e => e.id === tid)).filter(Boolean);
    const evArcs     = arcs.filter(a => (a.members || []).includes(ev.id));
    const imp        = ev.importance || 'minore';
    const color      = isRange ? RANGE_COLOR : (IMP_COLOR[imp] || '#b88fc4');
    const sideCat    = cats.find(c => c.id === ev.eventSide);

    const isLeft  = side === 'left';
    const isCenter = side === 'center';

    return (
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${isOpen ? 'var(--border-light)' : 'var(--border)'}`,
        borderLeft:  !isLeft  ? `3px solid ${color}` : undefined,
        borderRight: isLeft   ? `3px solid ${color}` : undefined,
        borderRadius: 7,
        overflow: 'hidden',
        transition: 'border-color .2s, box-shadow .2s',
        boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,.4)' : 'none',
        width: '100%',
      }}>
        {/* Header */}
        <div onClick={() => toggleExpand(ev.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', userSelect: 'none', flexDirection: isLeft ? 'row-reverse' : 'row' }}>

          {/* Importanza */}
          <span style={{ fontSize: 10, color, flexShrink: 0 }}>{IMP_STARS[imp]}</span>

          {/* Data */}
          {ev.date && (
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color, flexShrink: 0, minWidth: 70, textAlign: isLeft ? 'right' : 'left' }}>
              {ev.date}{ev.dateEnd ? ` → ${ev.dateEnd}` : ''}
            </div>
          )}

          {/* Nome */}
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1, textAlign: isLeft ? 'right' : 'left' }}>
            {ev.name}
          </div>

          {/* Badge tipo range */}
          {isRange && (
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: RANGE_COLOR + '22', color: RANGE_COLOR, border: `1px solid ${RANGE_COLOR}55`, flexShrink: 0 }}>
              durata
            </span>
          )}

          {/* Badge lato */}
          {sideCat && (
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'var(--surface2)', color: sideCat.color || 'var(--text-muted)', flexShrink: 0 }}>
              {sideCat.icon}
            </span>
          )}

          {/* Badge archi */}
          {evArcs.length > 0 && (
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {evArcs.map(a => (
                <span key={a.id} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 20, background: 'var(--arc-dim)', color: 'var(--arc)' }}>
                  📖 {a.name}
                </span>
              ))}
            </div>
          )}

          <span style={{ color: 'var(--text-muted)', fontSize: 10, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
        </div>

        {/* Corpo espanso */}
        {isOpen && (
          <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
            {ev.desc && (
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginTop: 10 }}>
                {ev.desc}
              </div>
            )}
            {taggedEls.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {taggedEls.map(te => {
                  const tcolor = cats.find(c => c.id === te.cat)?.color || '#888';
                  return (
                    <span key={te.id}
                      onClick={e => { e.stopPropagation(); onOpenElement(te.id); }}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: tcolor + '22', border: `1px solid ${tcolor}55`, color: tcolor, cursor: 'pointer', fontStyle: 'italic' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      {te.name}
                    </span>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-g" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onOpenElement(ev.id); }}>
                Apri scheda completa →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── layout con linea centrale ──
  const useSplit = leftCat || rightCat;

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">Time<span>line</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuovo evento</button>
      </div>

      {/* ── Toolbar filtri ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>

        {/* Riga 1: date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px' }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Da</label>
            <input type="text" placeholder="Data inizio…" value={fromFilter} onChange={e => setFromFilter(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: 120 }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px' }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>A</label>
            <input type="text" placeholder="Data fine…" value={toFilter} onChange={e => setToFilter(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: 120 }} />
          </div>
        </div>

        {/* Riga 2: selettori */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Tipo evento */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Tutti i tipi</option>
            <option value="point">◆ Puntuale</option>
            <option value="range">▬ Con durata</option>
          </select>

          {/* Importanza */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={impFilter} onChange={e => setImpFilter(e.target.value)}>
            <option value="">Qualsiasi importanza</option>
            <option value="protagonista">⭐⭐⭐ Protagonista</option>
            <option value="primario">⭐⭐ Primario</option>
            <option value="secondario">⭐ Secondario</option>
            <option value="minore">· Minore</option>
          </select>

          {/* Lato / categoria */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Tutti i lati</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {/* Arco */}
          {arcs.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={arcFilter} onChange={e => setArcFilter(e.target.value)}>
              <option value="">Tutti gli archi</option>
              {arcs.map(a => <option key={a.id} value={a.id}>📖 {a.name}</option>)}
            </select>
          )}

          {/* Fazione */}
          {fazioni.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={fazFilter} onChange={e => setFazFilter(e.target.value)}>
              <option value="">Tutte le fazioni</option>
              {fazioni.map(f => <option key={f.id} value={f.id}>⚔ {f.name}</option>)}
            </select>
          )}

          {hasFilters && (
            <button className="btn-g" style={{ fontSize: 12 }} onClick={resetFilters}>✕ Azzera filtri</button>
          )}
        </div>

        {/* Riga 3: configurazione lati */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Visualizzazione lati:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>◀ Sinistra</span>
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 12, padding: '3px 8px' }}
              value={leftCat} onChange={e => setLeftCat(e.target.value)}>
              <option value="">— nessuna —</option>
              {cats.filter(c => c.id !== rightCat).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Destra ▶</span>
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 12, padding: '3px 8px' }}
              value={rightCat} onChange={e => setRightCat(e.target.value)}>
              <option value="">— nessuna —</option>
              {cats.filter(c => c.id !== leftCat).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {(leftCat || rightCat) && (
            <button className="btn-g" style={{ fontSize: 11 }} onClick={() => { setLeftCat(''); setRightCat(''); }}>✕ Reset</button>
          )}
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length} eventi{hasFilters ? ' filtrati' : ''} su {allEvents.length} totali
        </div>
      </div>

      {/* ── Timeline ── */}
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Nessun evento</div>
          <div className="empty-sub">{hasFilters ? 'Nessun evento corrisponde ai filtri' : 'Crea il primo evento della timeline'}</div>
        </div>
      ) : useSplit ? (
        // ── Layout a due colonne con linea centrale (desktop) / singola (mobile) ──
        <div style={{ position: 'relative' }}>
          {/* Linea centrale */}
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--border-light)', transform: 'translateX(-50%)', zIndex: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((ev, idx) => {
              const side   = getSide(ev);
              const isLeft = side === 'left';
              const isCenter = side === 'center';
              const isRange = ev.eventType === 'range';
              const imp   = ev.importance || 'minore';
              const color = isRange ? RANGE_COLOR : (IMP_COLOR[imp] || '#b88fc4');

              return (
                <div key={ev.id} className="tl-split-row" style={{ marginBottom: 12, position: 'relative', zIndex: 1 }}>
                  {/* Colonna sinistra */}
                  <div style={{ paddingRight: 16 }}>
                    {(isLeft || isCenter) && <EventCard ev={ev} side={isLeft ? 'left' : 'center'} />}
                  </div>

                  {/* Punto sulla linea centrale */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid var(--surface)', flexShrink: 0, boxShadow: `0 0 6px ${color}88` }} />
                  </div>

                  {/* Colonna destra */}
                  <div style={{ paddingLeft: 16 }}>
                    {(!isLeft && !isCenter) && <EventCard ev={ev} side="right" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ── Layout classico a singola colonna ──
        <div className="tl-track">
          {filtered.map(ev => {
            const isRange = ev.eventType === 'range';
            const imp     = ev.importance || 'minore';
            const color   = isRange ? RANGE_COLOR : (IMP_COLOR[imp] || '#b88fc4');
            return (
              <div key={ev.id} style={{ position: 'relative', marginBottom: 10 }}>
                <div style={{ position: 'absolute', left: -27, top: 18, width: 8, height: 8, borderRadius: '50%', background: color, border: '2px solid var(--surface)' }} />
                <EventCard ev={ev} side="right" />
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
