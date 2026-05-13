import { useState, useEffect, useRef } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementCard from '../components/ElementCard';
import ElementModal from '../components/ElementModal';

const IMPORTANCE_ORDER = { principale: 0, primario: 1, secondario: 2, minore: 3, undefined: 4 };
const IMPORTANCE_LABELS = {
  principale: '⭐⭐⭐ Principale',
  primario:     '⭐⭐ Primario',
  secondario:   '⭐ Secondario',
  minore:       '· Minore',
};

export default function WorldView({ onOpenElement, showToast }) {
  const { elements, allCats, arcs, fazioni, addEl, updateEl } = useWorld();

  const [showModal,    setShowModal]    = useState(false);

  // ── Migrazione importance: protagonista → principale ─────────────────────
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

  // ── Sync retroattivo storico eventi ──────────────────────────────────────
  const syncDone = useRef(false);
  useEffect(() => {
    if (syncDone.current || !elements.length) return;
    syncDone.current = true;
    const events = elements.filter(e =>
      e.cat === 'event' && e.eventPlace && e.date && e.eventEls?.length
    );
    if (!events.length) return;
    (async () => {
      let added = 0;
      for (const ev of events) {
        for (const elId of ev.eventEls) {
          const el = elements.find(e => e.id === elId);
          if (!el) continue;
          const exists = (el.changelog || []).some(
            c => c.date === ev.date && c.placeId === ev.eventPlace
          );
          if (!exists) {
            await updateEl(elId, {
              changelog: [...(el.changelog || []), { date: ev.date, placeId: ev.eventPlace, text: `Presente durante: ${ev.name}` }],
            });
            added++;
          }
        }
      }
      if (added > 0) showToast(`✓ Storico sincronizzato: ${added} voci aggiunte`);
    })();
  }, [elements]); // eslint-disable-line
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [subFilter,    setSubFilter]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [arcFilter,    setArcFilter]    = useState('');
  const [impFilter,    setImpFilter]    = useState('');
  const [fazFilter,    setFazFilter]    = useState('');
  const [viewMode,     setViewMode]     = useState('grid'); // grid | list
  const [sortBy,       setSortBy]       = useState('importance'); // importance | name | status

  const cats = allCats().filter(c => c.id !== 'event');

  // Sottocategorie della categoria selezionata
  const subsList = catFilter ? (cats.find(c => c.id === catFilter)?.subs || []) : [];

  // Filtra elementi
  let filtered = elements.filter(e => e.cat !== 'event');

  if (search)      filtered = filtered.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.desc || '').toLowerCase().includes(search.toLowerCase()));
  if (catFilter)   filtered = filtered.filter(e => e.cat === catFilter);
  if (subFilter)   filtered = filtered.filter(e => e.sub === subFilter);
  if (statusFilter)filtered = filtered.filter(e => (e.status || 'draft') === statusFilter);
  if (impFilter)   filtered = filtered.filter(e => (e.importance || 'minore') === impFilter);
  if (arcFilter) {
    const arc = arcs.find(a => a.id === arcFilter);
    if (arc) filtered = filtered.filter(e => (arc.members || []).includes(e.id));
  }
  if (fazFilter) {
    const faz = fazioni.find(f => f.id === fazFilter);
    if (faz) filtered = filtered.filter(e => (faz.members || []).includes(e.id));
  }

  // Ordina
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

  // Raggruppa per categoria (solo in modalità griglia senza filtro categoria)
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

  return (
    <div className="view">
      {/* Header */}
      <div className="view-hd">
        <div className="view-title">Il tuo <span>Mondo</span></div>
        <div className="vhact">
          <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuovo elemento</button>
        </div>
      </div>

      {/* Barra filtri */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 22 }}>

        {/* Riga 1: ricerca + toggle vista + ordina */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
            <input type="text" placeholder="Cerca elementi…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 14, width: '100%' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
          </div>

          {/* Ordina */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '6px 10px' }}
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="importance">↓ Importanza</option>
            <option value="name">↓ Nome A-Z</option>
            <option value="status">↓ Stato</option>
          </select>

          {/* Toggle vista */}
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

        {/* Riga 2: filtri */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Categoria */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={catFilter} onChange={e => { setCatFilter(e.target.value); setSubFilter(''); }}>
            <option value="">Tutte le categorie</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {/* Sottocategoria */}
          {subsList.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={subFilter} onChange={e => setSubFilter(e.target.value)}>
              <option value="">Tutte le sottocategorie</option>
              {subsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Importanza */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={impFilter} onChange={e => setImpFilter(e.target.value)}>
            <option value="">Qualsiasi importanza</option>
            <option value="principale">⭐⭐⭐ principale</option>
            <option value="primario">⭐⭐ Primario</option>
            <option value="secondario">⭐ Secondario</option>
            <option value="minore">· Minore</option>
          </select>

          {/* Stato */}
          <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Qualsiasi stato</option>
            <option value="draft">✏ Bozza</option>
            <option value="wip">🔵 In sviluppo</option>
            <option value="done">✅ Definitivo</option>
          </select>

          {/* Arco */}
          {arcs.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={arcFilter} onChange={e => setArcFilter(e.target.value)}>
              <option value="">Tutti gli archi</option>
              {arcs.map(a => <option key={a.id} value={a.id}>📖 {a.name}</option>)}
            </select>
          )}

          {/* Fazione */}
          {fazioni.length > 0 && (
            <select className="fs" style={{ margin: 0, width: 'auto', fontSize: 13, padding: '5px 10px' }}
              value={fazFilter} onChange={e => setFazFilter(e.target.value)}>
              <option value="">Tutte le fazioni</option>
              {fazioni.map(f => <option key={f.id} value={f.id}>⚔ {f.name}</option>)}
            </select>
          )}

          {/* Reset filtri */}
          {hasFilters && (
            <button className="btn-g" style={{ fontSize: 12 }} onClick={() => {
              setSearch(''); setCatFilter(''); setSubFilter('');
              setStatusFilter(''); setArcFilter(''); setImpFilter(''); setFazFilter('');
            }}>
              ✕ Azzera filtri
            </button>
          )}
        </div>

        {/* Contatore risultati */}
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} element{filtered.length !== 1 ? 'i' : 'o'}
          {hasFilters && ` trovati`}
          {` su ${elements.filter(e => e.cat !== 'event').length} totali`}
        </div>
      </div>

      {/* Contenuto */}
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <div className="empty-title">{hasFilters ? 'Nessun elemento trovato' : 'Il mondo è vuoto'}</div>
          <div className="empty-sub">{hasFilters ? 'Prova a cambiare i filtri' : 'Inizia creando il primo elemento'}</div>
        </div>
      ) : viewMode === 'grid' ? (
        // ── Vista griglia ──
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
        // ── Vista lista compatta ──
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
                {/* Dot categoria */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

                {/* Importanza */}
                <span style={{ fontSize: 11, color: 'var(--gold)', flexShrink: 0, width: 32, textAlign: 'center' }}>
                  {impStars[imp]}
                </span>

                {/* Nome */}
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {el.name}
                </span>

                {/* Categoria */}
                <span style={{ fontSize: 11, color, flexShrink: 0, minWidth: 80 }}>
                  {cat?.icon} {el.sub ? `${cat?.name} › ${el.sub}` : cat?.name}
                </span>

                {/* Descrizione breve */}
                <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                  {el.desc || '—'}
                </span>

                {/* Stato */}
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
                cat: 'event', name: `Nascita di ${data.name}`,
                desc: `${data.name} viene al mondo.`,
                date: birthDate, tags: [], status: 'done',
                extra: {}, powers: [], equip: [], changelog: [], notes: '',
              });
            }
            if (data.cat === 'event' && data.eventPlace && data.date && data.eventEls?.length) {
              for (const elId of data.eventEls) {
                const el = elements.find(e => e.id === elId);
                if (!el) continue;
                const exists = (el.changelog || []).some(c => c.date === data.date && c.placeId === data.eventPlace);
                if (!exists) await updateEl(elId, { changelog: [...(el.changelog || []), { date: data.date, placeId: data.eventPlace, text: `Presente durante: ${data.name}` }] });
              }
            }
            setShowModal(false);
            showToast('✓ Elemento creato');
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}