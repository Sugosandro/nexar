import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import { saveGraphPositions, getGraphPositions } from '../firebase/db';

const NODE_RADIUS = 28;

function buildGraph(elements, arcs, fazioni, allCats) {
  const nodes = [];
  const edges = [];
  const catColor = (catId) => allCats.find(c => c.id === catId)?.color || '#888';

  elements.forEach(el => nodes.push({ id: `el-${el.id}`, label: el.name, type: 'element', cat: el.cat, color: catColor(el.cat), raw: el }));
  arcs.forEach(a    => nodes.push({ id: `arc-${a.id}`,  label: a.name,  type: 'arc',     color: '#e8a0a8', raw: a }));
  fazioni.forEach(f => nodes.push({ id: `faz-${f.id}`,  label: f.name,  type: 'fazione', color: '#f0c060', raw: f }));

  elements.forEach(el => (el.tags || []).forEach(tid => {
    if (elements.find(e => e.id === tid))
      edges.push({ from: `el-${el.id}`, to: `el-${tid}`, type: 'tag', color: '#3a3830' });
  }));
  arcs.forEach(a => (a.members || []).forEach(mid => {
    if (elements.find(e => e.id === mid))
      edges.push({ from: `arc-${a.id}`, to: `el-${mid}`, type: 'arc', color: '#4a2028' });
  }));
  fazioni.forEach(f => {
    (f.members || []).forEach(mid => {
      if (elements.find(e => e.id === mid))
        edges.push({ from: `faz-${f.id}`, to: `el-${mid}`, type: 'fazione', color: '#4a3810' });
    });
    (f.rels || []).forEach(r => {
      const relColor = r.type === 'enemy' ? '#4a1515' : r.type === 'ally' ? '#1a3820' : '#2a2820';
      edges.push({ from: `faz-${f.id}`, to: `faz-${r.fazId}`, type: 'rel', color: relColor });
    });
  });

  return { nodes, edges };
}

function forceLayout(nodes, edges, width, height) {
  const pos = {};
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(width, height) * 0.35;
    pos[n.id] = {
      x: width / 2 + r * Math.cos(angle) + (Math.random() - .5) * 60,
      y: height / 2 + r * Math.sin(angle) + (Math.random() - .5) * 60,
    };
  });
  for (let iter = 0; iter < 80; iter++) {
    const forces = {};
    nodes.forEach(n => { forces[n.id] = { x: 0, y: 0 }; });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = pos[b.id].x - pos[a.id].x;
        const dy = pos[b.id].y - pos[a.id].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 4000 / (dist * dist);
        forces[a.id].x -= (dx / dist) * force;
        forces[a.id].y -= (dy / dist) * force;
        forces[b.id].x += (dx / dist) * force;
        forces[b.id].y += (dy / dist) * force;
      }
    }
    edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 120) * 0.03;
      forces[e.from].x += (dx / dist) * force;
      forces[e.from].y += (dy / dist) * force;
      forces[e.to].x   -= (dx / dist) * force;
      forces[e.to].y   -= (dy / dist) * force;
    });
    nodes.forEach(n => {
      pos[n.id].x = Math.max(NODE_RADIUS + 10, Math.min(width  - NODE_RADIUS - 10, pos[n.id].x + forces[n.id].x * 0.4));
      pos[n.id].y = Math.max(NODE_RADIUS + 10, Math.min(height - NODE_RADIUS - 10, pos[n.id].y + forces[n.id].y * 0.4));
    });
  }
  return pos;
}

