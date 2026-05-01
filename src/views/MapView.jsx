import { useState, useRef, useEffect } from 'react';
import { useWorld } from '../hooks/useWorld';
import { getMap, saveMap } from '../firebase/db';

function DateFilterPicker({ timeFilter, setTimeFilter, dateEvents }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query
    ? dateEvents.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.date.includes(query)
      )
    : dateEvents;

  const selectedEvent = dateEvents.find(e => e.date === timeFilter);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: `1px solid ${open ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '4px 10px', minWidth: 200, cursor: 'pointer', transition: 'border-color .2s' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>⏳</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {timeFilter ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selectedEvent && (
                <span style={{ fontSize: 10, color: 'var(--gold)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedEvent.name}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: "'Crimson Pro', serif" }}>{timeFilter}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif" }}>Scegli un momento…</span>
          )}
        </div>
        {timeFilter
          ? <button onClick={e => { e.stopPropagation(); setTimeFilter(''); setQuery(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
          : <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>▼</span>
        }
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          width: 280, background: 'var(--surface)',
          border: '1px solid var(--border-light)', borderRadius: 'var(--r)',
          boxShadow: '0 8px 32px rgba(0,0,0,.6)', zIndex: 400,
          overflow: 'hidden',
        }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Ricerca */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Cerca evento o scrivi data…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 9px', outline: 'none' }}
            />
          </div>

          {/* Lista eventi */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {/* Opzione data manuale se ha scritto qualcosa che non corrisponde a un evento */}
            {query && !filtered.find(e => e.date === query) && (
              <div
                onClick={() => { setTimeFilter(query); setOpen(false); setQuery(''); }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text-muted)' }}>Usa data</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: "'Crimson Pro', serif" }}>{query}</span>
              </div>
            )}

            {filtered.length === 0 && !query && (
              <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Nessun evento con data nella timeline
              </div>
            )}

            {filtered.map(ev => (
              <div key={ev.id}
                onClick={() => { setTimeFilter(ev.date); setOpen(false); setQuery(''); }}
                style={{
                  padding: '10px 12px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: timeFilter === ev.date ? 'var(--surface2)' : '',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = timeFilter === ev.date ? 'var(--surface2)' : ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚡</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{ev.date}</div>
                  </div>
                  {timeFilter === ev.date && <span style={{ fontSize: 11, color: 'var(--gold)', flexShrink: 0 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TRACK_COLORS = [
  '#e8a0a8', // rosa
  '#7ab8d4', // blu
  '#8fbd7c', // verde
  '#d4956a', // arancio
  '#b88fc4', // viola
  '#f0c060', // giallo
  '#a0d0c0', // acqua
  '#c4a0e4', // lavanda
  '#e4c07a', // oro
  '#a8d4b8', // menta
];

function getTrackColor(index) {
  return TRACK_COLORS[index % TRACK_COLORS.length];
}

export default function MapView({ onOpenElement }) {
  const { elements, elColor, elIcon, uid, wid } = useWorld();
  const [mapImage,   setMapImage]   = useState('');
  const [pois,       setPois]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [placing,    setPlacing]    = useState(false);
  const [newPoiEl,   setNewPoiEl]   = useState('');
  const [newPoiName, setNewPoiName] = useState('');
  const [selected,   setSelected]   = useState(null);
  const [elQuery,    setElQuery]    = useState('');
  const [elOpen,     setElOpen]     = useState(false);
  const [timeFilter, setTimeFilter] = useState('');
  const [trackEls, setTrackEls] = useState(new Set());
  const [trackQ,   setTrackQ]   = useState('');
  const [trackOpen,setTrackOpen]= useState(false);
  const imgRef  = useRef(null);
  const wrapRef = useRef(null);

  // Tutti i luoghi
  const luoghi = elements.filter(e => e.cat === 'place');

  // Tutti gli eventi con data per il menu a tendina
  const dateEvents = elements
    .filter(e => e.cat === 'event' && e.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Date uniche da changelog di tutti gli elementi
  const allDates = [...new Set([
    ...dateEvents.map(e => e.date),
    ...elements.flatMap(e => (e.changelog || []).map(c => c.date)).filter(Boolean),
  ])].sort();

  useEffect(() => {
    if (!uid || !wid) return;
    getMap(uid, wid)
      .then(data => { setMapImage(data.image || ''); setPois(data.pois || []); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [uid, wid]);

  const save = async (image, newPois) => {
    if (!uid || !wid) return;
    try { await saveMap(uid, wid, { image, pois: newPois }); }
    catch (e) { console.error(e); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(file, { maxSizeMB: 0.9, maxWidthOrHeight: 4000, useWebWorker: true, initialQuality: 0.95 });
      const reader = new FileReader();
      reader.onload = async (ev) => { const base64 = ev.target.result; setMapImage(base64); await save(base64, pois); };
      reader.readAsDataURL(compressed);
    } catch (err) { console.error(err); }
  };

  const handleMapClick = (e) => {
    if (!placing || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    const luogo = luoghi.find(l => l.id === newPoiEl);
    const poi = {
      id:        Date.now(),
      name:      newPoiName.trim() || luogo?.name || 'Luogo',
      x, y,
      elementId: newPoiEl || null,
    };
    const updated = [...pois, poi];
    setPois(updated);
    save(mapImage, updated);
    setPlacing(false);
    setNewPoiEl('');
    setNewPoiName('');
  };

  const handleDeletePoi = async (id) => {
    const updated = pois.filter(p => p.id !== id);
    setPois(updated);
    await save(mapImage, updated);
  };

  // Elementi presenti in un luogo in un dato momento
  const getElementsAtPoiAtTime = (poi, date) => {
  if (!poi.elementId) return [];
  return elements.filter(el => {
    if (el.cat === 'place') return false;
    const changelog = (el.changelog || []).filter(c => c.date && c.placeId);
    if (!changelog.length) return false;
    // Ordina per data e prendi l'ultima voce <= data selezionata
    const relevant = changelog
      .filter(c => c.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!relevant.length) return false;
    return relevant[0].placeId === poi.elementId;
  });
};

  // POI visibili in base al filtro temporale
  const visiblePois = pois;

// Per ogni POI, calcola gli elementi presenti alla data selezionata
const elementiPerPoi = timeFilter
  ? Object.fromEntries(pois.map(poi => [poi.id, getElementsAtPoiAtTime(poi, timeFilter)]))
  : {};

  // Tracciamento spostamenti
  const trackPositions = (() => {
  if (!trackEls.size) return [];
  const results = [];
  let trackIndex = 0;
trackEls.forEach(elId => {
  const el = elements.find(e => e.id === elId);
  if (!el) return;
  const entries = (el.changelog || [])
    .filter(c => c.placeId && (!timeFilter || c.date <= timeFilter))
    .sort((a, b) => a.date.localeCompare(b.date));
  const color = getTrackColor(trackIndex);
  trackIndex++;
    const positions = entries.map(c => {
      const poi = pois.find(p => p.elementId === c.placeId);
      return poi ? { ...poi, date: c.date, text: c.text, elId, color, elName: el.name } : null;
    }).filter(Boolean);
    if (positions.length) results.push({ elId, color, elName: el.name, positions });
  });
  return results;
})();

  const elSuggestions = elQuery
    ? elements.filter(e => e.name.toLowerCase().includes(elQuery.toLowerCase())).slice(0, 6)
    : [];

  if (loading) return <div className="view"><div className="view-loading"><span className="spin">✨</span> Caricamento mappa…</div></div>;

  return (
    <div className="view" style={{ padding: '20px 24px', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
      <div className="view-hd" style={{ marginBottom: 12, flexShrink: 0 }}>
        <div className="view-title">🗺 <span>Mappa</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          {mapImage && (
            <>
              {/* Filtro temporale con datalist */}
              <DateFilterPicker
  timeFilter={timeFilter}
  setTimeFilter={setTimeFilter}
  dateEvents={dateEvents}
/>

              {/* Traccia elemento */}
              {/* Traccia elementi — multi-selezione */}
<div style={{ position: 'relative' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: `1px solid ${trackOpen ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '4px 10px', minWidth: 180, cursor: 'pointer' }}
    onClick={() => setTrackOpen(o => !o)}>
    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👤</span>
    <span style={{ fontSize: 12, color: trackEls.size ? 'var(--text)' : 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", flex: 1 }}>
      {trackEls.size ? `${trackEls.size} element${trackEls.size !== 1 ? 'i' : 'o'} tracciati` : 'Traccia elementi…'}
    </span>
    {trackEls.size > 0
      ? <button onClick={e => { e.stopPropagation(); setTrackEls(new Set()); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>✕</button>
      : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
    }
  </div>

  {trackOpen && (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 32px rgba(0,0,0,.6)', zIndex: 400, overflow: 'hidden' }}
      onMouseDown={e => e.stopPropagation()}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <input type="text" placeholder="Cerca elemento…" value={trackQ}
          onChange={e => setTrackQ(e.target.value)} autoFocus
          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 9px', outline: 'none' }} />
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {elements
          .filter(e => e.cat !== 'place' && e.cat !== 'event' && (e.changelog || []).some(c => c.placeId))
          .filter(e => !trackQ || e.name.toLowerCase().includes(trackQ.toLowerCase()))
          .map((el, idx) => {
  const isSelected = trackEls.has(el.id);
  const selectedIndex = [...trackEls].indexOf(el.id);
  const color = isSelected ? getTrackColor(selectedIndex) : 'var(--border)';
            return (
              <div key={el.id}
                onClick={() => {
                  setTrackEls(prev => {
                    const next = new Set(prev);
                    isSelected ? next.delete(el.id) : next.add(el.id);
                    return next;
                  });
                }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: isSelected ? color + '11' : '' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? color : 'var(--border)', flexShrink: 0, transition: 'background .15s' }} />
                <span style={{ fontSize: 13, color: isSelected ? 'var(--text)' : 'var(--text-dim)', flex: 1 }}>{elIcon(el)} {el.name}</span>
                {isSelected && <span style={{ fontSize: 11, color }}>✓</span>}
              </div>
            );
          })
        }
      </div>
      {trackEls.size > 0 && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trackEls.size} selezionat{trackEls.size !== 1 ? 'i' : 'o'}</span>
          <button className="btn-g" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setTrackEls(new Set()); setTrackOpen(false); }}>Rimuovi tutti</button>
        </div>
      )}
    </div>
  )}
