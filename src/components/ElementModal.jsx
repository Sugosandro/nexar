// src/components/ElementModal.jsx
import { useState, useRef, useEffect } from 'react';
import { useWorld } from '../hooks/useWorld';
import { tagId, tagObj, TAG_IMPORTANCE, TAG_IMP_COLOR, TAG_IMP_LABEL } from '../hooks/useWorld';

const EXTRA_FIELDS = {
  char:   [{ key: 'ruolo', label: 'Ruolo' }, { key: 'nascita', label: 'Data di nascita', isDate: true }],
  place:  [{ key: 'regione', label: 'Regione' }],
  object: [{ key: 'materiale', label: 'Materiale' }],
  event:  [],
};
export default function ElementModal({ defaultCat = 'char', initialData = null, onSave, onClose }) {
  const { allCats, elements } = useWorld();
  const cats = allCats();

  const [cat,      setCat]      = useState(initialData?.cat    || defaultCat);
  const [sub,      setSub]      = useState(initialData?.sub    || '');
  const [name,     setName]     = useState(initialData?.name   || '');
  const [status,   setStatus]   = useState(initialData?.status || 'draft');
  const [desc,     setDesc]     = useState(initialData?.desc   || '');
  const [extra,    setExtra]    = useState(initialData?.extra  || {});
  const [images,   setImages]   = useState(initialData?.images || (initialData?.image ? [initialData.image] : []));
  const [date, setDate] = useState(initialData?.date || '');
  const [importance, setImportance] = useState(initialData?.importance || 'minore');
  const [tags,     setTags]     = useState(initialData?.tags   || []);
  const [tagQuery,    setTagQuery]    = useState('');
  const [tagOpen,     setTagOpen]     = useState(false);
  const [editingTag,  setEditingTag]  = useState(null); // id tag in editing
  const tagInputRef = useRef(null);

  const curCat      = cats.find(c => c.id === cat);
  const subsList    = curCat?.subs || [];
  const extraFields = EXTRA_FIELDS[cat] || [];

  const [eventPlace, setEventPlace] = useState(initialData?.eventPlace || '');
  const [eventEls,   setEventEls]   = useState(initialData?.eventEls   || []);
  const [evElQuery,  setEvElQuery]  = useState('');
  const [evElOpen,   setEvElOpen]   = useState(false);
  const [eventType,  setEventType]  = useState(initialData?.eventType  || 'point'); // 'point' | 'range'
  const [eventSide,  setEventSide]  = useState(initialData?.eventSide  || '');      // category id
  const [dateEnd,    setDateEnd]    = useState(initialData?.dateEnd    || '');

const evElSuggestions = evElQuery
  ? elements.filter(e =>
      e.cat !== 'event' &&
      !eventEls.includes(e.id) &&
      e.name.toLowerCase().includes(evElQuery.toLowerCase())
    ).slice(0, 8)
  : [];

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
    setTags(prev => prev.map(t => tagId(t) === id ? { ...tagObj(t), [field]: value } : t));
  };
  const addTag = (id) => { setTags(prev => [...prev, { id, rel: '', importance: 'media' }]); setTagQuery(''); setTagOpen(false); setEditingTag(id); };
  const removeTag = (id) => { setTags(prev => prev.filter(t => tagId(t) !== id)); setEditingTag(null); };

