import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import ElementPicker from '../components/ElementPicker';

const STATI = ['ignoto', 'in_indagine', 'confermato', 'smentito'];

const STATO_COLOR = {
  ignoto:       '#888',
  in_indagine:  '#d4a84c',
  confermato:   '#6ab675',
  smentito:     '#e07070',
};

// ── Create / Edit modal ──
function RumorModal({ initialData, onSave, onClose, sessioni }) {
  const { t } = useTranslation();
  const [testo,    setTesto]    = useState(initialData?.testo    || '');
  const [fonte,    setFonte]    = useState(initialData?.fonte    || '');
  const [stato,    setStato]    = useState(initialData?.stato    || 'ignoto');
  const [sessione, setSessione] = useState(initialData?.sessione || '');
  const [elementi, setElementi] = useState(initialData?.elementi || []);
  const [note,     setNote]     = useState(initialData?.note     || '');

  const handleSave = () => {
    if (!testo.trim()) return;
    onSave({ testo: testo.trim(), fonte: fonte.trim(), stato, sessione: sessione || null, elementi, note: note.trim() });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('rumors.modal_edit') : t('rumors.modal_new')}</div>

        <div className="fg">
          <label className="fl">{t('rumors.testo_lbl')}</label>
          <textarea className="ft" placeholder={t('rumors.testo_ph')} value={testo}
            onChange={e => setTesto(e.target.value)} autoFocus style={{ minHeight: 80 }} />
        </div>

        <div className="fg">
          <label className="fl">{t('rumors.fonte_lbl')}</label>
          <input className="fi" placeholder={t('rumors.fonte_ph')} value={fonte} onChange={e => setFonte(e.target.value)} autoComplete="off" />
        </div>

        <div className="fg">
          <label className="fl">{t('rumors.stato_lbl')}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {STATI.map(s => (
              <button key={s} type="button" onClick={() => setStato(s)}
                style={{ flex: 1, padding: '6px 4px', fontSize: 11, fontFamily: "'Crimson Pro', serif", cursor: 'pointer',
                  background: stato === s ? STATO_COLOR[s] + '22' : 'var(--surface2)',
                  border: `1px solid ${stato === s ? STATO_COLOR[s] : 'var(--border)'}`,
                  color: stato === s ? STATO_COLOR[s] : 'var(--text-muted)',
                  borderRadius: 'var(--r)', transition: 'all .15s' }}>
                {t('rumors.stato_' + s)}
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label className="fl">{t('rumors.sessione_lbl')}</label>
          <select className="fs" value={sessione} onChange={e => setSessione(e.target.value)}>
            <option value="">{t('rumors.no_session')}</option>
            {sessioni.map(s => <option key={s.id} value={s.id}>S{s.numero} — {s.titolo}</option>)}
          </select>
        </div>

        <div className="fg">
          <label className="fl">{t('rumors.elementi_lbl')}</label>
          <ElementPicker selected={elementi} onChange={setElementi} inputId="rumModalPicker" />
        </div>

        <div className="fg">
          <label className="fl">{t('rumors.note_lbl')}</label>
          <textarea className="ft" placeholder={t('rumors.note_ph')} value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 55 }} />
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave} disabled={!testo.trim()}>
            {initialData ? t('common.save_changes') : t('rumors.create_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single rumor card ──
function RumorCard({ rumor, onEdit, onDelete, onOpenElement }) {
  const { t } = useTranslation();
  const { elements, sessioni, allCats } = useWorld();
  const cats = allCats();
  const [expanded, setExpanded] = useState(false);

  const color = STATO_COLOR[rumor.stato] || '#888';
  const sess  = sessioni.find(s => s.id === rumor.sessione);
  const hasExtra = rumor.fonte || (rumor.elementi || []).length > 0 || rumor.note;

  return (
    <div style={{ background: 'var(--surface2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`, borderRadius: 'var(--r)', marginBottom: 8 }}>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, cursor: hasExtra ? 'pointer' : 'default' }}
        onClick={() => hasExtra && setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: color + '22', color, border: `1px solid ${color}44`, flexShrink: 0 }}>
              {t('rumors.stato_' + rumor.stato)}
            </span>
            {sess && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>S{sess.numero}</span>
            )}
            {hasExtra && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: "'Crimson Pro', serif", lineHeight: 1.5 }}>{rumor.testo}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r)', padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
            {t('dp.edit_btn')}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'none', border: '1px solid var(--border)', color: '#e07070', borderRadius: 'var(--r)', padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
          {rumor.fonte && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              <span style={{ fontStyle: 'normal', color: 'var(--text-dim)', marginRight: 4 }}>{t('rumors.fonte_lbl')}:</span>
              {rumor.fonte}
            </div>
          )}
          {(rumor.elementi || []).length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(rumor.elementi || []).map(id => {
                const el = elements.find(e => e.id === id);
                if (!el) return null;
                const elColor = cats.find(c => c.id === el.cat)?.color || '#888';
                return (
                  <span key={id} onClick={() => onOpenElement(id)}
                    style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: elColor + '18', border: `1px solid ${elColor}44`, color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: elColor }} />
                    {el.name}
                  </span>
                );
              })}
            </div>
          )}
          {rumor.note && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{rumor.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main view ──
export default function RumorsView({ onOpenElement, showToast }) {
  const { t } = useTranslation();
  const { rumors, sessioni, addRumor, updateRumor, deleteRumor } = useWorld();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editRumor,  setEditRumor]  = useState(null);
  const [filterStato, setFilterStato] = useState('all');

  const filtered = useMemo(() => {
    if (filterStato === 'all') return rumors;
    return rumors.filter(r => r.stato === filterStato);
  }, [rumors, filterStato]);

  const handleSave = async (data) => {
    if (editRumor) {
      await updateRumor(editRumor.id, data);
      showToast(t('rumors.toast_updated'));
    } else {
      await addRumor(data);
      showToast(t('rumors.toast_created'));
    }
    setModalOpen(false);
    setEditRumor(null);
  };

  const handleDelete = async (rumor) => {
    if (!window.confirm(t('rumors.confirm_delete'))) return;
    await deleteRumor(rumor.id);
    showToast(t('rumors.toast_deleted'));
  };

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">💬 <span>{t('rumors.title')}</span></div>
        <div className="vhact">
          <button className="btn-p" onClick={() => { setEditRumor(null); setModalOpen(true); }}>
            {t('rumors.new_btn')}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStato('all')}
          style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
            background: filterStato === 'all' ? 'var(--gold-glow)' : 'var(--surface2)',
            border: `1px solid ${filterStato === 'all' ? 'var(--gold-dim)' : 'var(--border)'}`,
            color: filterStato === 'all' ? 'var(--gold)' : 'var(--text-muted)' }}>
          {t('rumors.filter_all')} <span style={{ opacity: .6 }}>{rumors.length}</span>
        </button>
        {STATI.map(s => {
          const count = rumors.filter(r => r.stato === s).length;
          return (
            <button key={s} onClick={() => setFilterStato(s)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                background: filterStato === s ? STATO_COLOR[s] + '22' : 'var(--surface2)',
                border: `1px solid ${filterStato === s ? STATO_COLOR[s] : 'var(--border)'}`,
                color: filterStato === s ? STATO_COLOR[s] : 'var(--text-muted)' }}>
              {t('rumors.stato_' + s)} <span style={{ opacity: .6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💬</div>
          <div className="empty-title">{t('rumors.empty_title')}</div>
          <div className="empty-sub">{t('rumors.empty_sub')}</div>
        </div>
      ) : (
        <div>
          {filtered.map(r => (
            <RumorCard key={r.id} rumor={r}
              onEdit={() => { setEditRumor(r); setModalOpen(true); }}
              onDelete={() => handleDelete(r)}
              onOpenElement={onOpenElement} />
          ))}
        </div>
      )}

      {modalOpen && (
        <RumorModal
          initialData={editRumor}
          sessioni={sessioni}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditRumor(null); }} />
      )}
    </div>
  );
}
