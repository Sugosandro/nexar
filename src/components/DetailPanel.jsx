import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import { tagId, tagObj, sortTags, TAG_IMP_COLOR, TAG_IMP_LABEL } from '../hooks/useWorld';
import ElementModal, { REL_STATO_COLOR } from './ElementModal';
import EventDateInput from './EventDateInput';
import FazioneModal from './FazioneModal';
import MagiaModal from './MagiaModal';
import ArcModal from './ArcModal';

// ── IMAGE CAROUSEL ──
function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <img className="dp-img" src={images[idx]} alt="" style={{ display: 'block' }} />
      <button onClick={prev} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
      <button onClick={next} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
        {images.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#fff' : 'rgba(255,255,255,.4)', cursor: 'pointer' }} />
        ))}
      </div>
    </div>
  );
}

// ── CHANGELOG TAB ──
function ChangelogTab({ el, updateEl, elements, showToast }) {
  const { t } = useTranslation();
  const luoghi = elements.filter(e => e.cat === 'place');
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);

  const linkedEvents = elements
    .filter(e => e.cat === 'event' && (e.eventEls || []).includes(el.id))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const linkedIds = new Set(linkedEvents.map(e => e.id));

  const availableEvents = elements
    .filter(e => e.cat === 'event' && !linkedIds.has(e.id) &&
      (!query || e.name.toLowerCase().includes(query.toLowerCase()) || (e.date || '').includes(query)))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const handleLink = async (ev) => {
    await updateEl(ev.id, { eventEls: [...(ev.eventEls || []), el.id] });
    setQuery(''); setOpen(false);
    showToast(t('dp.cl_link_toast'));
  };

  const handleUnlink = async (ev) => {
    await updateEl(ev.id, { eventEls: (ev.eventEls || []).filter(id => id !== el.id) });
    showToast(t('dp.cl_unlink_toast'));
  };

  const handleDeleteCl = async (i) => {
    await updateEl(el.id, { changelog: (el.changelog || []).filter((_, idx) => idx !== i) });
    showToast(t('dp.cl_toast_deleted'));
  };

  const parseDMY = (d = '') => { const [dd, mm, yy] = d.split('/').map(Number); return (yy||0)*10000 + (mm||0)*100 + (dd||0); };
  const timeline = [
    ...linkedEvents.map(ev => ({ type: 'event', date: ev.date, name: ev.name, place: luoghi.find(l => l.id === ev.eventPlace), ev })),
    ...(el.changelog || []).map((c, i) => ({ type: 'cl', date: c.date, text: c.text, place: luoghi.find(l => l.id === c.placeId), idx: i })),
  ].sort((a, b) => parseDMY(a.date) - parseDMY(b.date));

  return (
    <div className="dp-sec">
      <div className="dp-lbl">{t('dp.cl_title')}</div>
      {timeline.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, padding: '8px 0' }}>
          {t('dp.cl_no_history')}
        </p>
      ) : (
        <div className="changelog">
          {timeline.map((item, i) => (
            <div key={i} className="cl-entry" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                {item.date && <span className="cl-date" style={{ margin: 0 }}>{item.date}</span>}
                {item.place && (
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'var(--place-dim)', color: 'var(--place)' }}>
                    📍 {item.place.name}
                  </span>
                )}
                {item.type === 'event' && (
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                    ⏳ {t('dp.cl_event_badge')}
                  </span>
                )}
                <button
                  onClick={() => item.type === 'event' ? handleUnlink(item.ev) : handleDeleteCl(item.idx)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, opacity: .5, padding: '0 2px' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = .5}>×</button>
              </div>
              <div className="cl-text">{item.type === 'event' ? item.name : item.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div className="dp-lbl" style={{ marginBottom: 8 }}>{t('dp.cl_link_lbl')}</div>
        <div style={{ position: 'relative' }}>
          <input className="fi" style={{ fontSize: 12, marginBottom: 0 }}
            placeholder={t('dp.cl_link_ph')} value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off" />
          {open && availableEvents.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 220, overflowY: 'auto' }}>
              {availableEvents.map(ev => (
                <div key={ev.id} onMouseDown={() => handleLink(ev)}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'baseline' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", flexShrink: 0, minWidth: 60 }}>{ev.date}</span>
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── POWERS TAB ──
function PowersTab({ el, updateEl, magie, elements, showToast }) {
  const { t } = useTranslation();
  const [newName,    setNewName]    = useState('');
  const [newDesc,    setNewDesc]    = useState('');
  const [newMagia,   setNewMagia]   = useState('');
  const [newInt,     setNewInt]     = useState('media');
  const [powerOpen,  setPowerOpen]  = useState(false);
  const [powerQuery, setPowerQuery] = useState('');

  const INTENSITA = [
    { value: 'bassa',    labelKey: 'dp.pw_int_bassa',    color: '#8fbd7c' },
    { value: 'media',    labelKey: 'dp.pw_int_media',    color: '#d4a84c' },
    { value: 'alta',     labelKey: 'dp.pw_int_alta',     color: '#d4956a' },
    { value: 'assoluta', labelKey: 'dp.pw_int_assoluta', color: '#c89fd4' },
  ];
  const intColor = (val) => INTENSITA.find(i => i.value === val)?.color || '#888';
  const intLabel = (val) => t(INTENSITA.find(i => i.value === val)?.labelKey || 'dp.pw_int_media');

  const allPowers = elements.flatMap(e =>
    (e.powers || []).map(p => ({ ...p, fromEl: e.name }))
  ).filter((p, i, arr) =>
    p.name && arr.findIndex(x => x.name.toLowerCase() === p.name.toLowerCase()) === i
  );
  const powerSuggestions = allPowers.filter(p =>
    !powerQuery || p.name.toLowerCase().includes(powerQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const newPower = { name: newName.trim(), desc: newDesc.trim(), magiaId: newMagia || null, intensita: newInt };
    await updateEl(el.id, { powers: [...(el.powers || []), newPower] });
    setNewName(''); setNewDesc(''); setNewMagia(''); setNewInt('media');
    showToast(t('dp.pw_toast_added'));
  };

  const handleDelete = async (i) => {
    await updateEl(el.id, { powers: (el.powers || []).filter((_, idx) => idx !== i) });
    showToast(t('dp.pw_toast_deleted'));
  };

  return (
    <div className="dp-sec">
      <div className="dp-lbl">{t('dp.pw_title')}</div>
      {(el.powers || []).length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, padding: '8px 0' }}>
          {t('dp.pw_empty')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {(el.powers || []).map((p, i) => {
            const magia = magie.find(m => m.id === p.magiaId);
            return (
              <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: intColor(p.intensita) + '22', color: intColor(p.intensita), border: `1px solid ${intColor(p.intensita)}44` }}>
                    {intLabel(p.intensita)}
                  </span>
                  <button onClick={() => handleDelete(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, opacity: .5, padding: '0 2px' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = .5}>×</button>
                </div>
                {p.desc && <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: magia ? 6 : 0 }}>{p.desc}</div>}
                {magia && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#1a3830', color: '#a0d0c0' }}>✨ {magia.name}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div className="dp-lbl" style={{ marginBottom: 8 }}>{t('dp.pw_add_lbl')}</div>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <input className="fi" style={{ fontSize: 13, marginBottom: 0 }}
            placeholder={t('dp.pw_name_ph')}
            value={newName}
            onChange={e => { setNewName(e.target.value); setPowerQuery(e.target.value); setPowerOpen(true); }}
            onFocus={() => setPowerOpen(true)}
            onBlur={() => setTimeout(() => setPowerOpen(false), 200)}
            autoComplete="off" />
          {powerOpen && powerSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 200, overflowY: 'auto' }}>
              <div style={{ padding: '5px 12px 4px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {t('dp.pw_existing')}
              </div>
              {powerSuggestions.map((p, i) => (
                <div key={i} onMouseDown={() => { setNewName(p.name); setNewDesc(p.desc || ''); setNewInt(p.intensita || 'media'); setNewMagia(p.magiaId || ''); setPowerOpen(false); setPowerQuery(''); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ flex: 1, color: 'var(--text)' }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('dp.pw_from', { name: p.fromEl })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <textarea className="ft" style={{ fontSize: 13, minHeight: 55, marginBottom: 6 }}
          placeholder={t('dp.pw_desc_ph')} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        <div className="dp-lbl" style={{ marginBottom: 5 }}>{t('dp.pw_int_lbl')}</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {INTENSITA.map(opt => (
            <button key={opt.value} type="button" onClick={() => setNewInt(opt.value)}
              style={{
                flex: 1, padding: '5px 2px', fontSize: 10,
                background: newInt === opt.value ? opt.color + '22' : 'var(--surface2)',
                border: `1px solid ${newInt === opt.value ? opt.color : 'var(--border)'}`,
                color: newInt === opt.value ? opt.color : 'var(--text-muted)',
                borderRadius: 'var(--r)', cursor: 'pointer', transition: 'all .2s',
                fontFamily: "'Crimson Pro', serif",
              }}>
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
        {magie.length > 0 && (
          <select className="fs" style={{ fontSize: 13, marginBottom: 8 }} value={newMagia} onChange={e => setNewMagia(e.target.value)}>
            <option value="">{t('dp.pw_no_magic')}</option>
            {magie.map(m => <option key={m.id} value={m.id}>✨ {m.name}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-p" style={{ fontSize: 12, padding: '5px 14px' }} onClick={handleAdd}>{t('dp.pw_add_btn')}</button>
        </div>
      </div>
    </div>
  );
}

// ── EQUIP TAB ──
const ACQ_TIPI  = ['trovato', 'creato', 'acquistato', 'ricevuto', 'equipaggiato', 'altro'];
const LOST_TIPI = ['perso', 'distrutto', 'rotto', 'lasciato', 'rubato', 'ceduto', 'altro'];

function EquipLogRow({ obj, logEntry, onSaveLog, onRemove, isPast }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [editAcq,  setEditAcq]  = useState(false);
  const [acqData,  setAcqData]  = useState(logEntry?.acquired?.data  || '');
  const [acqTipo,  setAcqTipo]  = useState(logEntry?.acquired?.tipo  || '');
  const [acqNota,  setAcqNota]  = useState(logEntry?.acquired?.nota  || '');

  const [editLost, setEditLost] = useState(false);
  const [lostData, setLostData] = useState(logEntry?.lost?.data || '');
  const [lostTipo, setLostTipo] = useState(logEntry?.lost?.tipo || '');
  const [lostNota, setLostNota] = useState(logEntry?.lost?.nota || '');

  const saveAcq = () => {
    onSaveLog({ ...logEntry, equipId: obj.id, acquired: { data: acqData.trim(), tipo: acqTipo, nota: acqNota.trim() } });
    setEditAcq(false);
  };
  const saveLost = () => {
    onSaveLog({ ...logEntry, equipId: obj.id, lost: { data: lostData.trim(), tipo: lostTipo, nota: lostNota.trim() } });
    setEditLost(false);
    if (!isPast) onRemove(obj.id);
  };

  const acqColor = '#6ab675'; const lostColor = '#e07070';

  return (
    <div style={{ background: 'var(--surface2)', border: `1px solid ${isPast ? '#88888844' : 'var(--border)'}`, borderRadius: 'var(--r)', overflow: 'hidden', opacity: isPast ? .75 : 1 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
        <span style={{ fontSize: 16 }}>📦</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: "'Playfair Display', serif" }}>{obj.name}</div>
          {obj.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{obj.desc.length > 60 ? obj.desc.slice(0, 60) + '…' : obj.desc}</div>}
          {/* Mini log summary when closed */}
          {!open && (logEntry?.acquired || logEntry?.lost) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {logEntry.acquired && (
                <span style={{ fontSize: 10, color: acqColor }}>
                  {logEntry.acquired.tipo ? t('dp.eq_tipo_' + logEntry.acquired.tipo) : '↑'}
                  {logEntry.acquired.data ? ` · ${logEntry.acquired.data}` : ''}
                </span>
              )}
              {logEntry.lost && (
                <span style={{ fontSize: 10, color: lostColor }}>
                  {logEntry.lost.tipo ? t('dp.eq_tipo_' + logEntry.lost.tipo) : '↓'}
                  {logEntry.lost.data ? ` · ${logEntry.lost.data}` : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, opacity: .6, padding: '2px 4px', flexShrink: 0 }}
          title={t('dp.eq_log_lbl')}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = .6}>
          {open ? '▾' : '▸'} {t('dp.eq_log_lbl')}
        </button>
        {!isPast && (
          <button onClick={() => onRemove(obj.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, opacity: .4, flexShrink: 0 }}
            title={t('dp.eq_remove_nolog')}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = .4}>×</button>
        )}
      </div>

      {/* Expanded log section */}
      {open && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid var(--border)' }}>

          {/* Acquisition */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: acqColor, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t('dp.eq_log_acquired')}</span>
              {!editAcq && <button onClick={() => setEditAcq(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', opacity: .6 }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=.6}>✎</button>}
            </div>
            {logEntry?.acquired && !editAcq && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface3)', borderRadius: 4, padding: '5px 8px' }}>
                {logEntry.acquired.tipo && <span style={{ color: acqColor, marginRight: 6 }}>{t('dp.eq_tipo_' + logEntry.acquired.tipo)}</span>}
                {logEntry.acquired.data && <span style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", marginRight: 6 }}>{logEntry.acquired.data}</span>}
                {logEntry.acquired.nota && <span style={{ color: 'var(--text-muted)' }}>{logEntry.acquired.nota}</span>}
              </div>
            )}
            {(!logEntry?.acquired || editAcq) && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <select value={acqTipo} onChange={e => setAcqTipo(e.target.value)}
                  style={{ flex: '0 0 120px', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 6px', outline: 'none' }}>
                  <option value="">{t('dp.eq_log_tipo_ph')}</option>
                  {ACQ_TIPI.map(v => <option key={v} value={v}>{t('dp.eq_tipo_' + v)}</option>)}
                </select>
                <EventDateInput value={acqData} onChange={setAcqData} placeholder={t('dp.eq_log_data_ph')} inputStyle={{ fontSize: 12, padding: '4px 6px' }} />
                <input type="text" placeholder={t('dp.eq_log_nota_ph')} value={acqNota} onChange={e => setAcqNota(e.target.value)}
                  style={{ flex: '2 1 110px', minWidth: 0, boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 6px', outline: 'none' }} />
                <button onClick={saveAcq}
                  style={{ padding: '4px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: acqColor, cursor: 'pointer', fontSize: 12, fontFamily: "'Crimson Pro', serif", flexShrink: 0 }}>
                  {t('dp.eq_log_save')}
                </button>
              </div>
            )}
          </div>

          {/* Loss */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: lostColor, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t('dp.eq_log_lost')}</span>
              {!editLost && !logEntry?.lost && !isPast && <button onClick={() => setEditLost(true)} style={{ background: 'none', border: 'none', color: lostColor, fontSize: 11, cursor: 'pointer', opacity: .7 }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=.7}>{t('dp.eq_log_lost_btn')}</button>}
            </div>
            {logEntry?.lost && !editLost && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface3)', borderRadius: 4, padding: '5px 8px' }}>
                {logEntry.lost.tipo && <span style={{ color: lostColor, marginRight: 6 }}>{t('dp.eq_tipo_' + logEntry.lost.tipo)}</span>}
                {logEntry.lost.data && <span style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", marginRight: 6 }}>{logEntry.lost.data}</span>}
                {logEntry.lost.nota && <span style={{ color: 'var(--text-muted)' }}>{logEntry.lost.nota}</span>}
              </div>
            )}
            {editLost && (
              <div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                  <select value={lostTipo} onChange={e => setLostTipo(e.target.value)}
                    style={{ flex: '0 0 120px', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 6px', outline: 'none' }}>
                    <option value="">{t('dp.eq_log_tipo_ph')}</option>
                    {LOST_TIPI.map(v => <option key={v} value={v}>{t('dp.eq_tipo_' + v)}</option>)}
                  </select>
                  <EventDateInput value={lostData} onChange={setLostData} placeholder={t('dp.eq_log_data_ph')} inputStyle={{ fontSize: 12, padding: '4px 6px' }} />
                  <input type="text" placeholder={t('dp.eq_log_nota_ph')} value={lostNota} onChange={e => setLostNota(e.target.value)}
                    style={{ flex: '2 1 110px', minWidth: 0, boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 6px', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditLost(false)} style={{ padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  <button onClick={saveLost}
                    style={{ padding: '4px 12px', background: '#3a1515', border: '1px solid #e0707066', borderRadius: 'var(--r)', color: lostColor, cursor: 'pointer', fontSize: 12, fontFamily: "'Crimson Pro', serif" }}>
                    {isPast ? t('dp.eq_log_save') : t('dp.eq_log_lost_save')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const COINS = [
  { key: 'pp', label: 'PP', color: '#b0c4de' },
  { key: 'gp', label: 'GP', color: '#ffd700' },
  { key: 'sp', label: 'SP', color: '#c0c0c0' },
  { key: 'cp', label: 'CP', color: '#c8844a' },
];

function EquipTab({ el, updateEl, addEl, elements, showToast }) {
  const { t } = useTranslation();
  const [query,        setQuery]        = useState('');
  const [open,         setOpen]         = useState(false);
  const [newEquipOpen, setNewEquipOpen] = useState(false);
  const [localCoins,   setLocalCoins]   = useState(() => el.coins || {});

  useEffect(() => { setLocalCoins(el.coins || {}); }, [el.id]);

  const oggetti   = elements.filter(e => e.cat === 'object');
  const equipped  = (el.equip || []).map(id => oggetti.find(o => o.id === id)).filter(Boolean);
  const available = oggetti.filter(o =>
    !(el.equip || []).includes(o.id) &&
    (!query || o.name.toLowerCase().includes(query.toLowerCase()))
  );

  const getLog = (objId) => (el.equipLog || []).find(e => e.equipId === objId) || null;

  const saveLog = async (entry) => {
    const prev = (el.equipLog || []).filter(e => e.equipId !== entry.equipId);
    await updateEl(el.id, { equipLog: [...prev, entry] });
    showToast(t('dp.eq_log_toast'));
  };

  const handleAdd = async (objId) => {
    await updateEl(el.id, { equip: [...(el.equip || []), objId], tags: [...(el.tags || []).filter(t => tagId(t) !== objId), { id: objId, rel: 'Equipaggiamento', importance: 'bassa' }] });
    const obj = oggetti.find(o => o.id === objId);
    if (obj && !(obj.tags || []).includes(el.id)) {
      await updateEl(objId, { tags: [...(obj.tags || []), el.id] });
    }
    setQuery(''); setOpen(false);
    showToast(t('dp.eq_toast_added'));
  };

  const handleRemove = async (objId) => {
    await updateEl(el.id, { equip: (el.equip || []).filter(id => id !== objId) });
    showToast(t('dp.eq_toast_removed'));
  };

  const adjustCoin = (key, delta) => {
    setLocalCoins(prev => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) };
      updateEl(el.id, { coins: next });
      return next;
    });
  };

  const handleCoinInput = (key, val) => {
    setLocalCoins(prev => ({ ...prev, [key]: Math.max(0, parseInt(val) || 0) }));
  };

  const handleCoinBlur = (key) => {
    updateEl(el.id, { coins: { ...(el.coins || {}), [key]: localCoins[key] || 0 } });
  };

  // Items that have a "lost" log entry but are no longer in equip
  const pastEquip = (el.equipLog || [])
    .filter(e => e.lost && !(el.equip || []).includes(e.equipId))
    .map(e => ({ obj: oggetti.find(o => o.id === e.equipId), entry: e }))
    .filter(x => x.obj);

  return (
    <div className="dp-sec">
      <div className="dp-lbl">{t('dp.eq_title')}</div>
      {equipped.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, padding: '8px 0' }}>
          {t('dp.eq_empty')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {equipped.map(obj => (
            <EquipLogRow key={obj.id} obj={obj} logEntry={getLog(obj.id)}
              onSaveLog={saveLog} onRemove={handleRemove} isPast={false} />
          ))}
        </div>
      )}

      {/* Past equipment */}
      {pastEquip.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            {t('dp.eq_past_title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pastEquip.map(({ obj, entry }) => (
              <EquipLogRow key={obj.id} obj={obj} logEntry={entry}
                onSaveLog={saveLog} onRemove={handleRemove} isPast={true} />
            ))}
          </div>
        </div>
      )}

      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="dp-lbl" style={{ marginBottom: 0 }}>{t('dp.eq_add_lbl')}</div>
          <button onClick={() => setNewEquipOpen(true)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--gold)', fontSize: 11, padding: '3px 9px', cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
            + {t('dp.eq_new_obj_btn')}
          </button>
        </div>
        {newEquipOpen && (
          <ElementModal
            defaultCat="object"
            onSave={async (data) => {
              const newId = await addEl(data);
              if (newId) await handleAdd(newId);
              setNewEquipOpen(false);
              showToast(t('dp.eq_new_obj_toast'));
            }}
            onClose={() => setNewEquipOpen(false)}
          />
        )}
        <div style={{ position: 'relative' }}>
          <input className="fi" style={{ fontSize: 13, marginBottom: 0 }}
            placeholder={t('dp.eq_search_ph')} value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off" />
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 240, overflowY: 'auto' }}>
              {oggetti.length === 0
                ? <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('dp.eq_no_objects')}</div>
                : available.length === 0
                ? <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>{t('dp.eq_all_equipped')}</div>
                : available.map(obj => (
                  <div key={obj.id} onMouseDown={() => handleAdd(obj.id)}
                    style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <span style={{ fontSize: 15 }}>📦</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text)' }}>{obj.name}</div>
                      {obj.desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{obj.desc.length > 55 ? obj.desc.slice(0, 55) + '…' : obj.desc}</div>}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Coin tracker */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div className="dp-lbl" style={{ marginBottom: 10 }}>{t('dp.eq_coins_title')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {COINS.map(({ key, label, color }) => {
            const val = localCoins[key] || 0;
            return (
              <div key={key} style={{ flex: 1, background: 'var(--surface2)', border: `1px solid ${color}44`, borderRadius: 'var(--r)', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: '.04em' }}>{label}</span>
                <input
                  type="number" min="0" value={val}
                  onChange={e => handleCoinInput(key, e.target.value)}
                  onBlur={() => handleCoinBlur(key)}
                  style={{ width: '100%', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: "'Playfair Display', serif", fontSize: 16, padding: '2px 0', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => adjustCoin(key, -1)} disabled={val === 0}
                    style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface)', color: val === 0 ? 'var(--text-muted)' : 'var(--text)', cursor: val === 0 ? 'default' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <button onClick={() => adjustCoin(key, 1)}
                    style={{ width: 24, height: 24, border: `1px solid ${color}66`, borderRadius: 4, background: color + '18', color, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──
export default function DetailPanel({ panel, onClose, onOpen, showToast }) {
  const { t } = useTranslation();
  const {
    elById, elColor, elIcon, elLabel,
    arcsByMember, fazioniOfEl, magieOfEl, backlinks,
    updateEl, deleteEl, addEl,
    arcs, updateArc, deleteArc,
    fazioni, updateFazione, deleteFazione,
    magie, updateMagia, deleteMagia,
    elements, uid, wid,
    sessioni
  } = useWorld();

  const [activeTab,    setActiveTab]    = useState('info');
  const [editing,      setEditing]      = useState(false);
  const [expandedTag,  setExpandedTag]  = useState(null);
  const [editingFaz,   setEditingFaz]   = useState(false);
  const [editingMagia, setEditingMagia] = useState(false);
  const [editingArc,   setEditingArc]   = useState(false);

  if (!panel) return <div className="dp hidden" />;

  const { type, id } = panel;

  // ── ELEMENTO ──
  if (type === 'element') {
    const el = elById(id);
    if (!el) return <div className="dp hidden" />;

    const color  = elColor(el);
    const elArcs = arcsByMember(el.id);
    const elFaz  = fazioniOfEl(el.id);
    const elMag  = magieOfEl(el.id);
    const links  = backlinks(el.id);

    const TABS = [
      { id: 'info',      labelKey: 'dp.tab_info' },
      { id: 'powers',    labelKey: 'dp.tab_powers' },
      { id: 'equip',     labelKey: 'dp.tab_equip' },
      { id: 'changelog', labelKey: 'dp.tab_changelog' },
      { id: 'notes',     labelKey: 'dp.tab_notes' },
    ];

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color }}>{elIcon(el)} {elLabel(el)}</div>
              <div className="dp-name">{el.name}</div>
              {el.extra?.ruolo && <div className="dp-sub">{el.extra.ruolo}</div>}
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditing(true)}>{t('dp.edit_btn')}</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(t('dp.confirm_delete', { name: el.name }))) return;
                await deleteEl(el.id); onClose(); showToast(t('dp.el_toast_deleted'));
              }}>{t('dp.delete_btn')}</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>

        <div className="dp-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`dp-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="dp-body" style={activeTab === 'notes' ? { display: 'flex', flexDirection: 'column' } : undefined}>
          {activeTab === 'info' && (
            <>
              {(() => {
                const imgs = el.images?.length ? el.images : (el.image ? [el.image] : []);
                if (!imgs.length) return null;
                if (imgs.length === 1) return <img className="dp-img" src={imgs[0]} alt="" />;
                return <ImageCarousel images={imgs} />;
              })()}
              <div className="dp-sec">
                <div className="dp-lbl">{t('dp.desc_lbl')}</div>
                <div className="dp-txt">{el.desc || <em style={{ opacity: .4 }}>—</em>}</div>
              </div>
              {Object.entries(el.extra || {}).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="dp-sec">
                  <div className="dp-lbl">{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                  <div className="dp-txt" style={{ fontSize: 13 }}>{v}</div>
                </div>
              ))}
              {elArcs.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">{t('dp.arcs_lbl')}</div>
                  <div className="dp-tags">
                    {elArcs.map(a => (
                      <span key={a.id} className="tag" style={{ background: 'var(--arc-dim)', color: 'var(--arc)', cursor: 'pointer' }}
                        onClick={() => onOpen('arc', a.id)}>📖 {a.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {elFaz.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">{t('dp.faz_lbl')}</div>
                  <div className="dp-tags">
                    {elFaz.map(f => (
                      <span key={f.id} className="tag" style={{ background: '#4a3810', color: '#f0c060', cursor: 'pointer' }}
                        onClick={() => onOpen('fazione', f.id)}>⚔ {f.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {elMag.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">{t('dp.mag_lbl')}</div>
                  <div className="dp-tags">
                    {elMag.map(m => (
                      <span key={m.id} className="tag" style={{ background: '#1a3830', color: '#a0d0c0', cursor: 'pointer' }}
                        onClick={() => onOpen('magia', m.id)}>✨ {m.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {(el.tags || []).length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">{t('dp.tags_lbl')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sortTags(el.tags).map(tagEntry => {
                      const tid    = tagId(tagEntry);
                      const to     = tagObj(tagEntry);
                      const tagged = elements.find(e => e.id === tid);
                      if (!tagged) return null;
                      const tcolor = elColor(tagged);
                      const impCol = TAG_IMP_COLOR[to.importance] || '#888';
                      const isExp  = expandedTag === tid;
                      return (
                        <div key={tid}>
                          <div onClick={() => setExpandedTag(isExp ? null : tid)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 'var(--r)', background: isExp ? 'var(--surface2)' : 'var(--surface3)', border: `1px solid ${isExp ? tcolor + '66' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .15s' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tcolor, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{tagged.name}</span>
                            {to.rel && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{to.rel}</span>}
                            <span style={{ fontSize: 11, color: impCol, flexShrink: 0 }}>{TAG_IMP_LABEL[to.importance]}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform .15s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▼</span>
                          </div>
                          {isExp && (() => {
                            // Merge storia from both sides of the tag (bidirectionality)
                            const reverseTo = tagObj((tagged.tags || []).find(t => tagId(t) === el.id));
                            const seenTs = new Set();
                            const storia = [...(to.storia || []), ...(reverseTo.storia || [])]
                              .filter(s => { const k = s.ts ?? s.nota ?? Math.random(); if (seenTs.has(k)) return false; seenTs.add(k); return true; })
                              .sort((a, b) => (a.ts || 0) - (b.ts || 0));
                            return (
                              <div style={{ margin: '2px 0 0', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', borderTop: `2px solid ${tcolor}44` }}>
                                {tagged.desc
                                  ? <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 6 }}>{tagged.desc.length > 200 ? tagged.desc.slice(0, 200) + '…' : tagged.desc}</div>
                                  : <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 6 }}>{t('dp.no_desc')}</div>
                                }
                                {storia.length > 0 && (
                                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginBottom: 6 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{t('rel.storia_lbl')}</div>
                                    {storia.map((s, si) => {
                                      const sess = sessioni.find(ss => ss.id === s.sessione);
                                      return (
                                        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 3, flexWrap: 'wrap' }}>
                                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: REL_STATO_COLOR[s.stato] || '#888', flexShrink: 0 }} />
                                          <span style={{ color: REL_STATO_COLOR[s.stato] || '#888', fontSize: 11, flexShrink: 0 }}>{t('rel.stato_' + s.stato)}</span>
                                          {s.data && <span style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontSize: 11, flexShrink: 0 }}>{s.data}</span>}
                                          {sess && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>S{sess.numero}</span>}
                                          {s.nota && <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nota}</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <button className="btn-g" style={{ fontSize: 10, padding: '3px 9px' }}
                                  onClick={e => { e.stopPropagation(); onOpen('element', tagged.id); }}>
                                  {t('dp.open_card')}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {links.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">{t('dp.cited_in')}</div>
                  <div className="bl-list">
                    {links.map(e => (
                      <div key={e.id} className="bl-item" onClick={() => onOpen('element', e.id)}>
                        <span className="bl-dot" style={{ background: elColor(e) }} />
                        <span className="bl-name">{e.name}</span>
                        <span className="bl-type">{elLabel(e)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'powers' && (
            <PowersTab el={el} updateEl={updateEl} magie={magie} elements={elements} showToast={showToast} />
          )}
          {activeTab === 'equip' && (
            <EquipTab el={el} updateEl={updateEl} addEl={addEl} elements={elements} showToast={showToast} />
          )}
          {activeTab === 'changelog' && (
            <ChangelogTab el={el} updateEl={updateEl} elements={elements} showToast={showToast} />
          )}
          {activeTab === 'notes' && (
            <>
              <textarea className="notes-area" style={{ flex: 1 }} defaultValue={el.notes || ''} placeholder={t('dp.notes_ph')}
                onBlur={async e => { await updateEl(el.id, { notes: e.target.value }); showToast(t('dp.notes_toast')); }} />
              <div className="notes-hint">{t('dp.notes_hint')}</div>
            </>
          )}
        </div>

        {editing && (
          <ElementModal initialData={el}
            onSave={async (data, birthDate, newTags = []) => {
              await updateEl(el.id, data);
              if (newTags.length && uid && wid) {
                const { addBidirectionAltag } = await import('../firebase/db');
                for (const tid of newTags) {
                  await addBidirectionAltag(uid, wid, el.id, tid);
                }
              }
              if (birthDate) {
                await addEl({
                  cat: 'event', name: t('dp.el_birth_name', { name: data.name }),
                  desc: t('dp.el_birth_desc', { name: data.name }),
                  date: birthDate, tags: [el.id], status: 'done',
                  extra: {}, powers: [], equip: [], changelog: [], notes: '',
                });
              }
              setEditing(false);
              showToast(t('dp.el_toast_saved'));
            }}
            onClose={() => setEditing(false)} />
        )}
      </div>
    );
  }

  // ── FAZIONE ──
  if (type === 'fazione') {
    const faz = fazioni.find(f => f.id === id);
    if (!faz) return <div className="dp hidden" />;
    const REL_LABELS = { ally: t('dp.rel_ally'), enemy: t('dp.rel_enemy'), neutral: t('dp.rel_neutral') };
    const REL_COLORS = { ally: '#1a3020', enemy: '#3a1515', neutral: '#2a2810' };

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color: '#f0c060' }}>{t('dp.faz_type')}</div>
              <div className="dp-name">{faz.name}</div>
              {faz.motto && <div className="dp-sub">"{faz.motto}"</div>}
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditingFaz(true)}>{t('dp.edit_btn')}</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(t('dp.confirm_delete', { name: faz.name }))) return;
                await deleteFazione(faz.id); onClose(); showToast(t('dp.faz_toast_deleted'));
              }}>{t('dp.delete_btn')}</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-body" style={{ display: 'flex', flexDirection: 'column' }}>
          {faz.desc && <div className="dp-sec"><div className="dp-lbl">{t('dp.desc_lbl')}</div><div className="dp-txt">{faz.desc}</div></div>}
          <div className="dp-sec">
            <div className="dp-lbl">{t('dp.faz_members')}</div>
            <div className="dp-tags">
              {(faz.members || []).map(mid => {
                const el = elements.find(e => e.id === mid);
                return el ? <span key={mid} className="tag" style={{ background: 'var(--char-dim)', color: 'var(--char)', cursor: 'pointer' }}
                  onClick={() => onOpen('element', el.id)}>👤 {el.name}</span> : null;
              })}
              {(!faz.members?.length) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>{t('dp.faz_no_members')}</span>}
            </div>
          </div>
          {(faz.rels || []).length > 0 && (
            <div className="dp-sec">
              <div className="dp-lbl">{t('dp.faz_rels')}</div>
              {faz.rels.map((r, i) => {
                const other = fazioni.find(f => f.id === r.fazId);
                return other ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: REL_COLORS[r.type] || 'var(--surface3)', color: 'var(--text)' }}>
                      {REL_LABELS[r.type] || r.type}
                    </span>
                    <span style={{ cursor: 'pointer', color: 'var(--text)' }} onClick={() => onOpen('fazione', other.id)}>{other.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
          <div className="dp-sec" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="dp-lbl">{t('dp.notes_lbl')}</div>
            <textarea className="notes-area" style={{ flex: 1 }} defaultValue={faz.notes || ''} placeholder={t('dp.faz_notes_ph')}
              onBlur={async e => { await updateFazione(faz.id, { notes: e.target.value }); showToast(t('dp.notes_toast')); }} />
          </div>
        </div>
        {editingFaz && (
          <FazioneModal initialData={faz}
            onSave={async (data) => { await updateFazione(faz.id, data); setEditingFaz(false); showToast(t('dp.faz_toast_saved')); }}
            onClose={() => setEditingFaz(false)} />
        )}
      </div>
    );
  }

  // ── MAGIA ──
  if (type === 'magia') {
    const mag = magie.find(m => m.id === id);
    if (!mag) return <div className="dp hidden" />;
    const INTENSITA_COLOR = { bassa: '#8fbd7c', media: '#d4a84c', alta: '#d4956a', assoluta: '#c89fd4' };

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color: '#a0d0c0' }}>{t('dp.mag_type')}</div>
              <div className="dp-name">{mag.name}</div>
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditingMagia(true)}>{t('dp.edit_btn')}</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(t('dp.confirm_delete', { name: mag.name }))) return;
                await deleteMagia(mag.id); onClose(); showToast(t('dp.mag_toast_deleted'));
              }}>{t('dp.delete_btn')}</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-body" style={{ display: 'flex', flexDirection: 'column' }}>
          {mag.desc && <div className="dp-sec"><div className="dp-lbl">{t('dp.desc_lbl')}</div><div className="dp-txt">{mag.desc}</div></div>}
          {(mag.rules || []).length > 0 && (
            <div className="dp-sec">
              <div className="dp-lbl">{t('dp.mag_rules')}</div>
              {mag.rules.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-dim)' }}>
                  <span style={{ color: '#a0d0c0', flexShrink: 0 }}>▸</span>{r}
                </div>
              ))}
            </div>
          )}
          <div className="dp-sec">
            <div className="dp-lbl">{t('dp.mag_users')}</div>
            <div className="dp-tags">
              {(mag.users || []).map(uid => {
                const el = elements.find(e => e.id === uid);
                return el ? <span key={uid} className="tag" style={{ background: 'var(--surface3)', color: 'var(--text-dim)', cursor: 'pointer' }}
                  onClick={() => onOpen('element', el.id)}>{el.name}</span> : null;
              })}
              {(!mag.users?.length) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>{t('dp.mag_no_users')}</span>}
            </div>
          </div>
          {(() => {
            const linkedPowers = elements.flatMap(e =>
              (e.powers || []).filter(p => p.magiaId === mag.id).map(p => ({ ...p, owner: e }))
            );
            if (!linkedPowers.length) return null;
            const grouped = {};
            linkedPowers.forEach(p => {
              const key = p.name?.toLowerCase() || '?';
              if (!grouped[key]) grouped[key] = { name: p.name, desc: p.desc, users: [] };
              grouped[key].users.push({ owner: p.owner, intensita: p.intensita });
            });
            return (
              <div className="dp-sec">
                <div className="dp-lbl">{t('dp.mag_powers')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.values(grouped).map((g, i) => (
                    <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px' }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{g.name}</div>
                      {g.desc && <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 6 }}>{g.desc}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {g.users.map((u, j) => {
                          const col = INTENSITA_COLOR[u.intensita] || '#888';
                          return (
                            <span key={j} onClick={() => onOpen('element', u.owner.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: col + '18', border: `1px solid ${col}44`, color: 'var(--text-dim)', cursor: 'pointer' }}>
                              <span style={{ fontSize: 10, color: col }}>{u.intensita}</span>
                              <span>{u.owner.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="dp-sec" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="dp-lbl">{t('dp.notes_lbl')}</div>
            <textarea className="notes-area" style={{ flex: 1 }} defaultValue={mag.notes || ''} placeholder={t('dp.mag_notes_ph')}
              onBlur={async e => { await updateMagia(mag.id, { notes: e.target.value }); showToast(t('dp.notes_toast')); }} />
          </div>
        </div>
        {editingMagia && (
          <MagiaModal initialData={mag}
            onSave={async (data) => { await updateMagia(mag.id, data); setEditingMagia(false); showToast(t('dp.mag_toast_saved')); }}
            onClose={() => setEditingMagia(false)} />
        )}
      </div>
    );
  }

  // ── ARCO ──
  if (type === 'arc') {
    const arc = arcs.find(a => a.id === id);
    if (!arc) return <div className="dp hidden" />;

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color: 'var(--arc)' }}>{t('dp.arc_type')}</div>
              <div className="dp-name">{arc.name}</div>
              {arc.currentPhase && <div className="dp-sub">{t('dp.arc_phase', { phase: arc.currentPhase })}</div>}
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditingArc(true)}>{t('dp.edit_btn')}</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(t('dp.confirm_delete', { name: arc.name }))) return;
                await deleteArc(arc.id); onClose(); showToast(t('dp.arc_toast_deleted'));
              }}>{t('dp.delete_btn')}</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-body" style={{ display: 'flex', flexDirection: 'column' }}>
          {arc.desc && <div className="dp-sec"><div className="dp-lbl">{t('dp.desc_lbl')}</div><div className="dp-txt">{arc.desc}</div></div>}
          {(arc.phases || []).length > 0 && (
            <div className="dp-sec">
              <div className="dp-lbl">{t('dp.arc_phases')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {arc.phases.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: p === arc.currentPhase ? 'var(--arc)' : 'var(--surface3)', border: `1px solid ${p === arc.currentPhase ? 'var(--arc)' : 'var(--border)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: p === arc.currentPhase ? 'var(--bg)' : 'var(--text-muted)' }}>{i + 1}</span>
                    <span style={{ color: p === arc.currentPhase ? 'var(--text)' : 'var(--text-dim)', fontWeight: p === arc.currentPhase ? 600 : 400 }}>{p}</span>
                    {p === arc.currentPhase && <span style={{ fontSize: 10, color: 'var(--arc)', marginLeft: 'auto' }}>{t('dp.arc_current')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="dp-sec">
            <div className="dp-lbl">{t('dp.arc_members')}</div>
            <div className="dp-tags">
              {(arc.members || []).map(mid => {
                const el = elements.find(e => e.id === mid);
                return el ? <span key={mid} className="tag" style={{ background: 'var(--arc-dim)', color: 'var(--arc)', cursor: 'pointer' }}
                  onClick={() => onOpen('element', el.id)}>{el.name}</span> : null;
              })}
              {(!arc.members?.length) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>{t('dp.arc_no_members')}</span>}
            </div>
          </div>
          <div className="dp-sec" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="dp-lbl">{t('dp.notes_lbl')}</div>
            <textarea className="notes-area" style={{ flex: 1 }} defaultValue={arc.notes || ''} placeholder={t('dp.arc_notes_ph')}
              onBlur={async e => { await updateArc(arc.id, { notes: e.target.value }); showToast(t('dp.notes_toast')); }} />
          </div>
        </div>
        {editingArc && (
          <ArcModal initialData={arc}
            onSave={async (data) => { await updateArc(arc.id, data); setEditingArc(false); showToast(t('dp.arc_toast_saved')); }}
            onClose={() => setEditingArc(false)} />
        )}
      </div>
    );
  }

  return <div className="dp hidden" />;
}
