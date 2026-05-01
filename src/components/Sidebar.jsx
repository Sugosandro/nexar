// src/components/Sidebar.jsx
// ─────────────────────────────────────────────
// Sidebar con lista elementi navigabile e ricerca.
// ─────────────────────────────────────────────

import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

export default function Sidebar({ onSelectElement, activeElId }) {
  const { elements, allCats, elColor, elIcon } = useWorld();
  const [search,    setSearch]    = useState('');
  const [collapsed, setCollapsed] = useState({});

  const q = search.toLowerCase();
  const filtered = q
    ? elements.filter(e => e.name.toLowerCase().includes(q))
    : elements;

  const cats = allCats();

  const toggleCat = (id) => setCollapsed(s => ({ ...s, [id]: !s[id] }));

  return (
    <>
      <div className="sb-top">
        <input
          type="text"
          placeholder="Cerca…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="sb-list">
        {cats.map(cat => {
          const items = filtered.filter(e => e.cat === cat.id);
          if (!items.length) return null;
          const isOpen = !collapsed[cat.id];

          return (
            <div key={cat.id} className="sb-sec">
              <div className="sb-sec-hd" onClick={() => toggleCat(cat.id)}>
                <span className="sb-sec-lbl">
                  <span>{cat.icon}</span>
                  {cat.name}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 10 }}>
                    {items.length}
                  </span>
                </span>
                <span className={`sb-chevron ${isOpen ? 'open' : ''}`}>▶</span>
              </div>

              <div
                className={`sb-children ${isOpen ? '' : 'collapsed'}`}
                style={{ maxHeight: isOpen ? items.length * 42 + 'px' : 0 }}
              >
                <div className="sb-items">
                  {items.map(el => (
                    <div
                      key={el.id}
                      className={`sb-item ${activeElId === el.id ? 'active' : ''}`}
                      onClick={() => onSelectElement(el.id)}
                    >
                      <span
                        className="dot"
                        style={{ background: elColor(el) }}
                      />
                      {el.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
