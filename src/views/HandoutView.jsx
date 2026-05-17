import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

const TIPI = [
  { id: 'lettera',   icon: '✉',  color: '#c8a060', bg: '#2a1e0a' },
  { id: 'documento', icon: '📄',  color: '#8888cc', bg: '#12121e' },
  { id: 'mappa',     icon: '🗺',  color: '#6ab675', bg: '#0a1e0e' },
  { id: 'indizio',   icon: '🔍',  color: '#d4a84c', bg: '#1e1a08' },
  { id: 'pergamena', icon: '📜',  color: '#b09050', bg: '#1e1808' },
  { id: 'oggetto',   icon: '💎',  color: '#a090d0', bg: '#14101e' },
  { id: 'altro',     icon: '📁',  color: '#888',    bg: '#141414' },
];
const tipoById = (id) => TIPI.find(t => t.id === id) || TIPI[TIPI.length - 1];

// ── Modal ─────────────────────────────────────────────────────────────────────
function HandoutModal({ initialData, sessioni, elements, elColor, elIcon, onSave, onClose }) {
  const { t } = useTranslation();
  const [titolo,    setTitolo]    = useState(initialData?.titolo    || '');
  const [tipo,      setTipo]      = useState(initialData?.tipo      || 'documento');
  const [contenuto, setContenuto] = useState(initialData?.contenuto || '');
  const [image,     setImage]     = useState(initialData?.image     || '');
  const [sessione,  setSessione]  = useState(initialData?.sessione  || '');
  const [tags,      setTags]      = useState(initialData?.tags      || []);
  const [tagQuery,  setTagQuery]  = useState('');
  const [tagOpen,   setTagOpen]   = useState(false);

  const availableTags = elements.filter(e =>
    !tags.includes(e.id) &&
    (!tagQuery || e.name.toLowerCase().includes(tagQuery.toLowerCase()))
  );

  const addTag    = (id) => { setTags(prev => [...prev, id]); setTagQuery(''); };
  const removeTag = (id) => setTags(prev => prev.filter(x => x !== id));

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('hnd.modal_edit') : t('hnd.modal_new')}</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="fg" style={{ flex: 1, minWidth: 180 }}>
            <label className="fl">{t('hnd.title_lbl')}</label>
            <input className="fi" autoFocus placeholder={t('hnd.title_ph')} value={titolo}
              onChange={e => setTitolo(e.target.value)} autoComplete="off" />
          </div>
          <div className="fg" style={{ flex: '0 0 160px' }}>
            <label className="fl">{t('hnd.tipo_lbl')}</label>
            <select className="fs" value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPI.map(tp => (
                <option key={tp.id} value={tp.id}>{tp.icon} {t('hnd.tipo_' + tp.id)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl">{t('hnd.content_lbl')}</label>
          <textarea className="ft" style={{ minHeight: 130 }} placeholder={t('hnd.content_ph')}
            value={contenuto} onChange={e => setContenuto(e.target.value)} />
        </div>

        <div className="fg">
          <label className="fl">{t('hnd.image_lbl')}</label>
          <input className="fi" placeholder={t('hnd.image_ph')} value={image}
            onChange={e => setImage(e.target.value)} autoComplete="off" />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="fg" style={{ flex: 1, minWidth: 160 }}>
            <label className="fl">{t('hnd.session_lbl')}</label>
            <select className="fs" value={sessione} onChange={e => setSessione(e.target.value)}>
              <option value="">{t('hnd.session_none')}</option>
              {sessioni.map(s => (
                <option key={s.id} value={s.id}>S{s.numero} — {s.titolo}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl">{t('hnd.tags_lbl')}</label>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}
            onClick={() => document.getElementById('hndTagIn')?.focus()}>
            {tags.map(id => {
              const el = elements.find(e => e.id === id);
              if (!el) return null;
              return (
                <span key={id} style={{ background: elColor(el) + '22', border: `1px solid ${elColor(el)}55`, borderRadius: 20, padding: '2px 8px', fontSize: 12, color: elColor(el), display: 'flex', alignItems: 'center', gap: 5 }}>
                  {elIcon(el)} {el.name}
                  <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeTag(id); }}>×</span>
                </span>
              );
            })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input id="hndTagIn" type="text" placeholder={tags.length ? '' : t('hnd.tags_ph')}
                value={tagQuery}
                onChange={e => { setTagQuery(e.target.value); setTagOpen(true); }}
                onFocus={() => setTagOpen(true)}
                onBlur={() => setTimeout(() => setTagOpen(false), 150)}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }} />
              {tagOpen && availableTags.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 200, overflowY: 'auto' }}>
                  {availableTags.slice(0, 30).map(el => (
                    <div key={el.id} onMouseDown={() => addTag(el.id)}
                      style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: elColor(el), flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text)' }}>{el.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={() => onSave({ titolo: titolo.trim(), tipo, contenuto, image: image.trim(), sessione, tags, rivelato: initialData?.rivelato || false })}
            disabled={!titolo.trim()}>
            {initialData ? t('common.save_changes') : t('hnd.create_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function HandoutCard({ handout, sessioni, elements, elColor, elIcon, onEdit, onDelete, onToggleReveal }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const tp = tipoById(handout.tipo);
  const sess = sessioni.find(s => s.id === handout.sessione);
  const linkedEls = (handout.tags || []).map(id => elements.find(e => e.id === id)).filter(Boolean);

  return (
    <div style={{ background: tp.bg, border: `1px solid ${tp.color}44`, borderLeft: `3px solid ${tp.color}`, borderRadius: 'var(--r)', overflow: 'hidden', opacity: handout.rivelato ? 1 : .85 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(o => !o)}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{tp.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {handout.titolo}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: tp.color }}>{t('hnd.tipo_' + handout.tipo)}</span>
            {sess && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>S{sess.numero} — {sess.titolo}</span>}
          </div>
        </div>
        {/* Reveal badge */}
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: handout.rivelato ? '#1a302044' : '#2a1a1a44', color: handout.rivelato ? '#6ab675' : 'var(--text-muted)', border: `1px solid ${handout.rivelato ? '#6ab67544' : 'var(--border)'}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {handout.rivelato ? t('hnd.revealed') : t('hnd.hidden')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expanded ? '▾' : '▸'}</span>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${tp.color}33`, padding: '12px 14px' }}>
          {handout.image && (
            <img src={handout.image} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 4, marginBottom: 12, background: '#0a0a0a' }} />
          )}
          {handout.contenuto && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: handout.tipo === 'lettera' || handout.tipo === 'pergamena' ? "'Playfair Display', serif" : "'Crimson Pro', serif" }}>
              {handout.contenuto}
            </p>
          )}
          {linkedEls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {linkedEls.map(el => (
                <span key={el.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: elColor(el) + '22', border: `1px solid ${elColor(el)}44`, color: elColor(el) }}>
                  {elIcon(el)} {el.name}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => onToggleReveal(handout)}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif", background: handout.rivelato ? '#1a3020' : 'var(--gold-glow)', border: `1px solid ${handout.rivelato ? '#6ab67566' : 'var(--gold-dim)'}`, color: handout.rivelato ? '#6ab675' : 'var(--gold)' }}>
              {handout.rivelato ? t('hnd.btn_hide') : t('hnd.btn_reveal')}
            </button>
            <button className="btn-g" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onEdit(handout)}>
              {t('dp.edit_btn')}
            </button>
            <button className="btn-g" style={{ fontSize: 12, padding: '5px 12px', color: '#e07070' }} onClick={() => onDelete(handout)}>
              {t('dp.delete_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function HandoutView({ showToast }) {
  const { t } = useTranslation();
  const { handouts, addHandout, updateHandout, deleteHandout, sessioni, elements, elColor, elIcon } = useWorld();

  const [modal,       setModal]       = useState(null); // null | 'new' | handout
  const [filterTipo,  setFilterTipo]  = useState('');
  const [filterSess,  setFilterSess]  = useState('');
  const [filterState, setFilterState] = useState(''); // '' | 'rivelato' | 'nascosto'
  const [search,      setSearch]      = useState('');

  const filtered = handouts.filter(h => {
    if (filterTipo  && h.tipo     !== filterTipo)                         return false;
    if (filterSess  && h.sessione !== filterSess)                         return false;
    if (filterState === 'rivelato' && !h.rivelato)                        return false;
    if (filterState === 'nascosto' && h.rivelato)                         return false;
    if (search && !h.titolo.toLowerCase().includes(search.toLowerCase()) &&
        !(h.contenuto || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (data) => {
    if (modal === 'new') {
      await addHandout(data);
      showToast(t('hnd.toast_created'));
    } else {
      await updateHandout(modal.id, data);
      showToast(t('hnd.toast_updated'));
    }
    setModal(null);
  };

  const handleDelete = async (h) => {
    if (!window.confirm(t('hnd.confirm_delete', { title: h.titolo }))) return;
    await deleteHandout(h.id);
    showToast(t('hnd.toast_deleted'));
  };

  const handleToggleReveal = async (h) => {
    await updateHandout(h.id, { rivelato: !h.rivelato });
    showToast(h.rivelato ? t('hnd.toast_hidden') : t('hnd.toast_revealed'));
  };

  const revealedCount = handouts.filter(h => h.rivelato).length;

  return (
    <div className="view">
      <div className="view-hd">
        <div>
          <div className="view-title">📜 <span>{t('hnd.title')}</span></div>
          {handouts.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('hnd.revealed_count', { shown: revealedCount, total: handouts.length })}
            </div>
          )}
        </div>
        <button className="btn-p" onClick={() => setModal('new')}>{t('hnd.new_btn')}</button>
      </div>

      {/* Filters */}
      {handouts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="fi" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}
            placeholder={t('hnd.search_ph')} value={search} onChange={e => setSearch(e.target.value)} />
          <select className="fs" style={{ flex: '0 0 150px' }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">{t('hnd.filter_all_types')}</option>
            {TIPI.map(tp => <option key={tp.id} value={tp.id}>{tp.icon} {t('hnd.tipo_' + tp.id)}</option>)}
          </select>
          <select className="fs" style={{ flex: '0 0 150px' }} value={filterSess} onChange={e => setFilterSess(e.target.value)}>
            <option value="">{t('hnd.filter_all_sessions')}</option>
            {sessioni.map(s => <option key={s.id} value={s.id}>S{s.numero} — {s.titolo}</option>)}
          </select>
          <select className="fs" style={{ flex: '0 0 140px' }} value={filterState} onChange={e => setFilterState(e.target.value)}>
            <option value="">{t('hnd.filter_all_states')}</option>
            <option value="rivelato">{t('hnd.revealed')}</option>
            <option value="nascosto">{t('hnd.hidden')}</option>
          </select>
        </div>
      )}

      {handouts.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📜</div>
          <div className="empty-title">{t('hnd.empty_title')}</div>
          <div className="empty-sub">{t('hnd.empty_sub')}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
          {t('hnd.no_results')}
        </div>
      ) : (
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(h => (
            <HandoutCard key={h.id} handout={h}
              sessioni={sessioni} elements={elements} elColor={elColor} elIcon={elIcon}
              onEdit={setModal} onDelete={handleDelete} onToggleReveal={handleToggleReveal} />
          ))}
        </div>
      )}

      {modal && (
        <HandoutModal
          initialData={modal === 'new' ? null : modal}
          sessioni={sessioni} elements={elements} elColor={elColor} elIcon={elIcon}
          onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