export default function ConnectionsView({ onOpenElement, onOpenFazione, onOpenArc }) {
  const { t } = useTranslation();
  const { elements, arcs, fazioni, allCats, uid, wid } = useWorld();
  const svgRef = useRef(null);
  const lastTouchDist = useRef(null);
  const saveTimeout = useRef(null);

  const [pos,           setPos]           = useState({});
  const [drag,          setDrag]          = useState(null);
  const [hover,         setHover]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [focusEls,      setFocusEls]      = useState(new Set());
  const [focusQuery,    setFocusQuery]    = useState('');
  const [focusOpen,     setFocusOpen]     = useState(false);
  const [viewBox,       setViewBox]       = useState(null);
  const [panning,       setPanning]       = useState(null);
  const [posLoaded, setPosLoaded] = useState(false);

  const cats = allCats();
  const usedCatIds = [...new Set(elements.map(e => e.cat))];
  const catFilters = cats.filter(c => usedCatIds.includes(c.id))
    .map(c => ({ key: `el-${c.id}`, label: `${c.icon} ${c.name}`, color: c.color }));
  const extraFilters = [
    ...(arcs.length    > 0 ? [{ key: 'arc',    label: `📖 ${t('nav.arcs')}`,     color: '#e8a0a8' }] : []),
    ...(fazioni.length > 0 ? [{ key: 'fazione', label: `⚔ ${t('nav.factions')}`, color: '#f0c060' }] : []),
  ];
  const allFilterKeys = [...catFilters.map(f => f.key), ...extraFilters.map(f => f.key)];
  const [activeFilters, setActiveFilters] = useState(() => new Set(allFilterKeys));

  useEffect(() => { setActiveFilters(new Set(allFilterKeys)); }, [cats.length, arcs.length, fazioni.length]);

  const toggleFilter = (key) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const { nodes, edges } = buildGraph(elements, arcs, fazioni, cats);

  let visibleNodes = nodes.filter(n => {
    if (n.type === 'element') return activeFilters.has(`el-${n.cat}`);
    if (n.type === 'arc')     return activeFilters.has('arc');
    if (n.type === 'fazione') return activeFilters.has('fazione');
    return true;
  });

  if (focusEls.size > 0) {
    const focusNodeIds = new Set();
    focusEls.forEach(elId => {
      const nodeId = `el-${elId}`;
      focusNodeIds.add(nodeId);
      edges.forEach(e => {
        if (e.from === nodeId) focusNodeIds.add(e.to);
        if (e.to   === nodeId) focusNodeIds.add(e.from);
      });
    });
    visibleNodes = visibleNodes.filter(n => focusNodeIds.has(n.id));
  }

  const visibleIds   = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleIds.has(e.from) && visibleIds.has(e.to));

  useEffect(() => {
  if (!svgRef.current || !uid || !wid) return;
  const rect = svgRef.current.getBoundingClientRect();
  const w = rect.width  || 800;
  const h = rect.height || 600;

  setViewBox({ x: 0, y: 0, w, h });

  // Carica posizioni salvate da Firebase
  getGraphPositions(uid, wid).then(savedPos => {
    const computed = forceLayout(visibleNodes, visibleEdges, w, h);
    // Usa le posizioni salvate dove disponibili, altrimenti usa quelle calcolate
    const merged = {};
    visibleNodes.forEach(n => {
      merged[n.id] = savedPos[n.id] || computed[n.id];
    });
    setPos(merged);
    setPosLoaded(true);
  });
}, [elements.length, arcs.length, fazioni.length, cats.length, focusEls.size, activeFilters.size, uid, wid]);

  // ── Helpers coordinate ──
  const getCoords = (e) => {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  // ── Drag nodo ──
  const onDragStart = useCallback((e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getCoords(e);
    setDrag({ id: nodeId, ox: x - (pos[nodeId]?.x || 0), oy: y - (pos[nodeId]?.y || 0) });
  }, [pos]);

  // ── Pan e zoom ──
  const svgToWorld = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !viewBox) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width  * viewBox.w + viewBox.x,
      y: (clientY - rect.top)  / rect.height * viewBox.h + viewBox.y,
    };
  }, [viewBox]);

  const handleSvgPointerDown = useCallback((e) => {
    if (drag) return;
    const { x, y } = getCoords(e);
    setPanning({ startX: x, startY: y, startVB: viewBox ? { ...viewBox } : null });
  }, [drag, viewBox]);


