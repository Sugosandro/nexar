import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import ElementPicker from '../components/ElementPicker';

// ── Fili picker ───────────────────────────────────────────────────────────────
const FILO_COLORS   = { aperto: 'var(--gold)', in_sviluppo: '#8ec8e4', risolto: '#6ab675' };
const RUMOR_COLORS  = { ignoto: '#888', in_indagine: '#d4a84c', confermato: '#6ab675', smentito: '#e07070' };

function FiliPicker({ selected, onChange, inputId = 'filiPickerIn' }) {
  const { t } = useTranslation();
  const { fili } = useWorld();
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);

  const available = fili.filter(
    f => !selected.includes(f.id) && (!q || f.titolo.toLowerCase().includes(q.toLowerCase()))
  );

  const add    = (id) => { onChange([...selected, id]); setQ(''); };
  const remove = (id) => onChange(selected.filter(s => s !== id));

  return (
    <div
      onClick={() => document.getElementById(inputId)?.focus()}
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}
    >
      {selected.map(id => {
        const filo = fili.find(f => f.id === id);
        if (!filo) return null;
        return (
          <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: FILO_COLORS[filo.stato] || 'var(--border)', flexShrink: 0 }} />
            {filo.titolo}
            <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); remove(id); }}>×</span>
          </span>
        );
      })}
      <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
        <input
          id={inputId}
          type="text"
          placeholder={selected.length ? '' : t('sess.prep_fili_ph')}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }}
        />
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 220, overflowY: 'auto' }}>
            {available.length === 0
              ? <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('fili.empty_title')}</div>
              : available.map(f => (
                <div
                  key={f.id}
                  onMouseDown={() => add(f.id)}
                  style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: FILO_COLORS[f.stato] || 'var(--border)', flexShrink: 0 }} />
                  <span>{f.titolo}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rumors picker ─────────────────────────────────────────────────────────────
