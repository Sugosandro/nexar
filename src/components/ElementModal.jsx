// src/components/ElementModal.jsx
import { useState, useRef, useEffect } from 'react';
import { useWorld } from '../hooks/useWorld';

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
  const [image,    setImage]    = useState(initialData?.image  || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [tags,     setTags]     = useState(initialData?.tags   || []);
  const [tagQuery, setTagQuery] = useState('');
  const [tagOpen,  setTagOpen]  = useState(false);
  const tagInputRef = useRef(null);

  const curCat      = cats.find(c => c.id === cat);
  const subsList    = curCat?.subs || [];
  const extraFields = EXTRA_FIELDS[cat] || [];

  const [eventPlace, setEventPlace] = useState(initialData?.eventPlace || '');
const [eventEls,   setEventEls]   = useState(initialData?.eventEls   || []);
const [evElQuery,  setEvElQuery]  = useState('');
const [evElOpen,   setEvElOpen]   = useState(false);

const evElSuggestions = evElQuery
  ? elements.filter(e =>
      e.cat !== 'event' &&
      !eventEls.includes(e.id) &&
      e.name.toLowerCase().includes(evElQuery.toLowerCase())
    ).slice(0, 8)
  : [];

  const tagSuggestions = tagQuery
    ? elements.filter(e =>
        e.id !== initialData?.id &&
        !tags.includes(e.id) &&
        e.name.toLowerCase().includes(tagQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleCatChange = (newCat) => { setCat(newCat); setSub(''); setExtra({}); };
  const setExtraField = (key, val) => setExtra(prev => ({ ...prev, [key]: val }));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const addTag = (id) => { setTags(prev => [...prev, id]); setTagQuery(''); setTagOpen(false); tagInputRef.current?.focus(); };
  const removeTag = (id) => setTags(prev => prev.filter(t => t !== id));

const handleSave = () => {
  if (!name.trim()) { alert('Il nome è obbligatorio'); return; }
  const data = {
    cat, sub, name: name.trim(), status, desc, extra, image, tags, date,
    eventPlace: cat === 'event' ? eventPlace : null,
    eventEls:   cat === 'event' ? eventEls   : [],
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
          <label className="fl">Immagine (opzionale)</label>
          {image ? (
            <div style={{ marginBottom: 8 }}>
              <img src={image} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6 }} />
              <button className="btn-g" style={{ marginTop: 5, fontSize: 11 }} onClick={() => setImage('')}>✕ Rimuovi</button>
            </div>
          ) : (
            <div onClick={() => document.getElementById('fImgInput').click()} style={{ background: 'var(--surface2)', border: '1px dashed var(--border-light)', borderRadius: 6, padding: 16, textAlign: 'center', cursor: 'pointer', marginBottom: 8 }}>
              <div style={{ fontSize: 24 }}>🖼</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Clicca per caricare un'immagine</p>
            </div>
          )}
          <input type="file" id="fImgInput" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>

        <div className="fg">
          <label className="fl">Tag — collega ad altri elementi</label>
          <div onClick={() => tagInputRef.current?.focus()} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {tags.map(tid => {
              const el = elements.find(e => e.id === tid);
              if (!el) return null;
              return (
                <span key={tid} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {el.name}
                  <span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeTag(tid); }}>×</span>
                </span>
              );
            })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input ref={tagInputRef} type="text" placeholder={tags.length ? '' : 'Cerca elemento…'} value={tagQuery}
                onChange={e => { setTagQuery(e.target.value); setTagOpen(true); }}
                onFocus={() => setTagOpen(true)}
                onBlur={() => setTimeout(() => setTagOpen(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setTagOpen(false);
                  if (e.key === 'Backspace' && !tagQuery && tags.length) removeTag(tags[tags.length - 1]);
                }}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }}
              />
              {tagOpen && tagSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 280, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, overflow: 'hidden' }}>
                  {tagSuggestions.map(el => (
                    <div key={el.id} onMouseDown={() => addTag(el.id)}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: cats.find(c => c.id === el.cat)?.color || '#888' }} />
                      {el.name}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{cats.find(c => c.id === el.cat)?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Annulla</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? 'Salva modifiche' : 'Crea elemento'}</button>
        </div>
      </div>
    </div>
  );
}