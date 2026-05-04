import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

export default function FazioneModal({ initialData = null, onSave, onClose }) {
  const { elements, fazioni } = useWorld();
  const cats = [
    { id: 'char',   name: 'Personaggi', icon: '👤', color: '#9dd4ee' },
    { id: 'place',  name: 'Luoghi',     icon: '📍', color: '#aed896' },
    { id: 'object', name: 'Oggetti',    icon: '📦', color: '#ebb488' },
    { id: 'event',  name: 'Eventi',     icon: '⚡', color: '#d4aedf' },
  ];

  const [name,     setName]     = useState(initialData?.name     || '');
  const [desc,     setDesc]     = useState(initialData?.desc     || '');
  const [motto,    setMotto]    = useState(initialData?.motto    || '');
  const [members,  setMembers]  = useState(initialData?.members  || []);
  const [parentId, setParentId] = useState(initialData?.parentId || null);
  const [memQ,     setMemQ]     = useState('');
  const [memOpen,  setMemOpen]  = useState(false);

  const available   = elements.filter(e => !members.includes(e.id) && (!memQ || e.name.toLowerCase().includes(memQ.toLowerCase())));
  const grouped     = cats.map(c => ({ cat: c, items: available.filter(e => e.cat === c.id) })).filter(g => g.items.length > 0);
  const addMember    = (id) => { setMembers(p => [...p, id]); setMemQ(''); };
  const removeMember = (id) => setMembers(p => p.filter(m => m !== id));

  const handleSave = () => {
    if (!name.trim()) { alert('Il nome è obbligatorio'); return; }
    onSave({ name: name.trim(), desc, motto, members, parentId: parentId || null, rels: initialData?.rels || [], notes: initialData?.notes || '' });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? 'Modifica fazione' : 'Nuova fazione'}</div>
        <div className="fg"><label className="fl">Nome</label>
          <input className="fi" placeholder="Es. Ordine Nero" value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">Descrizione</label>
          <textarea className="ft" placeholder="Obiettivi, storia, struttura…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="fg"><label className="fl">Motto / Simbolo</label>
          <input className="fi" placeholder="Es. Per la purezza eterna" value={motto} onChange={e => setMotto(e.target.value)} autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">Fazione genitore (opzionale)</label>
          <select className="fs" value={parentId || ''} onChange={e => setParentId(e.target.value || null)}>
            <option value="">— Nessuna —</option>
            {fazioni.filter(f => f.id !== initialData?.id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Membri</label>
          <div onClick={() => document.getElementById('fmemInput').focus()}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {members.map(id => { const el = elements.find(c => c.id === id); if (!el) return null;
              return <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}<span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeMember(id); }}>×</span></span>; })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120, zIndex: 1 }}>
              <input id="fmemInput" type="text" placeholder={members.length ? '' : 'Cerca o sfoglia…'} value={memQ}
                onChange={e => { setMemQ(e.target.value); setMemOpen(true); }}
                onFocus={() => setMemOpen(true)} onBlur={() => setTimeout(() => setMemOpen(false), 150)}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }} />
              {memOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700, maxHeight: 260, overflowY: 'auto' }}>
                  {grouped.length === 0
                    ? <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Nessun elemento trovato</div>
                    : grouped.map(({ cat: c, items }) => (
                      <div key={c.id}>
                        <div style={{ padding: '5px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: c.color, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{c.icon}</span><span>{c.name}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: .7 }}>{items.length}</span>
                        </div>
                        {items.map(el => (
                          <div key={el.id} onMouseDown={() => addMember(el.id)}
                            style={{ padding: '7px 12px 7px 20px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{el.name}</span>
                          </div>
                        ))}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Annulla</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? 'Salva modifiche' : 'Crea fazione'}</button>
        </div>
      </div>
    </div>
  );
}