const handleSave = () => {
  if (!name.trim()) { alert('Il nome è obbligatorio'); return; }
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
  const isNewChar = !initialData && cat === 'char' && birthDate;
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
        <div className="modal-title">{initialData ? 'Modifica elemento' : 'Nuovo elemento'}</div>

        <div className="frow">
          <div className="fg" style={{ marginBottom: 10 }}>
            <label className="fl">Categoria</label>
            <select className="fs" value={cat} onChange={e => handleCatChange(e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {subsList.length > 0 && (
            <div className="fg" style={{ marginBottom: 10 }}>
              <label className="fl">Sottocategoria</label>
              <select className="fs" value={sub} onChange={e => setSub(e.target.value)}>
                <option value="">— Nessuna —</option>
                {subsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="fg">
          <label className="fl">Nome</label>
          <input className="fi" placeholder="Nome elemento" value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>

        <div className="fg">
          <label className="fl">Stato</label>
          <select className="fs" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">✏ Bozza</option>
            <option value="wip">🔵 In sviluppo</option>
            <option value="done">✅ Definitivo</option>
          </select>
        </div>

        <div className="fg">
  <label className="fl">Importanza</label>
  <div style={{ display: 'flex', gap: 8 }}>
    {[
      { value: 'protagonista', label: '⭐⭐⭐ Protagonista' },
      { value: 'primario',     label: '⭐⭐ Primario' },
      { value: 'secondario',   label: '⭐ Secondario' },
      { value: 'minore',       label: '· Minore' },
    ].map(opt => (
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
        {opt.label}
      </button>
    ))}
  </div>
</div>

        <div className="fg">
          <label className="fl">Descrizione</label>
          <textarea className="ft" placeholder="Descrivi questo elemento…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        
        {cat === 'event' && (
  <>
    <div className="fg">
      <label className="fl">Data / Momento narrativo</label>
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
      <label className="fl">Tipo di evento</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ value: 'point', label: '◆ Puntuale' }, { value: 'range', label: '▬ Con durata' }].map(opt => (
          <button key={opt.value} type="button" onClick={() => setEventType(opt.value)}
            style={{ flex: 1, padding: '7px 4px', fontSize: 12, background: eventType === opt.value ? 'var(--gold-glow)' : 'var(--surface2)', border: `1px solid ${eventType === opt.value ? 'var(--gold-dim)' : 'var(--border)'}`, color: eventType === opt.value ? 'var(--gold)' : 'var(--text-muted)', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    {eventType === 'range' && (
      <div className="fg">
        <label className="fl">Data di fine</label>
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
      <label className="fl">Lato timeline (opzionale)</label>
      <select className="fs" value={eventSide} onChange={e => setEventSide(e.target.value)}>
        <option value="">— Nessun lato assegnato —</option>
        {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
    </div>

    <div className="fg">
      <label className="fl">Luogo dell'evento (opzionale)</label>
      <select className="fs" value={eventPlace} onChange={e => setEventPlace(e.target.value)}>
        <option value="">— Nessun luogo —</option>
        {elements.filter(e => e.cat === 'place').map(l => (
          <option key={l.id} value={l.id}>📍 {l.name}</option>
        ))}
      </select>
    </div>

    {eventPlace && (
      <div className="fg">
        <label className="fl">Elementi presenti durante l'evento</label>
        <div onClick={() => document.getElementById('evElInput').focus()}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
          {eventEls.map(id => {
            const el = elements.find(e => e.id === id);
            if (!el) return null;
            return (
              <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}
                <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }}
                  onClick={e => { e.stopPropagation(); setEventEls(p => p.filter(i => i !== id)); }}>×</span>
              </span>
            );
          })}
          <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
            <input id="evElInput" type="text" placeholder={eventEls.length ? '' : 'Cerca elemento…'}
              value={evElQuery}
              onChange={e => { setEvElQuery(e.target.value); setEvElOpen(true); }}
              onFocus={() => setEvElOpen(true)}
              onBlur={() => setTimeout(() => setEvElOpen(false), 150)}
              autoComplete="off"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }}
            />
            {evElOpen && evElSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700 }}>
                {evElSuggestions.map(el => (
                  <div key={el.id} onMouseDown={() => { setEventEls(p => [...p, el.id]); setEvElQuery(''); setEvElOpen(false); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {el.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
          Verrà aggiunta automaticamente una voce nello storico di ogni elemento
        </div>
      </div>
    )}
  </>
)}
          
        {extraFields.length > 0 && (
  <div className="frow">
    {extraFields.map(f => (
      <div key={f.key} className="fg" style={{ marginBottom: 10 }}>
        <label className="fl">{f.label}</label>
        <input
          className="fi"
          style={{ marginBottom: 0 }}
          placeholder={f.isDate ? 'GG/MM/AAAA' : f.label}
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
          <label className="fl">Immagini (opzionale)</label>
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
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{images.length ? '+ Aggiungi altra immagine' : 'Clicca per caricare immagini'}</p>
          </div>
          <input type="file" id="fImgInput" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>

        <div className="fg" style={{ position: 'relative' }}>
          <label className="fl">Tag — collega ad altri elementi</label>

          {/* Chip selezionati + input ricerca */}
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
              placeholder={tags.length ? '' : 'Cerca o sfoglia…'}
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

          {/* Dropdown raggruppato per categoria */}
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
                Nessun elemento trovato
              </div>
            );

            return (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 700, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 28px rgba(0,0,0,.55)', maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ padding: '6px 12px 5px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  <span>{available.length} elementi disponibili</span>
                  <span>backspace per rimuovere</span>
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
                          {el.importance === 'protagonista' ? '⭐⭐⭐' : el.importance === 'primario' ? '⭐⭐' : el.importance === 'secondario' ? '⭐' : '·'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
          {/* Pannello modifica rel/importance del tag selezionato */}
          {editingTag && (() => {
            const t  = tags.find(x => tagId(x) === editingTag);
            const to = t ? tagObj(t) : null;
            const el = to ? elements.find(e => e.id === to.id) : null;
            if (!to || !el) return null;
            const catColor = cats.find(c => c.id === el.cat)?.color || '#888';
            return (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--surface2)', border: `1px solid ${catColor}44`, borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: 11, color: catColor, marginBottom: 8, fontWeight: 600 }}>
                  Relazione con {el.name}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Tipo di relazione (es. Fratello, Nemico…)"
                    value={to.rel}
                    onChange={e => updateTagField(editingTag, 'rel', e.target.value)}
                    style={{ flex: 1, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, padding: '5px 10px', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    {TAG_IMPORTANCE.map(imp => (
                      <button key={imp} type="button" onClick={() => updateTagField(editingTag, 'importance', imp)}
                        style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                          background: to.importance === imp ? TAG_IMP_COLOR[imp] + '33' : 'var(--surface)',
                          border: `1px solid ${to.importance === imp ? TAG_IMP_COLOR[imp] : 'var(--border)'}`,
                          color: to.importance === imp ? TAG_IMP_COLOR[imp] : 'var(--text-muted)' }}>
                        {TAG_IMP_LABEL[imp]} {imp}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setEditingTag(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>✓</button>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Annulla</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? 'Salva modifiche' : 'Crea elemento'}</button>
        </div>
      </div>
    </div>
  );
}