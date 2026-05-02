import { useEffect, useRef, useState, useCallback } from 'react';
import { useWorld } from '../hooks/useWorld';

const NODE_RADIUS = 28;

const TRACK_COLORS = [
  '#e8a0a8','#7ab8d4','#8fbd7c','#d4956a','#b88fc4',
  '#f0c060','#a0d0c0','#c4a0e4','#e4c07a','#a8d4b8',
];

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
  const { elements, arcs, fazioni, allCats } = useWorld();
  const svgRef = useRef(null);
  const [pos,        setPos]        = useState({});
  const [drag,       setDrag]       = useState(null);
  const [hover,      setHover]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [activeCats, setActiveCats] = useState(null); // null = tutti
  const [focusEls,   setFocusEls]   = useState(new Set()); // elementi in focus
  const [focusQuery, setFocusQuery] = useState('');
  const [focusOpen,  setFocusOpen]  = useState(false);

  const cats = allCats();
  const usedCatIds = [...new Set(elements.map(e => e.cat))];
  const catFilters = cats.filter(c => usedCatIds.includes(c.id))
    .map(c => ({ key: `el-${c.id}`, label: `${c.icon} ${c.name}`, color: c.color }));
  const extraFilters = [
    ...(arcs.length    > 0 ? [{ key: 'arc',     label: '📖 Archi',   color: '#e8a0a8' }] : []),
    ...(fazioni.length > 0 ? [{ key: 'fazione',  label: '⚔ Fazioni', color: '#f0c060' }] : []),
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

  // Filtra nodi per categoria
  let visibleNodes = nodes.filter(n => {
    if (n.type === 'element') return activeFilters.has(`el-${n.cat}`);
    if (n.type === 'arc')     return activeFilters.has('arc');
    if (n.type === 'fazione') return activeFilters.has('fazione');
    return true;
  });

  // Filtra per focus elemento — mostra solo l'elemento e i suoi vicini diretti
  if (focusEls.size > 0) {
    const focusNodeIds = new Set();
    focusEls.forEach(elId => {
      const nodeId = `el-${elId}`;
      focusNodeIds.add(nodeId);
      // Aggiungi tutti i nodi connessi direttamente
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
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const w = rect.width  || 800;
    const h = rect.height || 600;
    setPos(forceLayout(visibleNodes, visibleEdges, w, h));
  }, [elements.length, arcs.length, fazioni.length, cats.length, focusEls.size, activeFilters.size]);

  // ── Drag — gestisce sia mouse che touch ──
  const getDragCoords = (e) => {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const onDragStart = useCallback((e, nodeId) => {
    e.preventDefault();
    const { x, y } = getDragCoords(e);
    setDrag({ id: nodeId, ox: x - (pos[nodeId]?.x || 0), oy: y - (pos[nodeId]?.y || 0) });
  }, [pos]);

  const onDragMove = useCallback((e) => {
    if (!drag) return;
    const { x, y } = getDragCoords(e);
    setPos(p => ({ ...p, [drag.id]: { x: x - drag.ox, y: y - drag.oy } }));
  }, [drag]);

  const onDragEnd = useCallback(() => setDrag(null), []);

  const handleNodeClick = (node) => {
    if (node.type === 'element') onOpenElement(node.raw.id);
    else if (node.type === 'arc') onOpenArc(node.raw.id);
    else if (node.type === 'fazione') onOpenFazione(node.raw.id);
  };

  // Suggerimenti per focus
  const focusSuggestions = focusQuery
    ? elements.filter(e => !focusEls.has(e.id) && e.name.toLowerCase().includes(focusQuery.toLowerCase())).slice(0, 6)
    : [];

  if (elements.length === 0) return (
    <div className="view">
      <div className="view-hd"><div className="view-title">🕸 <span>Connessioni</span></div></div>
      <div className="empty"><div className="empty-icon">🕸</div><div className="empty-title">Nessun elemento</div><div className="empty-sub">Aggiungi elementi al mondo per visualizzare le connessioni</div></div>
    </div>
  );

  return (
    <div className="view" style={{ padding: '20px 24px', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
      <div className="view-hd" style={{ marginBottom: 10, flexShrink: 0 }}>
        <div className="view-title">🕸 <span>Connessioni</span></div>
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
          Tutti
        </button>
      </div>

      {/* Focus elemento */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Focus:</span>

        {/* Chip elementi selezionati */}
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

        {/* Input ricerca elemento */}
        <div style={{ position: 'relative' }}>
          <input type="text" placeholder="Cerca elemento da isolare…" value={focusQuery}
            onChange={e => { setFocusQuery(e.target.value); setFocusOpen(true); }}
            onFocus={() => setFocusOpen(true)}
            onBlur={() => setTimeout(() => setFocusOpen(false), 150)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 10px', outline: 'none', width: 210 }}
          />
          {focusOpen && focusSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 240, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 300 }}>
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
            ✕ Rimuovi focus
          </button>
        )}
      </div>

      {/* Canvas SVG */}
      <svg ref={svgRef}
        style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', cursor: drag ? 'grabbing' : 'default', touchAction: 'none' }}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onClick={() => setSelected(null)}
        onMouseLeave={onDragEnd}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
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
          const p = pos[node.id];
          if (!p) return null;
          const isHovered  = hover === node.id;
          const isDragged  = drag?.id === node.id;
          const isFocused  = node.type === 'element' && focusEls.has(node.raw.id);
          const label      = node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label;

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
  if (!isDragged) {
    setSelected(selected?.id === node.id ? null : { ...node, px: p.x, py: p.y });
  }
}}
            >
              <circle r={isFocused ? NODE_RADIUS + 4 : NODE_RADIUS}
  fill={node.color + '22'}
  stroke={node.color}
  strokeWidth={isFocused ? 3 : isHovered ? 2.5 : 1.5}
  style={{ transition: 'stroke-width .15s' }}
/>

{/* Immagine se disponibile */}
{node.type === 'element' && node.raw.image ? (
  <>
    <clipPath id={`clip-${node.id}`}>
      <circle r={NODE_RADIUS - 2} />
    </clipPath>
    <image
      href={node.raw.image}
      x={-(NODE_RADIUS - 2)} y={-(NODE_RADIUS - 2)}
      width={(NODE_RADIUS - 2) * 2} height={(NODE_RADIUS - 2) * 2}
      clipPath={`url(#clip-${node.id})`}
      preserveAspectRatio="xMidYMid slice"
      style={{ pointerEvents: 'none' }}
    />
  </>
) : (
  <text textAnchor="middle" dominantBaseline="middle"
    style={{ fontSize: 10, fill: node.color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none', userSelect: 'none' }}>
    {label}
  </text>
)}

{/* Nome sempre visibile sotto il nodo se ha immagine */}
{node.type === 'element' && node.raw.image && (
  <text textAnchor="middle" y={NODE_RADIUS + 12}
    style={{ fontSize: 9, fill: node.color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none', userSelect: 'none' }}>
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
  const p = pos[selected.id];
  const el = selected.raw;
  const svgRect = svgRef.current?.getBoundingClientRect();
  const svgW = svgRect?.width || 800;
  const svgH = svgRect?.height || 600;

  // Posiziona il popup in modo che non esca dal canvas
  const popW = 200;
  const popH = 140;
  let px = p.x + NODE_RADIUS + 8;
  let py = p.y - 20;
  if (px + popW > svgW - 10) px = p.x - NODE_RADIUS - popW - 8;
  if (py + popH > svgH - 10) py = svgH - popH - 10;
  if (py < 10) py = 10;

  return (
    <g transform={`translate(${px}, ${py})`} style={{ pointerEvents: 'auto' }}>
      {/* Sfondo card */}
      <rect width={popW} height={popH} rx={8}
        fill="var(--surface3)" stroke="var(--border-light)" strokeWidth={1} />

      {/* X chiudi */}
      <text x={popW - 14} y={16}
        style={{ fontSize: 14, fill: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setSelected(null)}>×</text>

      {/* Tipo */}
      <text x={10} y={18} style={{ fontSize: 9, fill: selected.color, fontFamily: "'Crimson Pro', serif", textTransform: 'uppercase', letterSpacing: '.1em', userSelect: 'none' }}>
        {selected.type === 'element'
          ? (cats.find(c => c.id === el.cat)?.name || '')
          : selected.type === 'arc' ? 'Arco Narrativo'
          : 'Fazione'}
      </text>

      {/* Nome */}
      <text x={10} y={36}
        style={{ fontSize: 14, fill: 'var(--text)', fontFamily: "'Playfair Display', serif", userSelect: 'none' }}>
        {el.name?.length > 22 ? el.name.slice(0, 21) + '…' : el.name}
      </text>

      {/* Descrizione */}
      {el.desc && (
        <>
          <text x={10} y={52} style={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', userSelect: 'none' }}>
            {el.desc.slice(0, 28)}{el.desc.length > 28 ? '…' : ''}
          </text>
          {el.desc.length > 28 && (
            <text x={10} y={65} style={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', userSelect: 'none' }}>
              {el.desc.slice(28, 56)}{el.desc.length > 56 ? '…' : ''}
            </text>
          )}
        </>
      )}

      {/* Separatore */}
      <line x1={10} y1={popH - 38} x2={popW - 10} y2={popH - 38} stroke="var(--border)" strokeWidth={1} />

      {/* Pulsante Apri scheda */}
      <g style={{ cursor: 'pointer' }} onClick={() => { handleNodeClick(selected); setSelected(null); }}>
        <rect x={10} y={popH - 30} width={popW - 20} height={22} rx={4}
          fill={selected.color + '22'} stroke={selected.color + '55'} strokeWidth={1} />
        <text x={popW / 2} y={popH - 15} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 11, fill: selected.color, fontFamily: "'Crimson Pro', serif", userSelect: 'none' }}>
          Apri scheda completa →
        </text>
      </g>
    </g>
  );
})()}

      </svg>

      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', flexShrink: 0 }}>
        Trascina i nodi per riorganizzare • Clicca per aprire il dettaglio
      </p>
    </div>
  );
}