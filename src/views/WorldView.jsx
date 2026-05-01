// src/views/WorldView.jsx
// ─────────────────────────────────────────────
// Vista principale "Il tuo Mondo" con la griglia di card.
// Questo è il punto di partenza per la riscrittura delle viste.
// ─────────────────────────────────────────────

import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementCard from '../components/ElementCard';
import ElementModal from '../components/ElementModal';

const STATUS_FILTER_LABELS = {
  '':      'Tutti',
  'draft': '✏ Bozza',
  'wip':   '🔵 In sviluppo',
  'done':  '✅ Definitivo',
};

export default function WorldView({ onOpenElement, showToast }) {
  const { elements, allCats, addEl, updateEl, showToast: _ } = useWorld();
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [modalCat,     setModalCat]     = useState('char');

  // Filtra per categoria (esclude eventi dalla vista Mondo)
  const cats = allCats().filter(c => c.id !== 'event');

  // Raggruppa elementi per categoria e sottocategoria
  const sections = [];
  cats.forEach(cat => {
    let items = elements.filter(e => e.cat === cat.id);
    if (statusFilter) items = items.filter(e => (e.status || 'draft') === statusFilter);
    if (!items.length) return;

    // Raggruppa per sub
    const subs = ['', ...new Set(items.filter(e => e.sub).map(e => e.sub))];
    subs.forEach(sub => {
      const subItems = sub
        ? items.filter(e => e.sub === sub)
        : items.filter(e => !e.sub || e.sub === '');
      if (!subItems.length) return;
      const label = sub ? `${cat.icon} ${cat.name} › ${sub}` : `${cat.icon} ${cat.name}`;
      sections.push({ key: `${cat.id}-${sub}`, label, color: cat.color, items: subItems });
    });
  });

  return (
    <div className="view">
      {/* Header */}
      <div className="view-hd">
        <div className="view-title">Il tuo <span>Mondo</span></div>
        <div className="vhact">
          <button className="btn-p" onClick={() => setShowModal(true)}>
            + Nuovo elemento
          </button>
        </div>
      </div>

      {/* Filtri stato */}
      <div className="world-filters">
        <span className="world-filter-lbl">Stato:</span>
        {Object.entries(STATUS_FILTER_LABELS).map(([val, label]) => (
          <button
            key={val}
            className={`world-filter ${statusFilter === val ? 'active' : ''}`}
            onClick={() => setStatusFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      {sections.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <div className="empty-title">
            {statusFilter ? `Nessun elemento con stato "${STATUS_FILTER_LABELS[statusFilter]}"` : 'Il mondo è vuoto'}
          </div>
          <div className="empty-sub">Inizia creando il primo elemento</div>
        </div>
      ) : (
        sections.map(({ key, label, color, items }) => (
          <div key={key} style={{ marginBottom: 24 }}>
            <div className="sec-div">
              <span className="sec-div-lbl" style={{ color }}>{label}</span>
              <div className="sec-div-line" />
            </div>
            <div className="cards-grid">
              {items.map(el => (
                <ElementCard
                  key={el.id}
                  element={el}
                  onClick={() => onOpenElement(el.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal creazione elemento */}
      {showModal && (
        <ElementModal
          defaultCat={modalCat}
          onSave={async (data, birthDate) => {
  await addEl(data);

  // Evento di nascita automatico
  if (birthDate) {
    await addEl({
      cat: 'event', name: `Nascita di ${data.name}`,
      desc: `${data.name} viene al mondo.`,
      date: birthDate, tags: [], status: 'done',
      extra: {}, powers: [], equip: [], changelog: [], notes: '',
    });
  }

  // Aggiorna storico elementi presenti all'evento
  if (data.cat === 'event' && data.eventPlace && data.date && data.eventEls?.length) {
    for (const elId of data.eventEls) {
      const el = elements.find(e => e.id === elId);
      if (!el) continue;
      const newEntry = {
        date:    data.date,
        placeId: data.eventPlace,
        text:    `Presente durante: ${data.name}`,
      };
      await updateEl(elId, { changelog: [...(el.changelog || []), newEntry] });
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