</div>

              {/* Aggiungi POI */}
              {!placing ? (
                <button className="btn-p" onClick={() => setPlacing(true)}>+ Aggiungi luogo</button>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--gold-dim)', borderRadius: 'var(--r)', padding: '6px 10px' }}>
                  <span style={{ fontSize: 11, color: 'var(--gold)' }}>Clicca sulla mappa →</span>
                  <input className="fi" style={{ margin: 0, fontSize: 12, width: 110, padding: '3px 7px' }}
                    placeholder="Nome luogo…" value={newPoiName} onChange={e => setNewPoiName(e.target.value)} autoComplete="off" />
                  <select className="fs" style={{ margin: 0, fontSize: 12, padding: '3px 7px', width: 150 }}
                    value={newPoiEl} onChange={e => setNewPoiEl(e.target.value)}>
                    <option value="">— Collega a luogo (opz.) —</option>
                    {luoghi.map(l => <option key={l.id} value={l.id}>📍 {l.name}</option>)}
                  </select>
                  <button className="btn-g" style={{ fontSize: 11 }} onClick={() => { setPlacing(false); setNewPoiEl(''); setNewPoiName(''); }}>Annulla</button>
                </div>
              )}
            </>
          )}

          <label className="btn-sm" style={{ cursor: 'pointer' }}>
            🖼 {mapImage ? 'Cambia immagine' : 'Carica mappa'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {/* Canvas */}
      {!mapImage ? (
        <div className="empty" style={{ flex: 1 }}>
          <div className="empty-icon">🗺</div>
          <div className="empty-title">Nessuna mappa caricata</div>
          <div className="empty-sub">Carica un'immagine per iniziare</div>
          <label className="btn-p" style={{ marginTop: 16, cursor: 'pointer' }}>
            🖼 Carica mappa
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
        </div>
      ) : (
        <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', cursor: placing ? 'crosshair' : 'default' }}>
          <img ref={imgRef} src={mapImage} alt="Mappa"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none' }}
            onClick={e => { handleMapClick(e); setSelected(null); }}
            draggable={false}
          />

          {/* Linee tracciamento multi-elemento */}
{trackPositions.length > 0 && (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    {trackPositions.map(({ elId, color, positions }) =>
      positions.map((p, i) => {
        if (i === 0) return null;
        const prev = positions[i - 1];
        return (
          <g key={`${elId}-${i}`}>
            <line x1={`${prev.x}%`} y1={`${prev.y}%`} x2={`${p.x}%`} y2={`${p.y}%`}
              stroke={color} strokeWidth={2} strokeDasharray="5 3" strokeOpacity={0.8} />
            {/* Etichetta data sul punto */}
            <text x={`${p.x}%`} y={`${p.y}%`} dy={-14}
              textAnchor="middle" style={{ fontSize: 9, fill: color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none' }}>
              {p.date}
            </text>
          </g>
        );
      })
    )}
  </svg>
)}

          {/* POI */}
          {visiblePois.map(poi => {
            const luogo   = poi.elementId ? elements.find(e => e.id === poi.elementId) : null;
            const color   = luogo ? elColor(luogo) : '#c9a84c';
            const isSel   = selected === poi.id;
            const isTrack = trackPositions.some(p => p.id === poi.id);

            // Elementi presenti in questo luogo al momento del filtro temporale
            const presenti = timeFilter ? (elementiPerPoi[poi.id] || []) : [];

            return (
              <div key={poi.id}
                style={{ position: 'absolute', left: `${poi.x}%`, top: `${poi.y}%`, transform: 'translate(-50%, -100%)', zIndex: isSel ? 10 : 5 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>

                  {/* Card al click */}
                  {isSel && (
                    <div
                      style={{
                        position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--surface3)', border: '1px solid var(--border-light)',
                        borderRadius: 8, padding: '10px 12px',
                        boxShadow: '0 6px 24px rgba(0,0,0,.7)',
                        minWidth: 180, maxWidth: 240, zIndex: 20,
                        pointerEvents: 'auto',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button onClick={() => setSelected(null)}
                        style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>

                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 2, paddingRight: 16 }}>
                        {poi.name}
                      </div>
                      {luogo && luogo.name !== poi.name && (
                        <div style={{ fontSize: 11, color, marginBottom: 4 }}>📍 {luogo.name}</div>
                      )}
                      {luogo?.desc && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>
                          {luogo.desc.length > 80 ? luogo.desc.slice(0, 80) + '…' : luogo.desc}
                        </div>
                      )}

                      {/* Elementi presenti al momento del filtro temporale */}
                      {timeFilter && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 5 }}>
                            Presenti il {timeFilter}
                            {presenti.length > 0
                              ? ` — ${presenti.length} element${presenti.length !== 1 ? 'i' : 'o'}`
                              : ' — nessuno'}
                          </div>
                          {presenti.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {presenti.map(el => (
                                <span key={el.id}
                                  onClick={() => onOpenElement(el.id)}
                                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: elColor(el) + '22', border: `1px solid ${elColor(el)}55`, color: elColor(el), cursor: 'pointer' }}>
                                  {elIcon(el)} {el.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 5 }}>
                        {luogo && (
                          <button className="btn-g" style={{ fontSize: 10, padding: '3px 9px' }}
                            onClick={() => { onOpenElement(luogo.id); setSelected(null); }}>
                            Apri scheda
                          </button>
                        )}
                        <button className="btn-d" style={{ fontSize: 10, padding: '3px 9px' }}
                          onClick={() => { handleDeletePoi(poi.id); setSelected(null); }}>
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Marker */}
                  <div
  onClick={e => { e.stopPropagation(); setSelected(isSel ? null : poi.id); }}
  style={{
    width: presenti.length > 0 ? 26 : 22,
    height: presenti.length > 0 ? 26 : 22,
    borderRadius: '50% 50% 50% 0',
    transform: isSel ? 'rotate(-45deg) scale(1.25)' : 'rotate(-45deg)',
    background: isSel ? color + '55' : presenti.length > 0 ? color + '44' : color + '33',
    border: `2px solid ${color}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: presenti.length > 0
      ? `0 0 12px ${color}, 0 0 24px ${color}55`
      : isTrack ? `0 0 8px ${color}` : '0 2px 6px rgba(0,0,0,.5)',
    transition: 'all .2s', cursor: 'pointer',
  }}
>
  <span style={{ transform: 'rotate(45deg)', fontSize: presenti.length > 0 ? 12 : 10 }}>📍</span>
</div>

                 {/* Badge numero elementi presenti */}
{timeFilter && presenti.length > 0 && (
  <div style={{
    position: 'absolute', top: -6, right: -6,
    width: 16, height: 16, borderRadius: '50%',
    background: 'var(--gold)', color: 'var(--bg)',
    fontSize: 9, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: 'rotate(45deg)',
    pointerEvents: 'none',
  }}>
    {presenti.length}
  </div>
)}

{/* Pallini colorati per elementi tracciati presenti in questo POI */}
{trackPositions.map(({ elId, color, positions }) => {
  // L'elemento tracciato è in questo POI se l'ultima posizione <= timeFilter punta qui
  const isHere = positions.length > 0 && positions[positions.length - 1].id === poi.id;
  if (!isHere) return null;
  return (
    <div key={elId} style={{
      position: 'absolute', bottom: -4, left: '50%',
      transform: 'translateX(-50%) rotate(45deg)',
      width: 8, height: 8, borderRadius: '50%',
      background: color,
      border: '1px solid var(--surface)',
      pointerEvents: 'none',
      marginLeft: trackPositions.indexOf(trackPositions.find(t => t.elId === elId)) * 10 - (trackPositions.length - 1) * 5,
    }} />
  );
})}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}