import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import { getMap, saveMap } from '../firebase/db';

const IMP_KEYS_DATE = ['principale', 'primario', 'secondario', 'minore'];

function EventDateRow({ ev, selected, onSelect }) {
  return (
    <div onClick={onSelect}
      style={{ padding: '9px 12px 9px 22px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected ? 'var(--surface2)' : '' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = selected ? 'var(--surface2)' : ''}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>⚡</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{ev.date}</div>
        </div>
        {selected && <span style={{ fontSize: 11, color: 'var(--gold)', flexShrink: 0 }}>✓</span>}
      </div>
    </div>
  );
}

function DateFilterPicker({ timeFilter, setTimeFilter, dateEvents }) {
  const { t } = useTranslation();
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleGroup = (key) => setCollapsed(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  const selectedEvent = dateEvents.find(e => e.date === timeFilter);
  const filtered = query
    ? dateEvents.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.date.includes(query))
    : null;
  const groups    = IMP_KEYS_DATE
    .map(k => ({ key: k, label: t('importance.' + k), events: dateEvents.filter(e => e.importance === k) }))
    .filter(g => g.events.length > 0);
  const ungrouped = dateEvents.filter(e => !IMP_KEYS_DATE.includes(e.importance));

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: `1px solid ${open ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '4px 10px', minWidth: 200, cursor: 'pointer', transition: 'border-color .2s' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>⏳</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {timeFilter ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selectedEvent && <span style={{ fontSize: 10, color: 'var(--gold)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEvent.name}</span>}
              <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: "'Crimson Pro', serif" }}>{timeFilter}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif" }}>{t('map.time_ph')}</span>
          )}
        </div>
        {timeFilter
          ? <button onClick={e => { e.stopPropagation(); setTimeFilter(''); setQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
          : <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>▼</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 300, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 32px rgba(0,0,0,.6)', zIndex: 400, overflow: 'hidden' }} onMouseDown={e => e.stopPropagation()}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input type="text" placeholder={t('map.time_search_ph')} value={query} onChange={e => setQuery(e.target.value)} autoFocus
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 9px', outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {query && !(filtered || []).find(e => e.date === query) && (
              <div onClick={() => { setTimeFilter(query); setOpen(false); setQuery(''); }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text-muted)' }}>{t('map.use_date')}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: "'Crimson Pro', serif" }}>{query}</span>
              </div>
            )}
            {filtered ? (
              filtered.length === 0
                ? <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('map.no_results')}</div>
                : filtered.map(ev => <EventDateRow key={ev.id} ev={ev} selected={timeFilter === ev.date} onSelect={() => { setTimeFilter(ev.date); setOpen(false); setQuery(''); }} />)
            ) : (
              <>
                {groups.map(g => (
                  <div key={g.key}>
                    <div onClick={() => toggleGroup(g.key)}
                      style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1, userSelect: 'none' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 10 }}>{collapsed.has(g.key) ? '▶' : '▼'}</span>
                      <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, flex: 1, letterSpacing: '.04em' }}>{g.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{g.events.length}</span>
                    </div>
                    {!collapsed.has(g.key) && g.events.map(ev => (
                      <EventDateRow key={ev.id} ev={ev} selected={timeFilter === ev.date} onSelect={() => { setTimeFilter(ev.date); setOpen(false); setQuery(''); }} />
                    ))}
                  </div>
                ))}
                {ungrouped.map(ev => <EventDateRow key={ev.id} ev={ev} selected={timeFilter === ev.date} onSelect={() => { setTimeFilter(ev.date); setOpen(false); setQuery(''); }} />)}
                {dateEvents.length === 0 && <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('map.no_dated_events')}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Converte date DD/MM/YYYY → numero YYYYMMDD; anno singolo → fine anno (YYYY9999)
const parseDate = (str) => {
  if (!str) return 0;
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    return y * 10000 + m * 100 + d;
  }
  const n = parseInt(str.match(/\d+/)?.[0] || '0', 10);
  return n * 10000 + 9999;
};

const IMP_ORDER = { principale: 0, primario: 1, secondario: 2, minore: 3 };

const TRACK_COLORS = ['#e8a0a8','#7ab8d4','#8fbd7c','#d4956a','#b88fc4','#f0c060','#a0d0c0','#c4a0e4','#e4c07a','#a8d4b8'];
function getTrackColor(index) { return TRACK_COLORS[index % TRACK_COLORS.length]; }

const EL_IMP_ORDER = { Alta: 0, Media: 1, Bassa: 2, Trascurabile: 3 };

function TrackPicker({ elements, trackEls, setTrackEls, elColor, elIcon, cats }) {
  const { t } = useTranslation();
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleGroup = (key) => setCollapsed(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  const trackable = elements.filter(e => e.cat !== 'place' && e.cat !== 'event');
  const filtered  = query ? trackable.filter(e => e.name.toLowerCase().includes(query.toLowerCase())) : null;

  const groups = cats
    .filter(cat => cat.id !== 'place' && cat.id !== 'event')
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '●',
      els: trackable
        .filter(e => e.cat === cat.id)
        .sort((a, b) => (EL_IMP_ORDER[a.importance] ?? 4) - (EL_IMP_ORDER[b.importance] ?? 4)),
    }))
    .filter(g => g.els.length > 0);

  const catIds      = new Set(cats.map(c => c.id));
  const uncategorized = trackable
    .filter(e => !catIds.has(e.cat))
    .sort((a, b) => (EL_IMP_ORDER[a.importance] ?? 4) - (EL_IMP_ORDER[b.importance] ?? 4));
  if (uncategorized.length > 0) groups.push({ id: '__other', name: t('map.other_cat'), icon: '●', els: uncategorized });

  const ElRow = ({ el }) => {
    const isSelected    = trackEls.has(el.id);
    const selectedIndex = [...trackEls].indexOf(el.id);
    const color         = isSelected ? getTrackColor(selectedIndex) : null;
    return (
      <div onClick={() => setTrackEls(prev => { const next = new Set(prev); isSelected ? next.delete(el.id) : next.add(el.id); return next; })}
        style={{ padding: '7px 12px 7px 28px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: isSelected ? (color + '1a') : '' }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface2)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? color : 'var(--border)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: isSelected ? 'var(--text)' : 'var(--text-dim)', flex: 1 }}>{elIcon(el)} {el.name}</span>
        {isSelected && <span style={{ fontSize: 11, color }}>✓</span>}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: `1px solid ${open ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '4px 10px', minWidth: 180, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👤</span>
        <span style={{ fontSize: 12, color: trackEls.size ? 'var(--text)' : 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", flex: 1 }}>
          {trackEls.size ? t('map.tracking', { count: trackEls.size }) : t('map.track_ph')}
        </span>
        {trackEls.size > 0
          ? <button onClick={e => { e.stopPropagation(); setTrackEls(new Set()); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>✕</button>
          : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 280, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 32px rgba(0,0,0,.6)', zIndex: 400, overflow: 'hidden' }} onMouseDown={e => e.stopPropagation()}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input type="text" placeholder={t('common.search_browse')} value={query} onChange={e => setQuery(e.target.value)} autoFocus
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 9px', outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered ? (
              filtered.length === 0
                ? <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('map.no_results')}</div>
                : filtered.map(el => <ElRow key={el.id} el={el} />)
            ) : groups.length === 0
              ? <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('map.no_trackable')}</div>
              : groups.map(g => (
                <div key={g.id}>
                  <div onClick={() => toggleGroup(g.id)}
                    style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1, userSelect: 'none' }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 10 }}>{collapsed.has(g.id) ? '▶' : '▼'}</span>
                    <span style={{ fontSize: 13 }}>{g.icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flex: 1 }}>{g.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{g.els.length}</span>
                  </div>
                  {!collapsed.has(g.id) && g.els.map(el => <ElRow key={el.id} el={el} />)}
                </div>
              ))
            }
          </div>
          {trackEls.size > 0 && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('map.selected', { count: trackEls.size })}</span>
              <button className="btn-g" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setTrackEls(new Set()); setOpen(false); }}>{t('map.remove_all')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MapView({ onOpenElement }) {
  const { t } = useTranslation();
  const { elements, elColor, elIcon, uid, wid, allCats } = useWorld();
  const [mapImage,    setMapImage]    = useState('');
  const [pois,        setPois]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [placing,     setPlacing]     = useState(false);
  const [newPoiEl,    setNewPoiEl]    = useState('');
  const [newPoiName,  setNewPoiName]  = useState('');
  const [newPoiColor, setNewPoiColor] = useState('');
  const [pendingPoi,  setPendingPoi]  = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [timeFilter,  setTimeFilter]  = useState('');
  const [trackEls,    setTrackEls]    = useState(new Set());
  const cats = allCats();

  // ── Zoom / Pan ──
  const wrapRef    = useRef(null);
  const imgRef     = useRef(null);
  const transform  = useRef({ x: 0, y: 0, scale: 1 });
  const layerRef   = useRef(null);
  const drag       = useRef(null);
  const didDrag    = useRef(false);
  const [, forceUpdate] = useState(0);

  const [imgArea, setImgArea] = useState({ left: 0, top: 0, w: 1, h: 1 });

  const calcImgArea = () => {
    const img  = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap || !img.naturalWidth) return;
    const wW = wrap.clientWidth;
    const wH = wrap.clientHeight;
    const natAsp = img.naturalWidth / img.naturalHeight;
    const boxAsp = wW / wH;
    let iW, iH, iL, iT;
    if (natAsp > boxAsp) { iW = wW; iH = wW / natAsp; iL = 0; iT = (wH - iH) / 2; }
    else                  { iH = wH; iW = wH * natAsp; iL = (wW - iW) / 2; iT = 0; }
    setImgArea({ left: iL, top: iT, w: iW, h: iH });
  };

  useEffect(() => {
    const ro = new ResizeObserver(calcImgArea);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [mapImage]);

  const applyTransform = () => {
    if (!layerRef.current) return;
    const { x, y, scale } = transform.current;
    layerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  const luoghi = elements.filter(e => e.cat === 'place');
  const dateEvents = elements
    .filter(e => e.cat === 'event' && e.date)
    .sort((a, b) => {
      const ia = IMP_ORDER[a.importance] ?? 4;
      const ib = IMP_ORDER[b.importance] ?? 4;
      if (ia !== ib) return ia - ib;
      return parseDate(a.date) - parseDate(b.date);
    });

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

  const getMapCoords = (clientX, clientY) => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const wRect = wrap.getBoundingClientRect();
    const tr = transform.current;
    const localX = clientX - wRect.left;
    const localY = clientY - wRect.top;
    const preX = (localX - tr.x) / tr.scale;
    const preY = (localY - tr.y) / tr.scale;
    const x = ((preX - imgArea.left) / imgArea.w) * 100;
    const y = ((preY - imgArea.top)  / imgArea.h) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect   = wrap.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    const tr     = transform.current;
    const newScale = Math.min(Math.max(tr.scale * factor, 0.4), 10);
    transform.current = {
      scale: newScale,
      x: mouseX - (mouseX - tr.x) * (newScale / tr.scale),
      y: mouseY - (mouseY - tr.y) * (newScale / tr.scale),
    };
    applyTransform();
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    didDrag.current = false;
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      originX: transform.current.x, originY: transform.current.y,
    };
    if (!placing && wrapRef.current) wrapRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
    if (!placing) {
      transform.current.x = drag.current.originX + dx;
      transform.current.y = drag.current.originY + dy;
      applyTransform();
    }
  };

  const handleMouseUp = (e) => {
    if (wrapRef.current) wrapRef.current.style.cursor = placing ? 'crosshair' : 'grab';
    if (!didDrag.current && placing && e.button === 0) {
      const coords = getMapCoords(e.clientX, e.clientY);
      if (coords) { setPendingPoi(coords); setPlacing(false); }
    }
    drag.current = null;
  };

  const lastPinch = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', handleWheel);
  });

  const handleTouchStart = (e) => {
    didDrag.current = false;
    if (e.touches.length === 1) {
      drag.current = {
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        originX: transform.current.x, originY: transform.current.y,
      };
    }
    if (e.touches.length === 2) {
      drag.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinch.current = { dist: Math.hypot(dx, dy), originScale: transform.current.scale };
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current) {
      const dx = e.touches[0].clientX - drag.current.startX;
      const dy = e.touches[0].clientY - drag.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      if (!placing) {
        transform.current.x = drag.current.originX + dx;
        transform.current.y = drag.current.originY + dy;
        applyTransform();
      }
    }
    if (e.touches.length === 2 && lastPinch.current) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect   = wrap.getBoundingClientRect();
      const cx     = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy     = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const newScale = Math.min(Math.max(lastPinch.current.originScale * dist / lastPinch.current.dist, 0.4), 10);
      const tr = transform.current;
      transform.current = {
        scale: newScale,
        x: cx - (cx - tr.x) * (newScale / tr.scale),
        y: cy - (cy - tr.y) * (newScale / tr.scale),
      };
      applyTransform();
    }
  };

  const handleTouchEnd = (e) => {
    if (placing && !didDrag.current && e.changedTouches.length > 0) {
      const coords = getMapCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (coords) { setPendingPoi(coords); setPlacing(false); }
    }
    drag.current = null;
    lastPinch.current = null;
  };

  const resetView = () => {
    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
    forceUpdate(n => n + 1);
  };

  const confirmPoi = () => {
    if (!pendingPoi) return;
    const luogo = luoghi.find(l => l.id === newPoiEl);
    const poi = { id: Date.now(), name: newPoiName.trim() || luogo?.name || t('map.new_poi_title'), x: pendingPoi.x, y: pendingPoi.y, elementId: newPoiEl || null, color: newPoiColor || null };
    const updated = [...pois, poi];
    setPois(updated);
    save(mapImage, updated);
    setPendingPoi(null); setNewPoiEl(''); setNewPoiName(''); setNewPoiColor('');
  };

  const handleDeletePoi = async (id) => {
    const updated = pois.filter(p => p.id !== id);
    setPois(updated);
    await save(mapImage, updated);
  };

  const getElementsAtPoiAtTime = (poi, date) => {
    if (!poi.elementId) return [];
    const filterN = parseDate(date);
    if (!filterN) return [];
    return elements.filter(el => {
      if (el.cat === 'place') return false;
      const changelog = (el.changelog || []).filter(c => c.date && c.placeId);
      if (!changelog.length) return false;
      const relevant = changelog
        .filter(c => parseDate(c.date) <= filterN)
        .sort((a, b) => parseDate(b.date) - parseDate(a.date));
      if (!relevant.length) return false;
      return relevant[0].placeId === poi.elementId;
    });
  };

  const visiblePois = pois;
  const elementiPerPoi = timeFilter
    ? Object.fromEntries(pois.map(poi => [poi.id, getElementsAtPoiAtTime(poi, timeFilter)]))
    : {};

  const trackPositions = useMemo(() => {
    if (!trackEls.size) return [];
    const results = [];
    let trackIndex = 0;
    trackEls.forEach(elId => {
      const el = elements.find(e => e.id === elId);
      if (!el) return;
      const filterN = timeFilter ? parseDate(timeFilter) : null;
      const entries = (el.changelog || [])
        .filter(c => c.placeId && (!filterN || parseDate(c.date) <= filterN))
        .sort((a, b) => parseDate(a.date) - parseDate(b.date));
      const color = getTrackColor(trackIndex++);
      const positions = entries.map(c => {
        const poi = pois.find(p => p.elementId === c.placeId);
        return poi ? { ...poi, date: c.date, text: c.text, elId, color, elName: el.name } : null;
      }).filter(Boolean);
      if (positions.length) results.push({ elId, color, elName: el.name, positions });
    });
    return results;
  }, [trackEls, elements, pois, timeFilter]);

  if (loading) return <div className="view"><div className="view-loading"><span className="spin">✨</span> {t('map.loading')}</div></div>;

  return (
    <div className="view map-view" style={{ padding: '20px 24px', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
      <div className="view-hd" style={{ marginBottom: 12, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <div className="view-title">🗺 <span>{t('nav.map')}</span></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {mapImage && (
            <>
              <DateFilterPicker timeFilter={timeFilter} setTimeFilter={setTimeFilter} dateEvents={dateEvents} />
              <TrackPicker elements={elements} trackEls={trackEls} setTrackEls={setTrackEls} elColor={elColor} elIcon={elIcon} cats={cats} />
              <button className="btn-p" onClick={() => setPlacing(p => !p)}>
                {placing ? `✕ ${t('common.cancel')}` : t('map.add_place_btn')}
              </button>
              {placing && <span style={{ fontSize: 12, color: 'var(--gold)', fontStyle: 'italic' }}>{t('map.click_hint')}</span>}
            </>
          )}
          <label className="btn-sm" style={{ cursor: 'pointer' }}>
            🖼 {mapImage ? t('map.change_img') : t('map.load_map')}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {!mapImage ? (
        <div className="empty" style={{ flex: 1 }}>
          <div className="empty-icon">🗺</div>
          <div className="empty-title">{t('map.empty_title')}</div>
          <div className="empty-sub">{t('map.empty_sub')}</div>
          <label className="btn-p" style={{ marginTop: 16, cursor: 'pointer' }}>
            🖼 {t('map.load_map')}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
        </div>
      ) : (
        <div
          ref={wrapRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', cursor: placing ? 'crosshair' : 'grab', touchAction: 'none', background: '#111' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { drag.current = null; if (wrapRef.current) wrapRef.current.style.cursor = placing ? 'crosshair' : 'grab'; }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button onClick={e => { e.stopPropagation(); resetView(); }}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 30, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 11, padding: '4px 8px', cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
            ⊡ Reset
          </button>

          <div ref={layerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transformOrigin: '0 0', transform: 'translate(0px, 0px) scale(1)' }}>

            <img
              ref={imgRef}
              src={mapImage}
              alt={t('nav.map')}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
              onLoad={calcImgArea}
              draggable={false}
            />

            {trackPositions.length > 0 && (
              <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                {trackPositions.map(({ elId, color, positions }) =>
                  positions.map((p, i) => {
                    if (i === 0) return null;
                    const prev = positions[i - 1];
                    return (
                      <g key={`${elId}-${i}`}>
                        <line
                          x1={imgArea.left + imgArea.w * prev.x / 100}
                          y1={imgArea.top  + imgArea.h * prev.y / 100}
                          x2={imgArea.left + imgArea.w * p.x    / 100}
                          y2={imgArea.top  + imgArea.h * p.y    / 100}
                          stroke={color} strokeWidth={2} strokeDasharray="5 3" strokeOpacity={0.8} />
                        <text x={`${p.x}%`} y={`${p.y}%`} dy={-14} textAnchor="middle"
                          style={{ fontSize: 9, fill: color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none' }}>
                          {p.date}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            )}

            {visiblePois.map(poi => {
              const luogo    = poi.elementId ? elements.find(e => e.id === poi.elementId) : null;
              const color    = poi.color || (luogo ? elColor(luogo) : '#c9a84c');
              const isSel    = selected === poi.id;
              const presenti = timeFilter ? (elementiPerPoi[poi.id] || []) : [];

              return (
                <div key={poi.id}
                  style={{ position: 'absolute',
                  left: `${imgArea.left + imgArea.w * poi.x / 100}px`,
                  top:  `${imgArea.top  + imgArea.h * poi.y / 100}px`,
                  transform: 'translate(-50%, -100%)', zIndex: isSel ? 10 : 5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>

                    {isSel && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px', boxShadow: '0 6px 24px rgba(0,0,0,.7)', minWidth: 180, maxWidth: 240, zIndex: 20, pointerEvents: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 2, paddingRight: 16 }}>{poi.name}</div>
                        {luogo && luogo.name !== poi.name && <div style={{ fontSize: 11, color, marginBottom: 4 }}>📍 {luogo.name}</div>}
                        {luogo?.desc && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>{luogo.desc.length > 80 ? luogo.desc.slice(0, 80) + '…' : luogo.desc}</div>}
                        {timeFilter && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 5 }}>
                              {t('map.present_on', { date: timeFilter })} — {presenti.length > 0 ? t('map.present_count', { count: presenti.length }) : t('map.nobody')}
                            </div>
                            {presenti.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {presenti.map(el => (
                                  <span key={el.id} onClick={() => onOpenElement(el.id)}
                                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: elColor(el) + '22', border: `1px solid ${elColor(el)}55`, color: elColor(el), cursor: 'pointer' }}>
                                    {elIcon(el)} {el.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 5 }}>
                          {luogo && <button className="btn-g" style={{ fontSize: 10, padding: '3px 9px' }} onClick={() => { onOpenElement(luogo.id); setSelected(null); }}>{t('map.open_card')}</button>}
                          <button className="btn-d" style={{ fontSize: 10, padding: '3px 9px' }} onClick={() => { handleDeletePoi(poi.id); setSelected(null); }}>{t('map.poi_remove')}</button>
                        </div>
                      </div>
                    )}

                    <div onClick={e => { e.stopPropagation(); setSelected(isSel ? null : poi.id); }}
                      style={{ width: presenti.length > 0 ? 18 : 14, height: presenti.length > 0 ? 18 : 14, borderRadius: '50% 50% 50% 0', transform: isSel ? 'rotate(-45deg) scale(1.25)' : 'rotate(-45deg)', background: color, border: '2px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: presenti.length > 0 ? `0 0 8px ${color}` : '0 2px 4px rgba(0,0,0,.6)', transition: 'all .2s', cursor: 'pointer' }}>
                    </div>

                    {timeFilter && presenti.length > 0 && (
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: 'var(--gold)', color: 'var(--bg)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)', pointerEvents: 'none' }}>
                        {presenti.length}
                      </div>
                    )}

                    {trackPositions.map(({ elId, color: tColor, positions }) => {
                      const isHere = positions.length > 0 && positions[positions.length - 1].id === poi.id;
                      if (!isHere) return null;
                      const tIdx = trackPositions.findIndex(tr => tr.elId === elId);
                      return (
                        <div key={elId} style={{ position: 'absolute', bottom: -4, left: '50%', transform: `translateX(calc(-50% + ${tIdx * 10 - (trackPositions.length - 1) * 5}px)) rotate(45deg)`, width: 8, height: 8, borderRadius: '50%', background: tColor, border: '1px solid var(--surface)', pointerEvents: 'none' }} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {pendingPoi && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 16px', zIndex: 50, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,.7)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>{t('map.new_poi_title')}</div>
              <input className="fi" style={{ fontSize: 13, marginBottom: 8 }} placeholder={t('map.poi_name_ph')} value={newPoiName} onChange={e => setNewPoiName(e.target.value)} autoFocus autoComplete="off" />
              <select className="fs" style={{ fontSize: 13, marginBottom: 10 }} value={newPoiEl} onChange={e => setNewPoiEl(e.target.value)}>
                <option value="">{t('map.poi_link_ph')}</option>
                {luoghi.map(l => <option key={l.id} value={l.id}>📍 {l.name}</option>)}
              </select>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{t('map.color_lbl')}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { c: '', label: 'A' },
                    { c: '#e07070' }, { c: '#d4956a' }, { c: '#d4a84c' },
                    { c: '#8fbd7c' }, { c: '#7ab8d4' }, { c: '#b88fc4' },
                    { c: '#f0e0b0' }, { c: '#c9a84c' }, { c: '#a0d0c0' },
                  ].map(({ c, label }) => (
                    <div key={c} onClick={() => setNewPoiColor(c)}
                      style={{ width: 22, height: 22, borderRadius: c ? '50% 50% 50% 0' : 6, transform: c ? 'rotate(-45deg)' : 'none', background: c || 'var(--surface3)', border: newPoiColor === c ? '2px solid var(--gold)' : '2px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: newPoiColor === c ? '0 0 0 2px var(--gold-dim)' : 'none', transition: 'all .15s', flexShrink: 0 }}>
                      {!c && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-g" style={{ flex: 1, fontSize: 12 }} onClick={() => { setPendingPoi(null); setNewPoiEl(''); setNewPoiName(''); setNewPoiColor(''); }}>{t('common.cancel')}</button>
                <button className="btn-p" style={{ flex: 1, fontSize: 12 }} onClick={confirmPoi}>{t('map.confirm_btn')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
