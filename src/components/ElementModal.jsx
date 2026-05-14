import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import { tagId, tagObj, TAG_IMPORTANCE, TAG_IMP_COLOR, TAG_IMP_LABEL } from '../hooks/useWorld';
import ElementPicker from './ElementPicker';
import EventDateInput from './EventDateInput';

const STATI_BY_CAT = {
  char:   ['alleato', 'nemico', 'neutrale', 'sconosciuto', 'deceduto'],
  object: ['posseduto', 'perso', 'rubato', 'distrutto'],
};
const FALLBACK_STATI = ['alleato', 'nemico', 'neutrale', 'sconosciuto'];

export const REL_STATO_COLOR = {
  alleato: '#6ab675', nemico: '#e07070', neutrale: '#8ec8e4', sconosciuto: '#666',
  deceduto: '#555', posseduto: '#6ab675', perso: '#888', rubato: '#d4956a', distrutto: '#e07070',
};

function TagEditor({ tagEntry, element, catColor, onUpdateField, onDone, sessioni }) {
  const { t } = useTranslation();
  const to       = tagEntry ? (typeof tagEntry === 'string' ? { id: tagEntry, rel: '', importance: 'Media' } : tagEntry) : {};
  const statiList = STATI_BY_CAT[element.cat] || FALLBACK_STATI;

  const [newStato,    setNewStato]    = useState('');
  const [newSessione, setNewSessione] = useState('');
  const [newData,     setNewData]     = useState('');
  const [newNota,     setNewNota]     = useState('');

  const addEntry = () => {
    if (!newStato) return;
    const entry = { stato: newStato, sessione: newSessione || null, data: newData.trim() || null, nota: newNota.trim(), ts: Date.now() };
    onUpdateField('storia', [...(to.storia || []), entry]);
    setNewStato(''); setNewSessione(''); setNewData(''); setNewNota('');
  };

  const removeEntry = (idx) => {
    onUpdateField('storia', (to.storia || []).filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--surface2)', border: `1px solid ${catColor}44`, borderRadius: 'var(--r)' }}>
      <div style={{ fontSize: 11, color: catColor, marginBottom: 8, fontWeight: 600 }}>
        {t('element.tag_rel_label', { name: element.name })}
      </div>

      {/* Rel + importance */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <input type="text" placeholder={t('element.tag_rel_ph')}
          value={to.rel || ''}
          onChange={e => onUpdateField('rel', e.target.value)}
          style={{ flex: 1, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, padding: '5px 10px', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {TAG_IMPORTANCE.map(imp => (
            <button key={imp} type="button" onClick={() => onUpdateField('importance', imp)}
              title={t('element.tag_imp.' + imp.toLowerCase())}
              style={{ padding: '4px 8px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                background: (to.importance || 'Media') === imp ? TAG_IMP_COLOR[imp] + '33' : 'var(--surface)',
                border: `1px solid ${(to.importance || 'Media') === imp ? TAG_IMP_COLOR[imp] : 'var(--border)'}`,
                color: (to.importance || 'Media') === imp ? TAG_IMP_COLOR[imp] : 'var(--text-muted)' }}>
              {TAG_IMP_LABEL[imp]}
            </button>
          ))}
        </div>
        <button type="button" onClick={onDone}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>✓</button>
      </div>

      {/* Storia */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          {t('rel.storia_lbl')}
        </div>

        {(to.storia || []).length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(to.storia || []).map((s, i) => {
              const sess = sessioni.find(ss => ss.id === s.sessione);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: REL_STATO_COLOR[s.stato] || '#888', flexShrink: 0 }} />
                  <span style={{ color: REL_STATO_COLOR[s.stato] || '#888', fontSize: 11, flexShrink: 0 }}>{t('rel.stato_' + s.stato)}</span>
                  {s.data && <span style={{ fontSize: 10, color: 'var(--gold)', flexShrink: 0, fontFamily: "'Playfair Display', serif" }}>{s.data}</span>}
                  {sess && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>S{sess.numero}</span>}
                  {s.nota && <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nota}</span>}
                  <button onClick={() => removeEntry(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, opacity: .5, padding: 0, marginLeft: 'auto', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = .5}>×</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add entry form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <select value={newStato} onChange={e => setNewStato(e.target.value)}
              style={{ flex: '0 0 110px', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: newStato ? 'var(--text)' : 'var(--text-muted)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 8px', outline: 'none' }}>
              <option value="">{t('rel.stato_lbl')}</option>
              {statiList.map(s => <option key={s} value={s}>{t('rel.stato_' + s)}</option>)}
            </select>
            <EventDateInput value={newData} onChange={setNewData} />
            <select value={newSessione} onChange={e => setNewSessione(e.target.value)}
              style={{ flex: '1 1 90px', minWidth: 0, boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 8px', outline: 'none' }}>
              <option value="">{t('rel.no_session')}</option>
              {sessioni.map(s => <option key={s.id} value={s.id}>S{s.numero} — {s.titolo}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <input type="text" placeholder={t('rel.nota_ph')}
              value={newNota}
              onChange={e => setNewNota(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry(); } }}
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '4px 8px', outline: 'none' }} />
            <button type="button" onClick={addEntry} disabled={!newStato}
              style={{ flexShrink: 0, padding: '4px 10px', background: newStato ? 'var(--gold-glow)' : 'var(--surface2)', border: `1px solid ${newStato ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', color: newStato ? 'var(--gold)' : 'var(--text-muted)', cursor: newStato ? 'pointer' : 'default', fontSize: 12, fontFamily: "'Crimson Pro', serif" }}>
              {t('rel.add_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const EXTRA_FIELDS = {
  char:   [{ key: 'ruolo', isDate: false }, { key: 'nascita', isDate: true }],
  place:  [{ key: 'regione', isDate: false }],
  object: [{ key: 'materiale', isDate: false }],
  event:  [],
};

const IMP_OPTS = [
  { value: 'principale', stars: '⭐⭐⭐' },
  { value: 'primario',   stars: '⭐⭐' },
  { value: 'secondario', stars: '⭐' },
  { value: 'minore',     stars: '·' },
];

export default function ElementModal({ defaultCat = 'char', initialData = null, onSave, onClose }) {
  const { t } = useTranslation();
  const { allCats, elements, sessioni } = useWorld();
  const cats = allCats();

  const [cat,      setCat]      = useState(initialData?.cat    || defaultCat);
  const [sub,      setSub]      = useState(initialData?.sub    || '');
  const [name,     setName]     = useState(initialData?.name   || '');
  const [status,   setStatus]   = useState(initialData?.status || 'draft');
  const [desc,     setDesc]     = useState(initialData?.desc   || '');
  const [extra,    setExtra]    = useState(initialData?.extra  || {});
  const [images,   setImages]   = useState(initialData?.images || (initialData?.image ? [initialData.image] : []));
  const [date,       setDate]       = useState(initialData?.date      || '');
  const [importance, setImportance] = useState(initialData?.importance || 'minore');
  const [tags,     setTags]     = useState(initialData?.tags   || []);
  const [tagQuery,   setTagQuery]   = useState('');
  const [tagOpen,    setTagOpen]    = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const tagInputRef = useRef(null);

  const curCat      = cats.find(c => c.id === cat);
  const subsList    = curCat?.subs || [];
  const extraFields = EXTRA_FIELDS[cat] || [];

  const [eventPlace, setEventPlace] = useState(initialData?.eventPlace || '');
  const [eventEls,   setEventEls]   = useState(initialData?.eventEls   || []);
  const [eventType,  setEventType]  = useState(initialData?.eventType  || 'point');
  const [eventSide,  setEventSide]  = useState(initialData?.eventSide  || '');
  const [dateEnd,    setDateEnd]    = useState(initialData?.dateEnd    || '');

  const handleCatChange = (newCat) => { setCat(newCat); setSub(''); setExtra({}); };
  const setExtraField = (key, val) => setExtra(prev => ({ ...prev, [key]: val }));

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImages(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const updateTagField = (id, field, value) => {
    setTags(prev => prev.map(tg => {
      if (tagId(tg) !== id) return tg;
      const base = typeof tg === 'string' ? { id: tg, rel: '', importance: 'Media' } : tg;
      return { ...base, [field]: value };
    }));
  };
  const addTag    = (id) => { setTags(prev => [...prev, { id, rel: '', importance: 'media' }]); setTagQuery(''); setTagOpen(false); setEditingTag(id); };
  const removeTag = (id) => { setTags(prev => prev.filter(t => tagId(t) !== id)); setEditingTag(null); };

  const handleSave = () => {
    if (!name.trim()) { alert(t('common.name_required')); return; }
    const data = {
      cat, sub, name: name.trim(), status, desc, extra, image: images[0] || '', images, tags, date,
      importance,
      eventPlace: cat === 'event' ? eventPlace : null,
      eventEls:   cat === 'event' ? eventEls   : [],
      eventType:  cat === 'event' ? eventType  : null,
      eventSide:  cat === 'event' ? eventSide  : null,
      dateEnd:    cat === 'event' && eventType === 'range' ? dateEnd : null,
      powers:    initialData?.powers    || [],
      equip:     initialData?.equip     || [],
      changelog: initialData?.changelog || [],
      notes:     initialData?.notes     || '',
    };
    const birthDate = extra?.nascita;
    const isNewChar     = !initialData && cat === 'char' && birthDate;
    const isDateChanged = initialData && cat === 'char' && birthDate && birthDate !== initialData?.extra?.nascita;
    onSave(data, isNewChar || isDateChanged ? birthDate : null);
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('element.title_edit') : t('element.title_new')}</div>

        <div className="frow">
          <div className="fg" style={{ marginBottom: 10 }}>
            <label className="fl">{t('element.cat_lbl')}</label>
            <select className="fs" value={cat} onChange={e => handleCatChange(e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {subsList.length > 0 && (
            <div className="fg" style={{ marginBottom: 10 }}>
              <label className="fl">{t('element.sub_lbl')}</label>
              <select className="fs" value={sub} onChange={e => setSub(e.target.value)}>
                <option value="">{t('common.none_f')}</option>
                {subsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="fg">
          <label className="fl">{t('common.name_lbl')}</label>
          <input className="fi" placeholder={t('element.name_ph')} value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>

        <div className="fg">
          <label className="fl">{t('element.status_lbl')}</label>
          <select className="fs" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">{t('status.draft')}</option>
            <option value="wip">{t('status.wip')}</option>
            <option value="done">{t('status.done')}</option>
          </select>
        </div>

        <div className="fg">
          <label className="fl">{t('element.imp_lbl')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {IMP_OPTS.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setImportance(opt.value)}
                style={{
                  flex: 1, padding: '7px 4px', fontSize: 11,
                  background: importance === opt.value ? 'var(--gold-glow)' : 'var(--surface2)',
                  border: `1px solid ${importance === opt.value ? 'var(--gold-dim)' : 'var(--border)'}`,
                  color: importance === opt.value ? 'var(--gold)' : 'var(--text-muted)',
                  borderRadius: 'var(--r)', cursor: 'pointer', transition: 'all .2s',
                  fontFamily: "'Crimson Pro', serif",
                }}>
                {opt.stars} {t('importance.' + opt.value)}
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label className="fl">{t('common.desc_lbl')}</label>
          <textarea className="ft" placeholder={t('element.desc_ph')} value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div className="fg" style={{ position: 'relative' }}>
          <label className="fl">{t('element.tag_lbl')}</label>

          <div
            onClick={() => { setTagOpen(true); tagInputRef.current?.focus(); }}
            style={{ background: 'var(--surface2)', border: `1px solid ${tagOpen ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text', transition: 'border-color .15s' }}
          >
            {tags.map(t => {
              const tid = tagId(t);
              const to  = tagObj(t);
              const el  = elements.find(e => e.id === tid);
              if (!el) return null;
              const catColor  = cats.find(c => c.id === el.cat)?.color || '#888';
              const impColor  = TAG_IMP_COLOR[to.importance] || '#888';
              const isEditing = editingTag === tid;
              return (
                <span key={tid} style={{ background: 'var(--surface3)', border: `1px solid ${catColor}55`, borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setEditingTag(isEditing ? null : tid); }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                  {el.name}
                  {to.rel && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>· {to.rel}</span>}
                  <span style={{ color: impColor, fontSize: 11 }}>{TAG_IMP_LABEL[to.importance]}</span>
                  <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeTag(tid); }}>×</span>
                </span>
              );
            })}
            <input
              ref={tagInputRef}
              type="text"
              placeholder={tags.length ? '' : t('common.search_browse')}
              value={tagQuery}
              onChange={e => { setTagQuery(e.target.value); setTagOpen(true); }}
              onFocus={() => setTagOpen(true)}
              onBlur={() => setTimeout(() => setTagOpen(false), 200)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setTagOpen(false); setTagQuery(''); }
                if (e.key === 'Backspace' && !tagQuery && tags.length) removeTag(tags[tags.length - 1]);
              }}
              autoComplete="off"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, flex: 1, minWidth: 120 }}
            />
          </div>

          {tagOpen && (() => {
            const available = elements.filter(e =>
              e.id !== initialData?.id &&
              !tags.some(t => tagId(t) === e.id) &&
              (tagQuery === '' || e.name.toLowerCase().includes(tagQuery.toLowerCase()))
            );
            const groups = cats
              .map(c => ({ cat: c, items: available.filter(e => e.cat === c.id) }))
              .filter(g => g.items.length > 0);

            if (groups.length === 0) return (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 700, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                {t('common.no_elements')}
              </div>
            );

            return (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 700, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 28px rgba(0,0,0,.55)', maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ padding: '6px 12px 5px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  <span>{t('element.tag_available', { count: available.length })}</span>
                  <span>{t('element.tag_backspace')}</span>
                </div>
                {groups.map(({ cat: c, items }) => (
                  <div key={c.id}>
                    <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: c.color, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', top: 0 }}>
                      <span>{c.icon}</span>
                      <span>{c.name}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: .7 }}>{items.length}</span>
                    </div>
                    {items.map(el => (
                      <div key={el.id} onMouseDown={() => addTag(el.id)}
                        style={{ padding: '7px 12px 7px 22px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{el.name}</span>
                        {el.sub && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{el.sub}</span>}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {el.importance === 'principale' ? '⭐⭐⭐' : el.importance === 'primario' ? '⭐⭐' : el.importance === 'secondario' ? '⭐' : '·'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}

          {editingTag && (() => {
            const tagEntry = tags.find(x => tagId(x) === editingTag);
            const el = elements.find(e => e.id === editingTag);
            if (!tagEntry || !el) return null;
            const catColor = cats.find(c => c.id === el.cat)?.color || '#888';
            return (
              <TagEditor
                tagEntry={tagEntry}
                element={el}
                catColor={catColor}
                onUpdateField={(field, value) => updateTagField(editingTag, field, value)}
                onDone={() => setEditingTag(null)}
                sessioni={sessioni}
              />
            );
          })()}
        </div>

        {cat === 'event' && (
          <>
            <div className="fg">
              <label className="fl">{t('element.ev_date_lbl')}</label>
              <input className="fi" placeholder="GG/MM/AAAA" value={date}
                onChange={e => {
                  let v = e.target.value.replace(/[^\d/]/g, '');
                  if (v.length === 2 && !v.includes('/')) v += '/';
                  if (v.length === 5 && v.split('/').length === 2) v += '/';
                  if (v.length > 10) v = v.slice(0, 10);
                  setDate(v);
                }}
                maxLength={10} autoComplete="off" />
            </div>

            <div className="fg">
              <label className="fl">{t('element.ev_type_lbl')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ value: 'point', key: 'ev_point' }, { value: 'range', key: 'ev_range' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setEventType(opt.value)}
                    style={{ flex: 1, padding: '7px 4px', fontSize: 12, background: eventType === opt.value ? 'var(--gold-glow)' : 'var(--surface2)', border: `1px solid ${eventType === opt.value ? 'var(--gold-dim)' : 'var(--border)'}`, color: eventType === opt.value ? 'var(--gold)' : 'var(--text-muted)', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
                    {t('element.' + opt.key)}
                  </button>
                ))}
              </div>
            </div>

            {eventType === 'range' && (
              <div className="fg">
                <label className="fl">{t('element.ev_date_end')}</label>
                <input className="fi" placeholder="GG/MM/AAAA" value={dateEnd}
                  onChange={e => {
                    let v = e.target.value.replace(/[^\d/]/g, '');
                    if (v.length === 2 && !v.includes('/')) v += '/';
                    if (v.length === 5 && v.split('/').length === 2) v += '/';
                    if (v.length > 10) v = v.slice(0, 10);
                    setDateEnd(v);
                  }} maxLength={10} autoComplete="off" />
              </div>
            )}

            <div className="fg">
              <label className="fl">{t('element.ev_side_lbl')}</label>
              <select className="fs" value={eventSide} onChange={e => setEventSide(e.target.value)}>
                <option value="">{t('element.ev_side_none')}</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            <div className="fg">
              <label className="fl">{t('element.ev_place_lbl')}</label>
              <select className="fs" value={eventPlace} onChange={e => setEventPlace(e.target.value)}>
                <option value="">{t('element.ev_place_none')}</option>
                {elements.filter(e => e.cat === 'place').map(l => (
                  <option key={l.id} value={l.id}>📍 {l.name}</option>
                ))}
              </select>
            </div>

            {eventPlace && (
              <div className="fg">
                <label className="fl">{t('element.ev_els_lbl')}</label>
                <ElementPicker
                  selected={eventEls}
                  onChange={setEventEls}
                  exclude={[initialData?.id].filter(Boolean)}
                  inputId="evElInput"
                  placeholder={t('element.ev_els_ph')}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                  {t('element.ev_els_note')}
                </div>
              </div>
            )}
          </>
        )}

        {extraFields.length > 0 && (
          <div className="frow">
            {extraFields.map(f => (
              <div key={f.key} className="fg" style={{ marginBottom: 10 }}>
                <label className="fl">{t('element.extra.' + f.key)}</label>
                <input
                  className="fi"
                  style={{ marginBottom: 0 }}
                  placeholder={f.isDate ? 'GG/MM/AAAA' : t('element.extra.' + f.key)}
                  value={extra[f.key] || ''}
                  onChange={e => {
                    if (f.isDate) {
                      let v = e.target.value.replace(/[^\d/]/g, '');
                      if (v.length === 2 && !v.includes('/')) v += '/';
                      if (v.length === 5 && v.split('/').length === 2) v += '/';
                      if (v.length > 10) v = v.slice(0, 10);
                      setExtraField(f.key, v);
                    } else {
                      setExtraField(f.key, e.target.value);
                    }
                  }}
                  maxLength={f.isDate ? 10 : undefined}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        )}

        <div className="fg">
          <label className="fl">{t('element.images_lbl')}</label>
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {images.map((src, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={src} alt="" style={{ height: 80, width: 'auto', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                  <button
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div onClick={() => document.getElementById('fImgInput').click()}
            style={{ background: 'var(--surface2)', border: '1px dashed var(--border-light)', borderRadius: 6, padding: 12, textAlign: 'center', cursor: 'pointer', marginBottom: 8 }}>
            <div style={{ fontSize: 20 }}>🖼</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {images.length ? t('element.img_add') : t('element.img_upload')}
            </p>
          </div>
          <input type="file" id="fImgInput" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? t('common.save_changes') : t('element.create_btn')}</button>
        </div>
      </div>
    </div>
  );
}
