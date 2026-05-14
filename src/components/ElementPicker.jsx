import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

/**
 * Reusable multi-select element picker with grouped categories.
 *
 * Props:
 *   selected   string[]   IDs of selected elements
 *   onChange   fn         (newSelected: string[]) => void
 *   filterCat  string?    If set, only shows elements of that category
 *   exclude    string[]?  Element IDs to always exclude from the dropdown
 *   inputId    string?    HTML id for the search input (for label linkage)
 *   placeholder string?   Overrides the default placeholder
 */
export default function ElementPicker({
  selected = [],
  onChange,
  filterCat  = null,
  exclude    = [],
  inputId    = 'elPicker',
  placeholder,
}) {
  const { t }                    = useTranslation();
  const { elements, allCats }    = useWorld();
  const [q,    setQ]             = useState('');
  const [open, setOpen]          = useState(false);

  const cats      = allCats();
  const available = elements.filter(
    e => !selected.includes(e.id)
      && !exclude.includes(e.id)
      && (!filterCat || e.cat === filterCat)
      && (!q || e.name.toLowerCase().includes(q.toLowerCase()))
  );
  const grouped = cats
    .map(c => ({ cat: c, items: available.filter(e => e.cat === c.id) }))
    .filter(g => g.items.length > 0);

  const add    = (id) => { onChange([...selected, id]); setQ(''); };
  const remove = (id) => onChange(selected.filter(s => s !== id));

  return (
    <div
      onClick={() => document.getElementById(inputId)?.focus()}
      style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '6px 9px',
        display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text',
      }}
    >
      {selected.map(id => {
        const el    = elements.find(e => e.id === id);
        if (!el) return null;
        const color = cats.find(c => c.id === el.cat)?.color || '#888';
        return (
          <span key={id} style={{
            background: 'var(--surface3)', border: `1px solid ${color}55`,
            borderRadius: 20, padding: '2px 8px', fontSize: 12,
            color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {el.name}
            <span
              style={{ cursor: 'pointer', opacity: .6, fontSize: 14, lineHeight: 1 }}
              onClick={e => { e.stopPropagation(); remove(id); }}
            >×</span>
          </span>
        );
      })}

      <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
        <input
          id={inputId}
          type="text"
          placeholder={selected.length ? '' : (placeholder || t('common.search_browse'))}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)', fontFamily: "'Crimson Pro', serif",
            fontSize: 13, width: '100%',
          }}
        />

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)',
            zIndex: 700, maxHeight: 260, overflowY: 'auto',
          }}>
            {grouped.length === 0 ? (
              <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                {t('common.no_elements')}
              </div>
            ) : grouped.map(({ cat: c, items }) => (
              <div key={c.id}>
                <div style={{
                  padding: '5px 12px 4px', fontSize: 10, fontWeight: 700,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                  color: c.color, background: 'var(--surface2)',
                  borderBottom: '1px solid var(--border)',
                  position: 'sticky', top: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: .7 }}>{items.length}</span>
                </div>
                {items.map(el => (
                  <div
                    key={el.id}
                    onMouseDown={() => add(el.id)}
                    style={{
                      padding: '7px 12px 7px 20px', cursor: 'pointer',
                      fontSize: 13, borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{el.name}</span>
                    {el.sub && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{el.sub}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