const handleSvgPointerMove = useCallback((e) => {
  if (drag) {
    const { x, y } = getCoords(e);
    const newPos = { x: x - drag.ox, y: y - drag.oy };
    setPos(p => {
      const updated = { ...p, [drag.id]: newPos };
      // Salva con debounce — aspetta 800ms dopo l'ultimo movimento
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (uid && wid) saveGraphPositions(uid, wid, updated);
      }, 800);
      return updated;
    });
    return;
  }
  if (panning?.startVB) {
    const { x, y } = getCoords(e);
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (x - panning.startX) * (panning.startVB.w / rect.width);
    const dy = (y - panning.startY) * (panning.startVB.h / rect.height);
    setViewBox({ ...panning.startVB, x: panning.startVB.x - dx, y: panning.startVB.y - dy });
  }
}, [drag, panning, uid, wid]);

  const handleSvgPointerUp = useCallback(() => {
    setDrag(null);
    setPanning(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (!viewBox) return;
    const factor = e.deltaY > 0 ? 1.12 : 0.88;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) / rect.width  * viewBox.w + viewBox.x;
    const my = (e.clientY - rect.top)  / rect.height * viewBox.h + viewBox.y;
    setViewBox({
      x: mx - (mx - viewBox.x) * factor,
      y: my - (my - viewBox.y) * factor,
      w: viewBox.w * factor,
      h: viewBox.h * factor,
    });
  }, [viewBox]);

  // ── Touch: pinch zoom ──
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else {
      handleSvgPointerDown(e);
    }
  }, [handleSvgPointerDown]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && lastTouchDist.current && viewBox) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = lastTouchDist.current / dist;
      lastTouchDist.current = dist;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const mx = (cx - rect.left) / rect.width  * viewBox.w + viewBox.x;
      const my = (cy - rect.top)  / rect.height * viewBox.h + viewBox.y;
      setViewBox(vb => ({
        x: mx - (mx - vb.x) * factor,
        y: my - (my - vb.y) * factor,
        w: vb.w * factor,
        h: vb.h * factor,
      }));
    } else {
      handleSvgPointerMove(e);
    }
  }, [handleSvgPointerMove, viewBox]);

  const handleNodeClick = (node) => {
    if (node.type === 'element') onOpenElement(node.raw.id);
    else if (node.type === 'arc') onOpenArc(node.raw.id);
    else if (node.type === 'fazione') onOpenFazione(node.raw.id);
  };

  const focusSuggestions = focusQuery
    ? elements.filter(e => !focusEls.has(e.id) && e.name.toLowerCase().includes(focusQuery.toLowerCase())).slice(0, 6)
    : [];

  if (elements.length === 0) return (
    <div className="view">
      <div className="view-hd"><div className="view-title">🕸 <span>{t('nav.connections')}</span></div></div>
      <div className="empty"><div className="empty-icon">🕸</div><div className="empty-title">{t('conn.empty_title')}</div><div className="empty-sub">{t('conn.empty_sub')}</div></div>
    </div>
  );

  return (
    <div className="view" style={{ padding: '20px 24px', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
      <div className="view-hd" style={{ marginBottom: 10, flexShrink: 0 }}>
        <div className="view-title">🕸 <span>{t('nav.connections')}</span></div>
      </div>

      {/* Filtri categoria */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, flexShrink: 0, alignItems: 'center' }}>
        {[...catFilters, ...extraFilters].map(({ key, label, color }) => {
          const isActive = activeFilters.has(key);
          return (
            <button key={key} onClick={() => toggleFilter(key)} style={{
              background: isActive ? color + '22' : 'none',
              border: `1px solid ${isActive ? color : 'var(--border)'}`,
              color: isActive ? color : 'var(--text-muted)',
              fontFamily: "'Crimson Pro', serif", fontSize: 12,
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all .2s',
            }}>
              {label}
            </button>
          );
        })}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={() => setActiveFilters(new Set(allFilterKeys))}
  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}>
  {t('conn.all_btn')}
</button>

<button onClick={async () => {
  const rect = svgRef.current?.getBoundingClientRect();
  const w = rect?.width  || 800;
  const h = rect?.height || 600;
  const newPos = forceLayout(visibleNodes, visibleEdges, w, h);
  setPos(newPos);
  if (uid && wid) await saveGraphPositions(uid, wid, newPos);
}}
  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}>
  {t('conn.reset_btn')}
