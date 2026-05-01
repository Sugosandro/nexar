import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

function FazioneModal({ initialData = null, onSave, onClose }) {
  const { elements, fazioni } = useWorld();
  const chars = elements.filter(e => e.cat === 'char');

  const [name,     setName]     = useState(initialData?.name     || '');
  const [desc,     setDesc]     = useState(initialData?.desc     || '');
  const [motto,    setMotto]    = useState(initialData?.motto    || '');
  const [members,  setMembers]  = useState(initialData?.members  || []);
  const [parentId, setParentId] = useState(initialData?.parentId || null);
  const [memQ,     setMemQ]     = useState('');
  const [memOpen,  setMemOpen]  = useState(false);

  const suggestions = memQ
    ? chars.filter(e => !members.includes(e.id) && e.name.toLowerCase().includes(memQ.toLowerCase())).slice(0, 6)
    : [];

  const addMember    = (id) => { setMembers(p => [...p, id]); setMemQ(''); setMemOpen(false); };
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
          <div onClick={() => document.getElementById('memInput').focus()}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {members.map(id => {
              const el = chars.find(c => c.id === id);
              if (!el) return null;
              return <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}<span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeMember(id); }}>×</span>
              </span>;
            })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input id="memInput" type="text" placeholder={members.length ? '' : 'Cerca personaggio…'} value={memQ}
                onChange={e => { setMemQ(e.target.value); setMemOpen(true); }}
                onFocus={() => setMemOpen(true)} onBlur={() => setTimeout(() => setMemOpen(false), 150)}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }} />
              {memOpen && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700 }}>
                  {suggestions.map(el => <div key={el.id} onMouseDown={() => addMember(el.id)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>👤 {el.name}</div>)}
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

function FazioneCard({ fazione, onOpen, depth = 0 }) {
  const { elements, fazioni } = useWorld();
  const members  = (fazione.members || []).map(id => elements.find(e => e.id === id)).filter(Boolean);
  const children = fazioni.filter(f => f.parentId === fazione.id);

  return (
    <div style={{ marginLeft: depth * 24, marginBottom: 10 }}>
      <div className="card" style={{ borderTop: '3px solid #f0c060', cursor: 'pointer' }} onClick={() => onOpen(fazione.id)}>
        <div className="card-body">
          <div className="card-type" style={{ color: '#f0c060' }}>⚔ Fazione</div>
          <div className="card-name">{fazione.name}</div>
          {fazione.motto && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>"{fazione.motto}"</div>}
          <div className="card-desc">{fazione.desc || <em style={{ opacity: .35 }}>Nessuna descrizione</em>}</div>
          {members.length > 0 && (
            <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {members.map(m => <span key={m.id} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--char-dim)', color: 'var(--char)' }}>👤 {m.name}</span>)}
            </div>
          )}
        </div>
      </div>
      {children.map(child => <FazioneCard key={child.id} fazione={child} onOpen={onOpen} depth={depth + 1} />)}
    </div>
  );
}

export default function FazioniView({ onOpenFazione, showToast }) {
  const { fazioni, addFazione } = useWorld();
  const [showModal, setShowModal] = useState(false);
  const rootFazioni = fazioni.filter(f => !f.parentId);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">⚔ <span>Fazioni</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuova fazione</button>
      </div>
      {fazioni.length === 0
        ? <div className="empty"><div className="empty-icon">⚔</div><div className="empty-title">Nessuna fazione</div><div className="empty-sub">Crea la prima fazione del tuo mondo</div></div>
        : rootFazioni.map(f => <FazioneCard key={f.id} fazione={f} onOpen={onOpenFazione} />)
      }
      {showModal && (
        <FazioneModal onSave={async (data) => { await addFazione(data); setShowModal(false); showToast('✓ Fazione creata'); }} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}