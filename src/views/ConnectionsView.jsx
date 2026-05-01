import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../hooks/useWorld';

const NODE_RADIUS = 28;

function buildGraph(elements, arcs, fazioni, allCats) {
  const nodes = [];
  const edges = [];

  const catColor = (catId) => allCats.find(c => c.id === catId)?.color || '#888';

  elements.forEach(el => {
    nodes.push({ id: `el-${el.id}`, label: el.name, type: 'element', cat: el.cat, color: catColor(el.cat), raw: el });
  });
  arcs.forEach(a => {
    nodes.push({ id: `arc-${a.id}`, label: a.name, type: 'arc', color: '#e8a0a8', raw: a });
  });
  fazioni.forEach(f => {
    nodes.push({ id: `faz-${f.id}`, label: f.name, type: 'fazione', color: '#f0c060', raw: f });
  });

  elements.forEach(el => {
    (el.tags || []).forEach(tid => {
      if (elements.find(e => e.id === tid))
        edges.push({ from: `el-${el.id}`, to: `el-${tid}`, type: 'tag', color: '#3a3830' });
    });
  });
  arcs.forEach(a => {
    (a.members || []).forEach(mid => {
      if (elements.find(e => e.id === mid))
        edges.push({ from: `arc-${a.id}`, to: `el-${mid}`, type: 'arc', color: '#4a2028' });
    });
  });
  fazioni.forEach(f => {
    (f.members || []).forEach(mid => {
      if (elements.find(e => e.id === mid))
        edges.push({ from: `faz-${f.id}`, to: `el-${mid}`, type: 'fazione', color: '#4a3810' });
    });
  });
  fazioni.forEach(f => {
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
  const { elements, arcs, fazioni, magie, allCats } = useWorld();
  const svgRef = useRef(null);
  const [pos,   setPos]   = useState({});
  const [drag,  setDrag]  = useState(null);
  const [hover, setHover] = useState(null);

  const cats = allCats();

  // Costruisce la lista filtri dinamicamente
  // Categorie elementi (solo quelle che hanno almeno un elemento)
  const usedCatIds = [...new Set(elements.map(e => e.cat))];
  const catFilters = cats
    .filter(c => usedCatIds.includes(c.id))
    .map(c => ({ key: `el-${c.id}`, label: `${c.icon} ${c.name}`, color: c.color }));

  const extraFilters = [
    ...(arcs.length    > 0 ? [{ key: 'arc',     label: '📖 Archi',   color: '#e8a0a8' }] : []),
    ...(fazioni.length > 0 ? [{ key: 'fazione',  label: '⚔ Fazioni', color: '#f0c060' }] : []),
  ];

  const allFilterKeys = [...catFilters.map(f => f.key), ...extraFilters.map(f => f.key)];

  const [activeCats, setActiveCats] = useState(() => new Set(allFilterKeys));

  // Aggiorna i filtri se cambiano le categorie
  useEffect(() => {
    setActiveCats(new Set(allFilterKeys));
  }, [cats.length, arcs.length, fazioni.length]);

  const toggleCat = (key) => {
    setActiveCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const selectAll  = () => setActiveCats(new Set(allFilterKeys));
  const selectNone = () => setActiveCats(new Set([allFilterKeys[0]]));

  const { nodes, edges } = buildGraph(elements, arcs, fazioni, cats);

  const visibleNodes = nodes.filter(n => {
    if (n.type === 'element') return activeCats.has(`el-${n.cat}`);
    if (n.type === 'arc')     return activeCats.has('arc');
    if (n.type === 'fazione') return activeCats.has('fazione');
    return true;
  });
  const visibleIds   = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleIds.has(e.from) && visibleIds.has(e.to));

  useEffect(() => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const w = rect.width  || 800;
    const h = rect.height || 600;
    setPos(forceLayout(visibleNodes, visibleEdges, w, h));
  }, [elements.length, arcs.length, fazioni.length, cats.length]);

  const onMouseDown = (e, nodeId) => {
    e.preventDefault();
    setDrag({ id: nodeId, ox: e.clientX - (pos[nodeId]?.x || 0), oy: e.clientY - (pos[nodeId]?.y || 0) });
  };
  const onMouseMove = (e) => {
    if (!drag) return;
    setPos(p => ({ ...p, [drag.id]: { x: e.clientX - drag.ox, y: e.clientY - drag.oy } }));
  };
  const onMouseUp = () => setDrag(null);

  const handleNodeClick = (node) => {
    if (node.type === 'element') onOpenElement(node.raw.id);
    else if (node.type === 'arc') onOpenArc(node.raw.id);
    else if (node.type === 'fazione') onOpenFazione(node.raw.id);
  };

  if (elements.length === 0) {
    return (
      <div className="view">
        <div className="view-hd"><div className="view-title">🕸 <span>Connessioni</span></div></div>
        <div className="empty"><div className="empty-icon">🕸</div><div className="empty-title">Nessun elemento</div><div className="empty-sub">Aggiungi elementi al mondo per visualizzare le connessioni</div></div>
      </div>
    );
  }

  return (
    <div className="view" style={{ padding: '20px 24px', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
      <div className="view-hd" style={{ marginBottom: 12, flexShrink: 0 }}>
        <div className="view-title">🕸 <span>Connessioni</span></div>
      </div>

      {/* Filtri dinamici */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0, alignItems: 'center' }}>
        {[...catFilters, ...extraFilters].map(({ key, label, color }) => {
          const isActive = activeCats.has(key);
          return (
            <button key={key} onClick={() => toggleCat(key)} style={{
              background: isActive ? color + '22' : 'none',
              border: `1px solid ${isActive ? color : 'var(--border)'}`,
              color: isActive ? color : 'var(--text-muted)',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 20,
              cursor: 'pointer',
              transition: 'all .2s',
            }}>
              {label}
            </button>
          );
        })}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <button onClick={selectAll}  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}>Tutti</button>
        <button onClick={selectNone} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}>Nessuno</button>
      </div>

      {/* Canvas SVG */}
      <svg ref={svgRef}
        style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', cursor: drag ? 'grabbing' : 'default' }}
        onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        {visibleEdges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.color} strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray={e.type === 'rel' ? '4 3' : undefined} />;
        })}

        {visibleNodes.map(node => {
          const p = pos[node.id];
          if (!p) return null;
          const isHovered = hover === node.id;
          const isDragged = drag?.id === node.id;
          const label = node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label;

          return (
            <g key={node.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
              onMouseDown={e => onMouseDown(e, node.id)}
              onMouseEnter={() => setHover(node.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => !isDragged && handleNodeClick(node)}
            >
              <circle r={NODE_RADIUS} fill={node.color + '22'} stroke={node.color} strokeWidth={isHovered ? 2.5 : 1.5} style={{ transition: 'stroke-width .15s' }} />
              <text textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 10, fill: node.color, fontFamily: "'Crimson Pro', serif", pointerEvents: 'none', userSelect: 'none' }}>
                {label}
              </text>
              {isHovered && node.label.length > 12 && (
                <g transform="translate(0, -44)">
                  <rect x={-node.label.length * 3.5} y={-10} width={node.label.length * 7} height={20} rx={4} fill="var(--surface3)" stroke="var(--border-light)" />
                  <text textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 11, fill: 'var(--text)', fontFamily: "'Crimson Pro', serif", pointerEvents: 'none' }}>
                    {node.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', flexShrink: 0 }}>
        Trascina i nodi per riorganizzare • Clicca per aprire il dettaglio
      </p>
    </div>
  );
}