</button>
      </div>

      {/* Focus elemento */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{t('conn.focus_lbl')}</span>
        {[...focusEls].map(elId => {
          const el = elements.find(e => e.id === elId);
          if (!el) return null;
          return (
            <span key={elId} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border-light)', color: 'var(--text)' }}>
              {el.name}
              <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }}
                onClick={() => setFocusEls(prev => { const next = new Set(prev); next.delete(elId); return next; })}>×</span>
            </span>
          );
        })}
        <div style={{ position: 'relative' }}>
          <input type="text" placeholder={t('conn.focus_ph')} value={focusQuery}
            onChange={e => { setFocusQuery(e.target.value); setFocusOpen(true); }}
            onFocus={() => setFocusOpen(true)}
            onBlur={() => setTimeout(() => setFocusOpen(false), 150)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 10px', outline: 'none', width: 180 }}
          />
          {focusOpen && focusSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 220, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 300 }}>
              {focusSuggestions.map(el => (
                <div key={el.id} onMouseDown={() => { setFocusEls(prev => new Set([...prev, el.id])); setFocusQuery(''); setFocusOpen(false); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {el.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {focusEls.size > 0 && (
          <button onClick={() => setFocusEls(new Set())}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}>
            {t('conn.remove_focus')}
          </button>
        )}
      </div>

      {/* Canvas SVG */}
      <svg ref={svgRef}
        viewBox={viewBox ? `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}` : undefined}
        style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', cursor: drag ? 'grabbing' : panning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={handleSvgPointerDown}
        onMouseMove={handleSvgPointerMove}
        onMouseUp={handleSvgPointerUp}
        onMouseLeave={handleSvgPointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleSvgPointerUp}
        onClick={() => setSelected(null)}
      >
        {/* Edges */}
        {visibleEdges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={e.color} strokeWidth={1.5} strokeOpacity={0.6}
            strokeDasharray={e.type === 'rel' ? '4 3' : undefined} />;
        })}

        {/* Nodi */}
        {visibleNodes.map(node => {
          const p         = pos[node.id];
          if (!p) return null;
          const isHovered = hover === node.id;
          const isFocused = node.type === 'element' && focusEls.has(node.raw.id);
          const label     = node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label;
          const r         = isFocused ? NODE_RADIUS + 4 : NODE_RADIUS;

          return (
            <g key={node.id}
              transform={`translate(${p.x},${p.y})`}
              style={{ cursor: 'pointer' }}
              onMouseDown={e => onDragStart(e, node.id)}
              onTouchStart={e => onDragStart(e, node.id)}
              onMouseEnter={() => setHover(node.id)}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(selected?.id === node.id ? null : { ...node, px: p.x, py: p.y });
              }}
            >
              <circle r={r} fill={node.color + '22'} stroke={node.color}
                strokeWidth={isFocused ? 3 : isHovered ? 2.5 : 1.5}
                style={{ transition: 'stroke-width .15s' }} />

              {/* Immagine se disponibile */}
              {node.type === 'element' && node.raw.image ? (
                <>
                  <clipPath id={`clip-${node.id}`}>
                    <circle r={r - 2} />
                  </clipPath>
                  <image href={node.raw.image}
                    x={-(r - 2)} y={-(r - 2)} width={(r - 2) * 2} height={(r - 2) * 2}
                    clipPath={`url(#clip-${node.id})`}
                    preserveAspectRatio="xMidYMid slice"
                    style={{ pointerEvents: 'none' }} />
                  <text textAnchor="middle" y={r + 12}
                    style={{ fontSize: 9, fill: node.color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                  </text>
                </>
              ) : (
                <text textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 10, fill: node.color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none', userSelect: 'none' }}>
                  {label}
                </text>
              )}

              {/* Tooltip nome completo */}
              {isHovered && node.label.length > 12 && (
                <g transform="translate(0, -44)">
                  <rect x={-node.label.length * 3.5} y={-10} width={node.label.length * 7} height={20} rx={4}
                    fill="var(--surface3)" stroke="var(--border-light)" />
                  <text textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 11, fill: 'var(--text)', fontFamily: "'Crimson Pro', serif", pointerEvents: 'none' }}>
                    {node.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Popup nodo selezionato */}
        {selected && pos[selected.id] && (() => {
          const p    = pos[selected.id];
          const el   = selected.raw;
          const rect = svgRef.current?.getBoundingClientRect();
          const svgW = viewBox?.w || 800;
          const svgH = viewBox?.h || 600;
          const popW = 200;
          const popH = 140;
          let px = p.x + NODE_RADIUS + 8;
          let py = p.y - 20;
          if (px + popW > svgW - 10) px = p.x - NODE_RADIUS - popW - 8;
          if (py + popH > svgH - 10) py = svgH - popH - 10;
          if (py < viewBox?.y + 10) py = (viewBox?.y || 0) + 10;

          return (
            <g transform={`translate(${px}, ${py})`} style={{ pointerEvents: 'auto' }}>
              <rect width={popW} height={popH} rx={8}
                fill="var(--surface3)" stroke="var(--border-light)" strokeWidth={1} />
              <text x={popW - 14} y={16}
                style={{ fontSize: 14, fill: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setSelected(null)}>×</text>
              <text x={10} y={18}
                style={{ fontSize: 9, fill: selected.color, fontFamily: "'Crimson Pro', serif", userSelect: 'none' }}>
                {selected.type === 'element' ? (cats.find(c => c.id === el.cat)?.name || '')
                  : selected.type === 'arc' ? t('conn.arc_label') : t('conn.faz_label')}
              </text>
              <text x={10} y={36}
                style={{ fontSize: 14, fill: 'var(--text)', fontFamily: "'Playfair Display', serif", userSelect: 'none' }}>
                {el.name?.length > 22 ? el.name.slice(0, 21) + '…' : el.name}
              </text>
              {el.desc && (
                <>
                  <text x={10} y={52}
                    style={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', userSelect: 'none' }}>
                    {el.desc.slice(0, 28)}{el.desc.length > 28 ? '…' : ''}
                  </text>
                  {el.desc.length > 28 && (
                    <text x={10} y={65}
                      style={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', userSelect: 'none' }}>
                      {el.desc.slice(28, 56)}{el.desc.length > 56 ? '…' : ''}
                    </text>
                  )}
                </>
              )}
              <line x1={10} y1={popH - 38} x2={popW - 10} y2={popH - 38} stroke="var(--border)" strokeWidth={1} />
              <g style={{ cursor: 'pointer' }} onClick={() => { handleNodeClick(selected); setSelected(null); }}>
                <rect x={10} y={popH - 30} width={popW - 20} height={22} rx={4}
                  fill={selected.color + '22'} stroke={selected.color + '55'} strokeWidth={1} />
                <text x={popW / 2} y={popH - 15} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 11, fill: selected.color, fontFamily: "'Crimson Pro', serif", userSelect: 'none' }}>
                  {t('conn.open_card')}
                </text>
              </g>
            </g>
          );
        })()}
      </svg>

      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', flexShrink: 0 }}>
        {t('conn.hint')}
      </p>
    </div>
  );
}