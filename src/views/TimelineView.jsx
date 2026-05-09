import { useState, useMemo, Fragment } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementModal from '../components/ElementModal';

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

const IMP_STARS = { principale: '⭐⭐⭐', primario: '⭐⭐', secondario: '⭐', minore: '·' };
const IMP_COLOR = { principale: '#f0c060', primario: '#b88fc4', secondario: '#7ab8d4', minore: '#888' };
const RANGE_COLOR = '#d4956a';

// ── Card evento puntale ───────────────────────────────────────────────────
function EventCard({ ev, side, elements, arcs, cats, expanded, toggleExpand, onOpenElement }) {
  const isOpen    = expanded.has(ev.id);
  const imp       = ev.importance || 'minore';
  const color     = IMP_COLOR[imp] || '#b88fc4';
  const isLeft    = side === 'left';
  const taggedEls = (ev.tags || []).map(tid => elements.find(e => e.id === tid)).filter(Boolean);
  const evArcs    = arcs.filter(a => (a.members || []).includes(ev.id));
  const sideCat   = cats.find(c => c.id === ev.eventSide);

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isOpen ? 'var(--border-light)' : 'var(--border)'}`,
      borderLeft:  !isLeft ? `3px solid ${color}` : undefined,
      borderRight: isLeft  ? `3px solid ${color}` : undefined,
      borderRadius: 7, overflow: 'hidden',
      boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,.4)' : 'none',
    }}>
      <div onClick={() => toggleExpand(ev.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', userSelect: 'none', flexDirection: isLeft ? 'row-reverse' : 'row' }}>
        <span style={{ fontSize: 10, color, flexShrink: 0 }}>{IMP_STARS[imp]}</span>
        {ev.date && (
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color, flexShrink: 0, minWidth: 70, textAlign: isLeft ? 'right' : 'left' }}>
            {ev.date}
          </div>
        )}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1, textAlign: isLeft ? 'right' : 'left' }}>
          {ev.name}
        </div>
        {sideCat && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'var(--surface2)', color: sideCat.color, flexShrink: 0 }}>{sideCat.icon}</span>}
        {evArcs.map(a => <span key={a.id} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 20, background: 'var(--arc-dim)', color: 'var(--arc)' }}>📖 {a.name}</span>)}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
      </div>
      {isOpen && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
          {ev.desc && <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginTop: 10 }}>{ev.desc}</div>}
          {taggedEls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
              {taggedEls.map(te => (
                <span key={te.id} onClick={e => { e.stopPropagation(); onOpenElement(te.id); }}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#88888822', border: '1px solid #88888855', color: '#888', cursor: 'pointer', fontStyle: 'italic' }}>
                  {te.name}
                </span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-g" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onOpenElement(ev.id); }}>
              Apri scheda →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contenuto interno barra range — testo orizzontale, larghezza adattiva ──
function RangeBarInner({ ev, h, color, isOpen, toggleExpand, onOpenElement, popupLeft, popupRight }) {
  return (
    <>
      <div onClick={() => toggleExpand(ev.id)}
        title={`${ev.name} (${ev.date} → ${ev.dateEnd})`}
        style={{ height: h, width: '100%', background: isOpen ? color + '55' : color + '33', border: `2px solid ${color}`, borderRadius: 6, cursor: 'pointer', padding: '8px 10px', boxSizing: 'border-box', overflow: 'hidden', transition: 'background .15s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = color + '55'; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = isOpen ? color + '55' : color + '33'; }}
      >
        <span style={{ fontSize: 13, color, fontFamily: "'Playfair Display', serif", fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
          {ev.name}
        </span>
        {h > 60 && (
          <span style={{ fontSize: 10, color: color + 'cc', lineHeight: 1.3, flexShrink: 0, marginTop: 4 }}>
            {ev.date} → {ev.dateEnd}
          </span>
        )}
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', left: popupRight ? 'auto' : (popupLeft ?? 'calc(100% + 8px)'), right: popupRight ?? 'auto', top: 0, background: 'var(--surface)', border: `1px solid ${color}`, borderRadius: 8, padding: '12px 14px', zIndex: 30, minWidth: 220, maxWidth: 280, boxShadow: '0 8px 32px rgba(0,0,0,.7)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{ev.name}</div>
          <div style={{ fontSize: 12, color, marginBottom: ev.desc ? 8 : 0 }}>{ev.date} → {ev.dateEnd}</div>
          {ev.desc && <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 8 }}>{ev.desc}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-g" style={{ fontSize: 11 }} onClick={() => toggleExpand(ev.id)}>✕</button>
            <button className="btn-g" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onOpenElement(ev.id); }}>Apri →</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── TimelineCanvas ────────────────────────────────────────────────────────
// Layout: la linea verticale è la spina dorsale.
// - Eventi puntali: a lato della linea (destra in singola, sx/dx in doppia)
// - Eventi range: CENTRATI sulla linea, la linea si interrompe durante la barra
function TimelineCanvas({ filtered, elements, arcs, expanded, toggleExpand, getSide, useSplit, onOpenElement, cats }) {
  const SLOT_H      = 90;   // px minimi tra eventi puntali
  const MIN_BAR_H   = 50;
  const CHARS_PER_LINE = 30; // max caratteri per riga prima dell'a capo
  const CH_PX       = 7.5;  // pixel per carattere (font ~13px)
  const PAD         = 20;   // padding orizzontale interno
  // Larghezza barra: adattiva al testo, min 80, max 200
  const getRangeW = (name) => {
    const lines = Math.ceil(name.length / CHARS_PER_LINE);
    const longestLine = Math.min(name.length, CHARS_PER_LINE);
    return Math.min(Math.max(Math.round(longestLine * CH_PX + PAD * 2), 80), 200);
  };

  if (!filtered.length) return null;

  const rangeEvs  = filtered.filter(e => e.eventType === 'range' && e.date && e.dateEnd);
  const pointEvs  = filtered.filter(e => !(e.eventType === 'range' && e.dateEnd));
  const pointsSorted = [...pointEvs].sort((a, b) => (parseDate(a.date) ?? 0) - (parseDate(b.date) ?? 0));

  // Scala temporale unificata
  const allDates = [
    ...pointsSorted.map(e => parseDate(e.date)),
    ...rangeEvs.map(e => parseDate(e.date)),
    ...rangeEvs.map(e => parseDate(e.dateEnd)),
  ].filter(Boolean);
  if (!allDates.length) return null;

  const minDate  = Math.min(...allDates);
  const maxDate  = Math.max(...allDates);
  const dateSpan = maxDate - minDate || 1;

  // Altezza canvas basata sugli slot puntali
  const minH = Math.max(pointsSorted.length * SLOT_H + 200, rangeEvs.length > 0 ? 400 : 200);

  const toPx = (d) => {
    if (!d && d !== 0) return 0;
    return Math.round(((d - minDate) / dateSpan) * (minH - 80)) + 30;
  };

  // Posizioni Y eventi puntali con spaziatura minima
  const pointPositions = [];
  let lastY = -SLOT_H;
  for (const ev of pointsSorted) {
    const ideal = toPx(parseDate(ev.date));
    const y = Math.max(ideal, lastY + SLOT_H);
    pointPositions.push({ ev, y });
    lastY = y;
  }
  const totalH = Math.max(minH, (pointPositions[pointPositions.length - 1]?.y ?? 0) + 150);

  // Barre range con posizione Y e larghezza adattiva
  const rangeLayout = rangeEvs.map(ev => {
    const yStart = toPx(parseDate(ev.date));
    const yEnd   = Math.max(toPx(parseDate(ev.dateEnd)), yStart + MIN_BAR_H);
    const w      = getRangeW(ev.name);
    return { ev, yStart, yEnd, w };
  });

  // Costruisci segmenti di linea: le barre range "tagliano" la linea
  // Raccoglie tutti gli intervalli "bloccati" dalle barre
  const blocked = rangeLayout.map(r => ({ from: r.yStart, to: r.yEnd }));
  const buildLineSegments = (totalH) => {
    if (!blocked.length) return [{ from: 0, to: totalH }];
    const sorted = [...blocked].sort((a, b) => a.from - b.from);
    const segs = [];
    let cursor = 0;
    for (const { from, to } of sorted) {
      if (cursor < from) segs.push({ from: cursor, to: from });
      cursor = Math.max(cursor, to);
    }
    if (cursor < totalH) segs.push({ from: cursor, to: totalH });
    return segs;
  };

  // ── Vista singola ──
  if (!useSplit) {
    // La linea è a sinistra, la barra range è centrata su di essa
    // Gli eventi puntali stanno a destra della linea
    const maxRangeW = rangeLayout.length > 0 ? Math.max(...rangeLayout.map(r => r.w)) : 0;
    const LINE_X    = maxRangeW / 2 + 4; // linea centrata sulla barra più larga
    const BAR_LEFT  = 4;               // barra da sx
    const CARD_LEFT = maxRangeW + 32;  // card ben a destra della barra più larga
    const lineSegs  = buildLineSegments(totalH);

    return (
      <div style={{ position: 'relative', minHeight: totalH, paddingLeft: 0, boxSizing: 'border-box' }}>

        {/* Segmenti linea */}
        {lineSegs.map((seg, i) => (
          <div key={i} style={{ position: 'absolute', left: LINE_X, top: seg.from, width: 2, height: seg.to - seg.from, background: 'var(--border-light)' }} />
        ))}

        {/* Barre range */}
        {rangeLayout.map(({ ev, yStart, yEnd, w }) => {
          const h      = yEnd - yStart;
          const imp    = ev.importance || 'minore';
          const color  = IMP_COLOR[imp] || RANGE_COLOR;
          const isOpen = expanded.has(ev.id);
          return (
            <div key={ev.id} style={{ position: 'absolute', top: yStart, left: BAR_LEFT, width: w, zIndex: isOpen ? 10 : 3 }}>
              <RangeBarInner ev={ev} h={h} color={color} isOpen={isOpen}
                toggleExpand={toggleExpand} onOpenElement={onOpenElement}
                popupLeft={w + 8} />
            </div>
          );
        })}

        {/* Eventi puntali */}
        {pointPositions.map(({ ev, y }) => {
          const imp   = ev.importance || 'minore';
          const color = IMP_COLOR[imp] || '#b88fc4';
          return (
            <div key={ev.id} style={{ position: 'absolute', top: y, left: CARD_LEFT, right: 4, zIndex: expanded.has(ev.id) ? 10 : 1 }}>
              <div style={{ position: 'absolute', left: -(CARD_LEFT - LINE_X) - 5, top: 14, width: 8, height: 8, borderRadius: '50%', background: color, border: '2px solid var(--surface)' }} />
              <EventCard ev={ev} side="right" elements={elements} arcs={arcs} cats={cats}
                expanded={expanded} toggleExpand={toggleExpand} onOpenElement={onOpenElement} />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Vista doppia ──
  // Linea centrale al 50%, barre centrate su di essa
  const lineSegs = buildLineSegments(totalH);

  return (
    <div style={{ position: 'relative', minHeight: totalH }}>

      {/* Segmenti linea centrale */}
      {lineSegs.map((seg, i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: seg.from,
          width: 2, height: seg.to - seg.from,
          background: 'var(--border-light)', transform: 'translateX(-50%)',
        }} />
      ))}

      {/* Barre range centrate sulla linea */}
      {rangeLayout.map(({ ev, yStart, yEnd, w }) => {
        const h      = yEnd - yStart;
        const imp    = ev.importance || 'minore';
        const color  = IMP_COLOR[imp] || RANGE_COLOR;
        const isOpen = expanded.has(ev.id);
        return (
          <div key={ev.id} style={{ position: 'absolute', top: yStart, left: '50%', transform: 'translateX(-50%)', width: w, zIndex: isOpen ? 10 : 3 }}>
            <RangeBarInner ev={ev} h={h} color={color} isOpen={isOpen}
              toggleExpand={toggleExpand} onOpenElement={onOpenElement}
              popupRight="calc(100% + 8px)" />
          </div>
        );
      })}

      {/* Punti sulla linea per eventi puntali */}
      {pointPositions.map(({ ev, y }) => {
        const side       = getSide(ev);
        const isLeft     = side === 'left';
        const isCenter   = side === 'center';
        const imp        = ev.importance || 'minore';
        const color      = IMP_COLOR[imp] || '#b88fc4';
        // Scarta la barra se la card (y … y+SLOT_H) si sovrappone verticalmente
        const activeRange  = rangeLayout.find(r => y + SLOT_H > r.yStart && y < r.yEnd);
        const hasRangeHere = !!activeRange;
        const rw           = activeRange?.w ?? 0;
        const halfGap      = hasRangeHere ? rw / 2 + 20 : 20;
        const isExpanded   = expanded.has(ev.id);
        // Pallino nascosto solo se il suo y cade dentro la barra
        const showDot = !rangeLayout.some(r => y + 14 >= r.yStart && y + 14 <= r.yEnd);
        return (
          <Fragment key={ev.id}>
            {showDot && (
              <div style={{ position: 'absolute', top: y + 14, left: 'calc(50% - 5px)', width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid var(--surface)', boxShadow: `0 0 6px ${color}88`, zIndex: 4 }} />
            )}
            {(isLeft || isCenter) && (
              <div style={{ position: 'absolute', top: y, left: 0, right: `calc(50% + ${halfGap}px)`, paddingRight: 12, zIndex: isExpanded ? 20 : 2 }}>
                <EventCard ev={ev} side={isLeft ? 'left' : 'center'} elements={elements} arcs={arcs} cats={cats}
                  expanded={expanded} toggleExpand={toggleExpand} onOpenElement={onOpenElement} />
              </div>
            )}
            {!isLeft && !isCenter && (
              <div style={{ position: 'absolute', top: y, left: `calc(50% + ${halfGap}px)`, right: 0, paddingLeft: 12, zIndex: isExpanded ? 20 : 2 }}>
                <EventCard ev={ev} side="right" elements={elements} arcs={arcs} cats={cats}
                  expanded={expanded} toggleExpand={toggleExpand} onOpenElement={onOpenElement} />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────
export default function TimelineView({ onOpenElement, showToast }) {
  const { elements, arcs, fazioni, allCats, addEl } = useWorld();
  const cats = allCats();

  const [arcFilter,  setArcFilter]  = useState('');
  const [fazFilter,  setFazFilter]  = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [impFilter,  setImpFilter]  = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter,   setToFilter]   = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [expanded,   setExpanded]   = useState(new Set());
  const [leftCat,    setLeftCat]    = useState('');
  const [rightCat,   setRightCat]   = useState('');

  const toggleExpand = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allEvents = elements.filter(e => e.cat === 'event');

  const filtered = useMemo(() => {
    let evs = allEvents;
    if (arcFilter) { const arc = arcs.find(a => a.id === arcFilter); if (arc) evs = evs.filter(e => (arc.members||[]).includes(e.id) || (e.tags||[]).some(t => (arc.members||[]).includes(t))); }
    if (fazFilter) { const faz = fazioni.find(f => f.id === fazFilter); if (faz) evs = evs.filter(e => (faz.members||[]).includes(e.id) || (e.tags||[]).some(t => (faz.members||[]).includes(t))); }
    if (catFilter)  evs = evs.filter(e => (e.eventSide || '') === catFilter);
    if (impFilter)  evs = evs.filter(e => (e.importance || 'minore') === impFilter);
    if (typeFilter) evs = evs.filter(e => (e.eventType || 'point') === typeFilter);
    if (fromFilter) evs = evs.filter(e => !e.date || e.date >= fromFilter);
    if (toFilter)   evs = evs.filter(e => !e.date || e.date <= toFilter);
    return [...evs].sort((a, b) => { const da = parseDate(a.date), db = parseDate(b.date); if (!da && !db) return 0; if (!da) return 1; if (!db) return -1; return da - db; });
  }, [allEvents, arcFilter, fazFilter, catFilter, impFilter, typeFilter, fromFilter, toFilter]);

  const hasFilters = arcFilter || fazFilter || catFilter || impFilter || typeFilter || fromFilter || toFilter;
  const resetFilters = () => { setArcFilter(''); setFazFilter(''); setCatFilter(''); setImpFilter(''); setTypeFilter(''); setFromFilter(''); setToFilter(''); };

  const getSide = (ev) => {
    if (!leftCat && !rightCat) return 'right';
    if (leftCat  && ev.eventSide === leftCat)  return 'left';
    if (rightCat && ev.eventSide === rightCat) return 'right';
    return 'center';
  };

  const useSplit = !!(leftCat || rightCat);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">Time<span>line</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuovo evento</button>
      </div>

      {/* Filtri */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px' }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Da</label>
            <input type="text" placeholder="Data inizio…" value={fromFilter} onChange={e => setFromFilter(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: 120 }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px' }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>A</label>
            <input type="text" placeholder="Data fine…" value={toFilter} onChange={e => setToFilter(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: 120 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Tutti i tipi</option>
            <option value="point">◆ Puntuale</option>
            <option value="range">▬ Con durata</option>
          </select>
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }} value={impFilter} onChange={e => setImpFilter(e.target.value)}>
            <option value="">Qualsiasi importanza</option>
            <option value="principale">⭐⭐⭐ Principale</option>
            <option value="primario">⭐⭐ Primario</option>
            <option value="secondario">⭐ Secondario</option>
            <option value="minore">· Minore</option>
          </select>
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Tutti i lati</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          {arcs.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }} value={arcFilter} onChange={e => setArcFilter(e.target.value)}>
              <option value="">Tutti gli archi</option>
              {arcs.map(a => <option key={a.id} value={a.id}>📖 {a.name}</option>)}
            </select>
          )}
          {fazioni.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }} value={fazFilter} onChange={e => setFazFilter(e.target.value)}>
              <option value="">Tutte le fazioni</option>
              {fazioni.map(f => <option key={f.id} value={f.id}>⚔ {f.name}</option>)}
            </select>
          )}
          {hasFilters && <button className="btn-g" style={{ fontSize: 12 }} onClick={resetFilters}>✕ Azzera filtri</button>}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Lati:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>◀ Sx</span>
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 12, padding: '3px 8px' }} value={leftCat} onChange={e => setLeftCat(e.target.value)}>
              <option value="">— nessuna —</option>
              {cats.filter(c => c.id !== rightCat).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dx ▶</span>
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 12, padding: '3px 8px' }} value={rightCat} onChange={e => setRightCat(e.target.value)}>
              <option value="">— nessuna —</option>
              {cats.filter(c => c.id !== leftCat).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {(leftCat || rightCat) && <button className="btn-g" style={{ fontSize: 11 }} onClick={() => { setLeftCat(''); setRightCat(''); }}>✕ Reset</button>}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length} eventi{hasFilters ? ' filtrati' : ''} su {allEvents.length} totali
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Nessun evento</div>
          <div className="empty-sub">{hasFilters ? 'Nessun evento corrisponde ai filtri' : 'Crea il primo evento della timeline'}</div>
        </div>
      ) : (
        <TimelineCanvas
          filtered={filtered} elements={elements} arcs={arcs} cats={cats}
          expanded={expanded} toggleExpand={toggleExpand}
          getSide={getSide} useSplit={useSplit}
          onOpenElement={onOpenElement}
        />
      )}

      {showModal && (
        <ElementModal defaultCat="event"
          onSave={async (data) => { await addEl(data); setShowModal(false); showToast('✓ Evento creato'); }}
          onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