function RumorsPicker({ selected, onChange, inputId = 'rumorsPickerIn' }) {
  const { t } = useTranslation();
  const { rumors } = useWorld();
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);

  const available = rumors.filter(
    r => !selected.includes(r.id) && (!q || r.testo.toLowerCase().includes(q.toLowerCase()))
  );

  const add    = (id) => { onChange([...selected, id]); setQ(''); };
  const remove = (id) => onChange(selected.filter(s => s !== id));

  return (
    <div
      onClick={() => document.getElementById(inputId)?.focus()}
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}
    >
      {selected.map(id => {
        const r = rumors.find(x => x.id === id);
        if (!r) return null;
        const col = RUMOR_COLORS[r.stato] || '#888';
        return (
          <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.testo}</span>
            <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); remove(id); }}>×</span>
          </span>
        );
      })}
      <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
        <input
          id={inputId}
          type="text"
          placeholder={selected.length ? '' : t('sess.rumors_ph')}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }}
        />
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 220, overflowY: 'auto' }}>
            {available.length === 0
              ? <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('rumors.empty_title')}</div>
              : available.map(r => {
                  const col = RUMOR_COLORS[r.stato] || '#888';
                  return (
                    <div
                      key={r.id}
                      onMouseDown={() => add(r.id)}
                      style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.testo}</span>
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thread tag input ──────────────────────────────────────────────────────────
function ThreadTagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {value.map((tag, i) => (
            <span key={i} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {tag}
              <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={() => remove(i)}>×</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="fi"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn-g" onClick={add} style={{ flexShrink: 0, padding: '5px 12px' }}>+</button>
      </div>
    </div>
  );
}

// ── Preparation section ───────────────────────────────────────────────────────
function PrepSection({ sessione, onSavePrep, onUseAsBase }) {
  const { t } = useTranslation();
  const prep = sessione.preparazione || {};

  const [png,    setPng]    = useState(prep.pngCoinvolti   || []);
  const [luoghi, setLuoghi] = useState(prep.luoghiPrevisti || []);
  const [fili,   setFili]   = useState(prep.filiToccati    || []);
  const [note,   setNote]   = useState(prep.noteDM         || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = sessione.preparazione || {};
    setPng(p.pngCoinvolti   || []);
    setLuoghi(p.luoghiPrevisti || []);
    setFili(p.filiToccati    || []);
    setNote(p.noteDM         || '');
  }, [sessione.preparazione]);

  const handleSave = async () => {
    setSaving(true);
    await onSavePrep({ pngCoinvolti: png, luoghiPrevisti: luoghi, filiToccati: fili, noteDM: note });
    setSaving(false);
  };

  return (
    <div>
      <div className="fg">
        <label className="fl">{t('sess.prep_png_lbl')}</label>
        <ElementPicker selected={png} onChange={setPng} filterCat="char" inputId={'prep_png_' + sessione.id} />
      </div>
      <div className="fg">
        <label className="fl">{t('sess.prep_luoghi_lbl')}</label>
        <ElementPicker selected={luoghi} onChange={setLuoghi} filterCat="place" inputId={'prep_luog_' + sessione.id} />
      </div>
      <div className="fg">
        <label className="fl">{t('sess.prep_fili_lbl')}</label>
        <FiliPicker selected={fili} onChange={setFili} inputId={'prep_fili_' + sessione.id} />
      </div>
      <div className="fg">
        <label className="fl">{t('sess.prep_note_lbl')}</label>
        <textarea
          className="ft"
          style={{ minHeight: 90 }}
          placeholder={t('sess.prep_note_ph')}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <button className="btn-p" onClick={handleSave} disabled={saving}>
          {saving ? '⏳' : t('sess.prep_save_btn')}
        </button>
        {note.trim() && (
          <button className="btn-g" onClick={() => onUseAsBase(note)}>
            {t('sess.prep_use_as_base')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Session modal ─────────────────────────────────────────────────────────────
function SessioneModal({ initialData, onSave, onClose, nextNumero }) {
  const { t } = useTranslation();
  const { fili: allFili, rumors: allRumors } = useWorld();
  const [numero,    setNumero]    = useState(initialData?.numero    ?? nextNumero);
  const [titolo,    setTitolo]    = useState(initialData?.titolo    || '');
  const [data,      setData]      = useState(initialData?.data      || new Date().toISOString().slice(0, 10));
  const [riassunto, setRiassunto] = useState(initialData?.riassunto || '');
  const [elementi,  setElementi]  = useState(initialData?.elementiCoinvolti || []);
  const [fili,      setFili]      = useState(() => {
    const ids = new Set([
      ...(initialData?.filiToccati               || []),
      ...(initialData?.preparazione?.filiToccati || []),
      ...(initialData ? allFili.filter(f => f.sessioneApertura === initialData.id || f.sessioneRisoluzione === initialData.id).map(f => f.id) : []),
    ]);
    return [...ids];
  });
  const [rumors,    setRumors]    = useState(() => {
    const ids = new Set([
      ...(initialData?.rumorsToccati || []),
      ...(initialData ? allRumors.filter(r => r.sessione === initialData.id).map(r => r.id) : []),
    ]);
    return [...ids];
  });

  const handleSave = () => {
    if (!titolo.trim()) return;
    onSave({
      numero: Number(numero),
      titolo: titolo.trim(),
      data,
      riassunto,
      elementiCoinvolti: elementi,
      filiToccati: fili,
      rumorsToccati: rumors,
    });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('sess.modal_edit') : t('sess.modal_new')}</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="fg" style={{ flex: '0 0 80px' }}>
            <label className="fl">{t('sess.number_lbl')}</label>
            <input className="fi" type="number" min="1" value={numero} onChange={e => setNumero(e.target.value)} autoComplete="off" />
          </div>
          <div className="fg" style={{ flex: 1, minWidth: 160 }}>
            <label className="fl">{t('sess.title_lbl')}</label>
            <input className="fi" placeholder={t('sess.title_ph')} value={titolo} onChange={e => setTitolo(e.target.value)} autoFocus autoComplete="off" />
          </div>
          <div className="fg" style={{ flex: '0 0 150px' }}>
            <label className="fl">{t('sess.date_lbl')}</label>
            <input className="fi" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>

        <div className="fg">
          <label className="fl">{t('sess.summary_lbl')}</label>
          <textarea className="ft" style={{ minHeight: 110 }} placeholder={t('sess.summary_ph')} value={riassunto} onChange={e => setRiassunto(e.target.value)} />
        </div>

        <div className="fg">
          <label className="fl">{t('sess.elements_lbl')}</label>
          <ElementPicker selected={elementi} onChange={setElementi} inputId="sessElIn" />
        </div>

        <div className="fg">
          <label className="fl">{t('sess.threads_lbl')}</label>
          <FiliPicker selected={fili} onChange={setFili} inputId="sessFiliIn" />
        </div>

        <div className="fg">
          <label className="fl">{t('sess.rumors_lbl')}</label>
          <RumorsPicker selected={rumors} onChange={setRumors} inputId="sessRumorsIn" />
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave} disabled={!titolo.trim()}>
            {initialData ? t('common.save_changes') : t('sess.create_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessioneCard({ sessione, onEdit, onDelete, onOpenElement, onSavePrep, onUseAsBase }) {
  const { t, i18n } = useTranslation();
  const { elements, fili, rumors, elColor, elIcon } = useWorld();
  const [expanded, setExpanded] = useState(false);
  const [tab,      setTab]      = useState('riassunto'); // 'riassunto' | 'prep'

  const involvedEls = (sessione.elementiCoinvolti || [])
    .map(id => elements.find(e => e.id === id))
    .filter(Boolean);

  // Fili collegati: unione di filiToccati (dal modal) + prep.filiToccati (dalla prep) + fili con link diretto
  const filiCollegati = useMemo(() => {
    const ids = new Set([
      ...(sessione.filiToccati                || []),
      ...(sessione.preparazione?.filiToccati  || []),
      ...fili.filter(f => f.sessioneApertura === sessione.id || f.sessioneRisoluzione === sessione.id).map(f => f.id),
    ]);
    return [...ids].map(id => fili.find(f => f.id === id)).filter(Boolean);
  }, [sessione, fili]);

  // Rumors collegati: unione di rumorsToccati (dal modal) + rumors con sessione diretta
  const rumorsCollegati = useMemo(() => {
    const ids = new Set([
      ...(sessione.rumorsToccati || []),
      ...rumors.filter(r => r.sessione === sessione.id).map(r => r.id),
    ]);
    return [...ids].map(id => rumors.find(r => r.id === id)).filter(Boolean);
  }, [sessione, rumors]);

  const dateStr = sessione.data
    ? new Date(sessione.data + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const prep = sessione.preparazione;
  const hasPrep = prep && (
    (prep.pngCoinvolti   || []).length > 0 ||
    (prep.luoghiPrevisti || []).length > 0 ||
    (prep.filiToccati    || []).length > 0 ||
    (prep.noteDM         || '').trim().length > 0
  );
  const showPrepBadge = hasPrep && !sessione.riassunto;

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--gold)', marginBottom: 10 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(o => !o)}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--gold)', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {t('sess.card_session_n', { n: sessione.numero })}
        </span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sessione.titolo}
        </span>
        {showPrepBadge && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#1e3d5044', color: '#8ec8e4', border: '1px solid #8ec8e444', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t('sess.prep_badge')}
          </span>
        )}
        {dateStr && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>{dateStr}</span>
        )}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button className="btn-g" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => onEdit(sessione)}>
            {t('dp.edit_btn')}
          </button>
          <button className="btn-g" style={{ fontSize: 11, padding: '2px 8px', color: '#e07070' }} onClick={() => onDelete(sessione)}>
            {t('dp.delete_btn')}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['riassunto', 'prep'].map(tabId => (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  background: tab === tabId ? 'var(--surface2)' : 'none',
                  border: 'none',
                  borderBottom: tab === tabId ? '2px solid var(--gold)' : '2px solid transparent',
                  color: tab === tabId ? 'var(--gold)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: "'Crimson Pro', serif",
                  fontWeight: tab === tabId ? 600 : 400,
                  transition: 'color .15s',
                }}
              >
                {tabId === 'riassunto' ? t('sess.tab_summary') : t('sess.tab_prep')}
              </button>
            ))}
          </div>

          <div style={{ padding: '14px' }}>
            {tab === 'riassunto' && (
              <>
                {sessione.riassunto ? (
                  <p style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    {sessione.riassunto}
                  </p>
                ) : (
                  <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
                    {t('sess.no_summary')}
                  </p>
                )}

                {involvedEls.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
                      {t('sess.elements_lbl')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {involvedEls.map(el => (
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

                {filiCollegati.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
                      {t('sess.threads_lbl')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {filiCollegati.map(f => {
                        const col = FILO_COLORS[f.stato] || 'var(--text-muted)';
                        return (
                          <span key={f.id} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: col + '22', border: `1px solid ${col}55`, color: col }}>
                            {f.titolo}
                            {f.sessioneRisoluzione === sessione.id && <span style={{ marginLeft: 4, opacity: .8 }}>✓</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rumorsCollegati.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
                      {t('sess.rumors_lbl')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {rumorsCollegati.map(r => {
                        const col = RUMOR_COLORS[r.stato] || '#888';
                        return (
                          <span key={r.id} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: col + '22', border: `1px solid ${col}55`, color: col, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.testo}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'prep' && (
              <PrepSection
                sessione={sessione}
                onSavePrep={(data) => onSavePrep(sessione.id, data)}
                onUseAsBase={(note) => onUseAsBase(sessione, note)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function SessioniView({ onOpenElement, showToast }) {
  const { t } = useTranslation();
  const { sessioni, addSessione, updateSessione, deleteSessione } = useWorld();
  const [modal, setModal] = useState(null); // null | 'new' | sessione object

  const nextNumero = useMemo(() => {
    if (!sessioni.length) return 1;
    return Math.max(...sessioni.map(s => s.numero || 0)) + 1;
  }, [sessioni]);

  const handleSave = async (data) => {
    if (modal === 'new') {
      await addSessione(data);
      showToast(t('sess.toast_created'));
    } else {
      await updateSessione(modal.id, data);
      showToast(t('sess.toast_updated'));
    }
    setModal(null);
  };

  const handleDelete = async (sessione) => {
    if (!window.confirm(t('sess.confirm_delete', { title: sessione.titolo }))) return;
    await deleteSessione(sessione.id);
    showToast(t('sess.toast_deleted'));
  };

  const handleSavePrep = async (sid, prepData) => {
    await updateSessione(sid, { preparazione: prepData });
    showToast(t('sess.prep_toast_saved'));
  };

  const handleUseAsBase = (sessione, noteText) => {
    setModal({
      ...sessione,
      riassunto: sessione.riassunto
        ? sessione.riassunto + '\n\n' + noteText
        : noteText,
    });
  };

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">🎲 <span>{t('sess.title')}</span></div>
        <button className="btn-p" onClick={() => setModal('new')}>{t('sess.new_btn')}</button>
      </div>

      {sessioni.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎲</div>
          <div className="empty-title">{t('sess.empty_title')}</div>
          <div className="empty-sub">{t('sess.empty_sub')}</div>
        </div>
      ) : (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {sessioni.map(s => (
            <SessioneCard
              key={s.id}
              sessione={s}
              onEdit={setModal}
              onDelete={handleDelete}
              onOpenElement={onOpenElement}
              onSavePrep={handleSavePrep}
              onUseAsBase={handleUseAsBase}
            />
          ))}
        </div>
      )}

      {modal && (
        <SessioneModal
          initialData={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          nextNumero={nextNumero}
        />
      )}
    </div>
  );
}
