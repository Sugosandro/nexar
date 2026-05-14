import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import ElementPicker from '../components/ElementPicker';

// ── Filo modal ────────────────────────────────────────────────────────────────
function FiloModal({ initialData, onSave, onClose }) {
  const { t } = useTranslation();
  const { sessioni } = useWorld();

  const [titolo,    setTitolo]    = useState(initialData?.titolo              || '');
  const [desc,      setDesc]      = useState(initialData?.descrizione         || '');
  const [stato,     setStato]     = useState(initialData?.stato               || 'aperto');
  const [sessAp,    setSessAp]    = useState(initialData?.sessioneApertura    || '');
  const [sessRis,   setSessRis]   = useState(initialData?.sessioneRisoluzione || '');
  const [elementi,  setElementi]  = useState(initialData?.elementiCollegati   || []);

  const handleSave = () => {
    if (!titolo.trim()) return;
    onSave({
      titolo: titolo.trim(),
      descrizione: desc,
      stato,
      sessioneApertura:    sessAp  || null,
      sessioneRisoluzione: sessRis || null,
      elementiCollegati: elementi,
    });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('fili.modal_edit') : t('fili.modal_new')}</div>

        <div className="fg">
          <label className="fl">{t('fili.title_lbl')}</label>
          <input className="fi" placeholder={t('fili.title_ph')} value={titolo} onChange={e => setTitolo(e.target.value)} autoFocus autoComplete="off" />
        </div>

        <div className="fg">
          <label className="fl">{t('fili.desc_lbl')}</label>
          <textarea className="ft" placeholder={t('fili.desc_ph')} value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="fg" style={{ flex: '0 0 140px' }}>
            <label className="fl">{t('fili.stato_lbl')}</label>
            <select className="fi" value={stato} onChange={e => setStato(e.target.value)}>
              <option value="aperto">{t('fili.stato_aperto')}</option>
              <option value="in_sviluppo">{t('fili.stato_in_sviluppo')}</option>
              <option value="risolto">{t('fili.stato_risolto')}</option>
            </select>
          </div>
          <div className="fg" style={{ flex: 1, minWidth: 160 }}>
            <label className="fl">{t('fili.session_open_lbl')}</label>
            <select className="fi" value={sessAp} onChange={e => setSessAp(e.target.value)}>
              <option value="">{t('fili.no_session')}</option>
              {sessioni.map(s => (
                <option key={s.id} value={s.id}>{t('sess.card_session_n', { n: s.numero })} — {s.titolo}</option>
              ))}
            </select>
          </div>
          {stato === 'risolto' && (
            <div className="fg" style={{ flex: 1, minWidth: 160 }}>
              <label className="fl">{t('fili.session_resolve_lbl')}</label>
              <select className="fi" value={sessRis} onChange={e => setSessRis(e.target.value)}>
                <option value="">{t('fili.no_session')}</option>
                {sessioni.map(s => (
                  <option key={s.id} value={s.id}>{t('sess.card_session_n', { n: s.numero })} — {s.titolo}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="fg">
          <label className="fl">{t('fili.elements_lbl')}</label>
          <ElementPicker selected={elementi} onChange={setElementi} />
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave} disabled={!titolo.trim()}>
            {initialData ? t('common.save_changes') : t('fili.create_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filo card ─────────────────────────────────────────────────────────────────
const STATO_COLORS = {
  aperto:      'var(--gold)',
  in_sviluppo: '#8ec8e4',
  risolto:     '#6ab675',
};

function FiloCard({ filo, onEdit, onDelete, onAdvance, onOpenElement }) {
  const { t } = useTranslation();
  const { elements, elColor, elIcon, sessioni } = useWorld();
  const [expanded, setExpanded] = useState(false);

  const linkedEls   = (filo.elementiCollegati || []).map(id => elements.find(e => e.id === id)).filter(Boolean);
  const sessApertura = filo.sessioneApertura ? sessioni.find(s => s.id === filo.sessioneApertura) : null;
  const borderColor  = STATO_COLORS[filo.stato] || 'var(--border)';

  // Sessioni collegate: sessioneApertura/Risoluzione + sessioni che hanno questo filo in prep.filiToccati
  const sessionsLinked = useMemo(() => {
    const ids = new Set();
    if (filo.sessioneApertura)    ids.add(filo.sessioneApertura);
    if (filo.sessioneRisoluzione) ids.add(filo.sessioneRisoluzione);
    sessioni.forEach(s => {
      if ((s.preparazione?.filiToccati || []).includes(filo.id)) ids.add(s.id);
    });
    return [...ids].map(id => sessioni.find(s => s.id === id)).filter(Boolean);
  }, [filo, sessioni]);

  const nextStato  = filo.stato === 'aperto' ? 'in_sviluppo' : filo.stato === 'in_sviluppo' ? 'risolto' : null;
  const advanceLbl = filo.stato === 'aperto' ? t('fili.advance_to_wip') : filo.stato === 'in_sviluppo' ? t('fili.advance_to_resolved') : null;

  return (
    <div className="card" style={{ borderLeft: `3px solid ${borderColor}`, marginBottom: 8 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(o => !o)}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filo.titolo}
        </span>
        {sessApertura && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t('sess.card_session_n', { n: sessApertura.numero })}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {nextStato && (
            <button
              className="btn-g"
              style={{ fontSize: 11, padding: '2px 8px', color: borderColor }}
              onClick={() => onAdvance(filo, nextStato)}
            >
              {advanceLbl}
            </button>
          )}
          <button className="btn-g" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => onEdit(filo)}>
            {t('dp.edit_btn')}
          </button>
          <button className="btn-g" style={{ fontSize: 11, padding: '2px 8px', color: '#e07070' }} onClick={() => onDelete(filo)}>
            {t('dp.delete_btn')}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {filo.descrizione ? (
            <p style={{ margin: '10px 0', color: 'var(--text)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {filo.descrizione}
            </p>
          ) : (
            <p style={{ margin: '10px 0', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
              {t('fili.no_desc')}
            </p>
          )}

          {linkedEls.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
                {t('fili.elements_lbl')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {linkedEls.map(el => (
                  <span
                    key={el.id}
                    style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: elColor(el) + '22', border: `1px solid ${elColor(el)}55`, color: elColor(el), cursor: 'pointer' }}
                    onClick={() => onOpenElement(el.id)}
                  >
                    {elIcon(el)} {el.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sessionsLinked.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
                {t('sess.title')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {sessionsLinked.map(s => (
                  <span key={s.id} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--gold-glow)', border: '1px solid var(--gold-dim)', color: 'var(--gold)' }}>
                    S{s.numero} — {s.titolo}
                    {s.id === filo.sessioneRisoluzione && <span style={{ marginLeft: 4, opacity: .8 }}>✓</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 10px' }}>
      <div style={{ height: 2, flex: 1, background: color, opacity: .3 }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color }}>
        {label}
      </span>
      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: color + '22', color, border: `1px solid ${color}44` }}>
        {count}
      </span>
      <div style={{ height: 2, flex: 1, background: color, opacity: .3 }} />
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function FiliView({ onOpenElement, showToast }) {
  const { t } = useTranslation();
  const { fili, addFilo, updateFilo, deleteFilo } = useWorld();
  const [modal, setModal] = useState(null); // null | 'new' | filo object

  const aperti     = useMemo(() => fili.filter(f => f.stato === 'aperto'),      [fili]);
  const inSviluppo = useMemo(() => fili.filter(f => f.stato === 'in_sviluppo'), [fili]);
  const risolti    = useMemo(() => fili.filter(f => f.stato === 'risolto'),     [fili]);

  const handleSave = async (data) => {
    if (modal === 'new') {
      await addFilo(data);
      showToast(t('fili.toast_created'));
    } else {
      await updateFilo(modal.id, data);
      showToast(t('fili.toast_updated'));
    }
    setModal(null);
  };

  const handleAdvance = async (filo, nextStato) => {
    await updateFilo(filo.id, { stato: nextStato });
    showToast(t('fili.toast_advanced'));
  };

  const handleDelete = async (filo) => {
    if (!window.confirm(t('fili.confirm_delete', { title: filo.titolo }))) return;
    await deleteFilo(filo.id);
    showToast(t('fili.toast_deleted'));
  };

  const renderCards = (list) =>
    list.map(f => (
      <FiloCard
        key={f.id}
        filo={f}
        onEdit={setModal}
        onDelete={handleDelete}
        onAdvance={handleAdvance}
        onOpenElement={onOpenElement}
      />
    ));

  const emptySection = (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '6px 0 14px' }}>
      {t('fili.section_empty')}
    </div>
  );

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">🔀 <span>{t('fili.title')}</span></div>
        <button className="btn-p" onClick={() => setModal('new')}>{t('fili.new_btn')}</button>
      </div>

      {fili.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔀</div>
          <div className="empty-title">{t('fili.empty_title')}</div>
          <div className="empty-sub">{t('fili.empty_sub')}</div>
        </div>
      ) : (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <SectionHeader label={t('fili.section_open')} count={aperti.length} color="var(--gold)" />
          {aperti.length === 0 ? emptySection : renderCards(aperti)}

          <SectionHeader label={t('fili.section_wip')} count={inSviluppo.length} color="#8ec8e4" />
          {inSviluppo.length === 0 ? emptySection : renderCards(inSviluppo)}

          <SectionHeader label={t('fili.section_resolved')} count={risolti.length} color="#6ab675" />
          {risolti.length === 0 ? emptySection : renderCards(risolti)}
        </div>
      )}

      {modal && (
        <FiloModal
          initialData={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
