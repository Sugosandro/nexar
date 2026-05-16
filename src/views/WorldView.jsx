import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import ElementCard from '../components/ElementCard';
import ElementModal from '../components/ElementModal';

const IMPORTANCE_ORDER = { principale: 0, primario: 1, secondario: 2, minore: 3, undefined: 4 };

export default function WorldView({ onOpenElement, showToast }) {
  const { t } = useTranslation();
  const { elements, allCats, arcs, fazioni, addEl, updateEl } = useWorld();

  const [showModal, setShowModal] = useState(false);

  // ── Migration importance: protagonista → principale ───────────────────────
  const migDone = useRef(false);
  useEffect(() => {
    if (migDone.current || !elements.length) return;
    migDone.current = true;
    const toMigrate = elements.filter(e => e.importance === 'protagonista');
    if (!toMigrate.length) return;
    (async () => {
      for (const el of toMigrate) {
        await updateEl(el.id, { importance: 'principale' });
      }
    })();
  }, [elements]); // eslint-disable-line

  // ── Retroactive changelog sync ────────────────────────────────────────────

  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [subFilter,    setSubFilter]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [arcFilter,    setArcFilter]    = useState('');
  const [impFilter,    setImpFilter]    = useState('');
  const [fazFilter,    setFazFilter]    = useState('');
  const [viewMode,     setViewMode]     = useState('grid');
  const [sortBy,       setSortBy]       = useState('importance');

  const cats = allCats().filter(c => c.id !== 'event');
  const subsList = catFilter ? (cats.find(c => c.id === catFilter)?.subs || []) : [];

  let filtered = elements.filter(e => e.cat !== 'event');
  if (search)       filtered = filtered.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.desc || '').toLowerCase().includes(search.toLowerCase()));
  if (catFilter)    filtered = filtered.filter(e => e.cat === catFilter);
  if (subFilter)    filtered = filtered.filter(e => e.sub === subFilter);
  if (statusFilter) filtered = filtered.filter(e => (e.status || 'draft') === statusFilter);
  if (impFilter)    filtered = filtered.filter(e => (e.importance || 'minore') === impFilter);
  if (arcFilter) {
    const arc = arcs.find(a => a.id === arcFilter);
    if (arc) filtered = filtered.filter(e => (arc.members || []).includes(e.id));
  }
  if (fazFilter) {
    const faz = fazioni.find(f => f.id === fazFilter);
    if (faz) filtered = filtered.filter(e => (faz.members || []).includes(e.id));
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'importance') {
      const ia = IMPORTANCE_ORDER[a.importance] ?? 4;
      const ib = IMPORTANCE_ORDER[b.importance] ?? 4;
      if (ia !== ib) return ia - ib;
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'status') {
      const ORDER = { done: 0, wip: 1, draft: 2 };
      return (ORDER[a.status] ?? 2) - (ORDER[b.status] ?? 2);
    }
    return 0;
  });

  const useGroups = viewMode === 'grid' && !catFilter && !search;

  const sections = (() => {
    if (!useGroups) return [{ key: 'all', label: null, color: null, items: filtered }];
    const result = [];
    cats.forEach(cat => {
      const items = filtered.filter(e => e.cat === cat.id);
      if (!items.length) return;
      const subs = ['', ...new Set(items.filter(e => e.sub).map(e => e.sub))];
      subs.forEach(sub => {
        const subItems = sub ? items.filter(e => e.sub === sub) : items.filter(e => !e.sub);
        if (!subItems.length) return;
        const label = sub ? `${cat.icon} ${cat.name} › ${sub}` : `${cat.icon} ${cat.name}`;
        result.push({ key: `${cat.id}-${sub}`, label, color: cat.color, items: subItems });
      });
    });
    return result;
  })();

  const hasFilters = search || catFilter || subFilter || statusFilter || arcFilter || impFilter || fazFilter;
  const totalNonEvents = elements.filter(e => e.cat !== 'event').length;

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">{t('wv.title_pre')} <span>{t('nav.world')}</span></div>
        <div className="vhact">
          <button className="btn-p" onClick={() => setShowModal(true)}>{t('wv.new_btn')}</button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 22 }}>

        {/* Row 1: search + view toggle + sort */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
            <input type="text" placeholder={t('wv.search_ph')} value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 14, width: '100%' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
          </div>

          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '6px 10px' }}
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="importance">{t('wv.sort_importance')}</option>
            <option value="name">{t('wv.sort_name')}</option>
            <option value="status">{t('wv.sort_status')}</option>
          </select>

          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')}
              style={{ padding: '6px 12px', background: viewMode === 'grid' ? 'var(--surface2)' : 'none', border: 'none', color: viewMode === 'grid' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 15, transition: 'all .2s' }}>
              ⊞
            </button>
            <button onClick={() => setViewMode('list')}
              style={{ padding: '6px 12px', background: viewMode === 'list' ? 'var(--surface2)' : 'none', border: 'none', color: viewMode === 'list' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 15, transition: 'all .2s', borderLeft: '1px solid var(--border)' }}>
              ☰
            </button>
          </div>
        </div>

        {/* Row 2: filters */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>

          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={catFilter} onChange={e => { setCatFilter(e.target.value); setSubFilter(''); }}>
            <option value="">{t('wv.filter_all_cats')}</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {subsList.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={subFilter} onChange={e => setSubFilter(e.target.value)}>
              <option value="">{t('wv.filter_all_subs')}</option>
              {subsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={impFilter} onChange={e => setImpFilter(e.target.value)}>
            <option value="">{t('wv.filter_any_imp')}</option>
            <option value="principale">⭐⭐⭐ {t('importance.principale')}</option>
            <option value="primario">⭐⭐ {t('importance.primario')}</option>
            <option value="secondario">⭐ {t('importance.secondario')}</option>
            <option value="minore">· {t('importance.minore')}</option>
          </select>

          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">{t('wv.filter_any_status')}</option>
            <option value="draft">{t('status.draft')}</option>
            <option value="wip">{t('status.wip')}</option>
            <option value="done">{t('status.done')}</option>
          </select>

          {arcs.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={arcFilter} onChange={e => setArcFilter(e.target.value)}>
              <option value="">{t('wv.filter_all_arcs')}</option>
              {arcs.map(a => <option key={a.id} value={a.id}>📖 {a.name}</option>)}
            </select>
          )}

          {fazioni.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={fazFilter} onChange={e => setFazFilter(e.target.value)}>
              <option value="">{t('wv.filter_all_faz')}</option>
              {fazioni.map(f => <option key={f.id} value={f.id}>⚔ {f.name}</option>)}
            </select>
          )}

          {hasFilters && (
            <button className="btn-g" style={{ fontSize: 12 }} onClick={() => {
              setSearch(''); setCatFilter(''); setSubFilter('');
              setStatusFilter(''); setArcFilter(''); setImpFilter(''); setFazFilter('');
            }}>
              {t('wv.reset_filters')}
            </button>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          {hasFilters
            ? t('wv.count_filtered', { count: filtered.length, total: totalNonEvents })
            : t('wv.count_elements', { count: filtered.length })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <div className="empty-title">{hasFilters ? t('wv.empty_filtered_title') : t('wv.empty_title')}</div>
          <div className="empty-sub">{hasFilters ? t('wv.empty_filtered_sub') : t('wv.empty_sub')}</div>
        </div>
      ) : viewMode === 'grid' ? (
        sections.map(({ key, label, color, items }) => (
          <div key={key} style={{ marginBottom: 28 }}>
            {label && (
              <div className="sec-div">
                <span className="sec-div-lbl" style={{ color }}>{label}</span>
                <div className="sec-div-line" />
              </div>
            )}
            <div className="cards-grid">
              {items.map(el => (
                <ElementCard key={el.id} element={el} onClick={() => onOpenElement(el.id)} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {filtered.map((el, i) => {
            const cat = cats.find(c => c.id === el.cat);
            const color = cat?.color || '#888';
            const imp = el.importance || 'minore';
            const impStars = { principale: '⭐⭐⭐', primario: '⭐⭐', secondario: '⭐', minore: '·' };
            const STATUS_COLORS = { draft: 'var(--text-muted)', wip: 'var(--char)', done: 'var(--place)' };

            return (
              <div key={el.id}
                onClick={() => onOpenElement(el.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--gold)', flexShrink: 0, width: 32, textAlign: 'center' }}>
                  {impStars[imp]}
                </span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {el.name}
                </span>
                <span style={{ fontSize: 11, color, flexShrink: 0, minWidth: 80 }}>
                  {cat?.icon} {el.sub ? `${cat?.name} › ${el.sub}` : cat?.name}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                  {el.desc || '—'}
                </span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[el.status] || 'var(--text-muted)', flexShrink: 0 }}>
                  {el.status === 'done' ? '✅' : el.status === 'wip' ? '🔵' : '✏'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ElementModal
          defaultCat="char"
          onSave={async (data, birthDate) => {
            await addEl(data);
            if (birthDate) {
              await addEl({
                cat: 'event', name: t('dp.el_birth_name', { name: data.name }),
                desc: t('dp.el_birth_desc', { name: data.name }),
                date: birthDate, tags: [], status: 'done',
                extra: {}, powers: [], equip: [], changelog: [], notes: '',
              });
            }
            setShowModal(false);
            showToast(t('wv.toast_created'));
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
