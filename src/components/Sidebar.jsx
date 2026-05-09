// src/components/Sidebar.jsx
import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

const IMP_ORDER  = { principale: 0, primario: 1, secondario: 2, minore: 3 };
const IMP_LABEL  = { principale: '⭐⭐⭐', primario: '⭐⭐', secondario: '⭐', minore: '·' };
const IMP_COLOR  = { principale: '#f0c060', primario: '#b88fc4', secondario: '#7ab8d4', minore: '#555' };

export default function Sidebar({ onSelectElement, activeElId }) {
  const { elements, allCats, elColor } = useWorld();
  const [search,    setSearch]    = useState('');
  const [collapsed, setCollapsed] = useState({}); // key: catId | catId-sub | catId-sub-imp

  const q    = search.toLowerCase();
  const cats = allCats();

  const filtered = q
    ? elements.filter(e => e.name.toLowerCase().includes(q))
    : elements;

  const toggle = (key) => setCollapsed(s => ({ ...s, [key]: !s[key] }));
  const isOpen = (key) => !collapsed[key];

  // Raggruppa elementi per sottocategoria poi importanza
  const buildTree = (catId) => {
    const items = filtered.filter(e => e.cat === catId);
    if (!items.length) return null;

    const cat = cats.find(c => c.id === catId);
    const subs = cat?.subs || [];

    // Elementi senza sottocategoria
    const noSub = items.filter(e => !e.sub);
    // Elementi per sottocategoria
    const bySub = subs.map(sub => ({
      sub,
      items: items.filter(e => e.sub === sub),
    })).filter(g => g.items.length > 0);

    return { cat, items, noSub, bySub };
  };

  // Raggruppa per importanza dentro un gruppo
  const byImportance = (items) => {
    const groups = {};
    items.forEach(el => {
      const imp = el.importance || 'minore';
      if (!groups[imp]) groups[imp] = [];
      groups[imp].push(el);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => (IMP_ORDER[a] ?? 3) - (IMP_ORDER[b] ?? 3));
  };

  const renderItems = (items, key) => {
    if (!isOpen(key)) return null;

    // Se tutti minore o non ci sono varianti, mostra flat
    const imps = [...new Set(items.map(e => e.importance || 'minore'))];
    const hasVariety = imps.length > 1 || (imps.length === 1 && imps[0] !== 'minore');

    if (!hasVariety || search) {
      // Lista piatta ordinata per importanza
      return [...items]
        .sort((a, b) => (IMP_ORDER[a.importance] ?? 3) - (IMP_ORDER[b.importance] ?? 3))
        .map(el => (
          <div key={el.id}
            className={`sb-item ${activeElId === el.id ? 'active' : ''}`}
            onClick={() => onSelectElement(el.id)}
            style={{ paddingLeft: 28 }}>
            <span className="dot" style={{ background: elColor(el) }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.name}</span>
            <span style={{ fontSize: 9, color: IMP_COLOR[el.importance || 'minore'], flexShrink: 0 }}>
              {IMP_LABEL[el.importance || 'minore']}
            </span>
          </div>
        ));
    }

    // Raggruppato per importanza
    return byImportance(items).map(([imp, impItems]) => {
      const impKey = `${key}-${imp}`;
      const impOpen = isOpen(impKey);
      return (
        <div key={imp}>
          <div onClick={() => toggle(impKey)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 24px', cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <span style={{ fontSize: 9, color: IMP_COLOR[imp] }}>{IMP_LABEL[imp]}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, letterSpacing: '.04em' }}>
              {imp.charAt(0).toUpperCase() + imp.slice(1)}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{impItems.length}</span>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', transition: 'transform .15s', transform: impOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
          </div>
          {impOpen && impItems.map(el => (
            <div key={el.id}
              className={`sb-item ${activeElId === el.id ? 'active' : ''}`}
              onClick={() => onSelectElement(el.id)}
              style={{ paddingLeft: 36 }}>
              <span className="dot" style={{ background: elColor(el) }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.name}</span>
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <>
      <div className="sb-top">
        <input type="text" placeholder="Cerca…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="sb-list">
        {cats.map(cat => {
          const tree = buildTree(cat.id);
          if (!tree) return null;
          const catOpen = isOpen(cat.id);

          return (
            <div key={cat.id} className="sb-sec">
              {/* Header categoria */}
              <div className="sb-sec-hd" onClick={() => toggle(cat.id)}>
                <span className="sb-sec-lbl">
                  <span>{cat.icon}</span>
                  {cat.name}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 10 }}>
                    {tree.items.length}
                  </span>
                </span>
                <span className={`sb-chevron ${catOpen ? 'open' : ''}`}>▶</span>
              </div>

              {catOpen && (
                <div className="sb-items">
                  {/* Sottocategorie */}
                  {tree.bySub.map(({ sub, items: subItems }) => {
                    const subKey  = `${cat.id}-${sub}`;
                    const subOpen = isOpen(subKey);
                    return (
                      <div key={sub}>
                        {/* Header sottocategoria */}
                        <div onClick={() => toggle(subKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 14px', cursor: 'pointer', userSelect: 'none', borderLeft: `2px solid ${cat.color}44` }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: cat.color, flex: 1, letterSpacing: '.04em' }}>{sub}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{subItems.length}</span>
                          <span style={{ fontSize: 8, color: 'var(--text-muted)', transition: 'transform .15s', transform: subOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                        </div>
                        {renderItems(subItems, subKey)}
                      </div>
                    );
                  })}

                  {/* Elementi senza sottocategoria */}
                  {tree.noSub.length > 0 && renderItems(tree.noSub, cat.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
