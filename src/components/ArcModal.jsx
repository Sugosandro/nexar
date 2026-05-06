import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

export default function ArcModal({ initialData = null, onSave, onClose }) {
  const { elements } = useWorld();
  const [name,     setName]     = useState(initialData?.name         || '');
  const [desc,     setDesc]     = useState(initialData?.desc         || '');
  const [phases,   setPhases]   = useState((initialData?.phases || []).join(', '));
  const [curPhase, setCurPhase] = useState(initialData?.currentPhase || '');
  const [members,  setMembers]  = useState(initialData?.members      || []);
  const [memQ,     setMemQ]     = useState('');
  const [memOpen,  setMemOpen]  = useState(false);

  const CATS = [
    { id: 'char',   name: 'Personaggi', icon: '👤', color: '#9dd4ee' },
    { id: 'place',  name: 'Luoghi',     icon: '📍', color: '#aed896' },
    { id: 'object', name: 'Oggetti',    icon: '📦', color: '#ebb488' },
    { id: 'event',  name: 'Eventi',     icon: '⚡', color: '#d4aedf' },
  ];
  const available    = elements.filter(e => !members.includes(e.id) && (!memQ || e.name.toLowerCase().includes(memQ.toLowerCase())));
  const grouped      = CATS.map(c => ({ cat: c, items: available.filter(e => e.cat === c.id) })).filter(g => g.items.length > 0);
  const addMember    = (id) => { setMembers(p => [...p, id]); setMemQ(''); };
  const removeMember = (id) => setMembers(p => p.filter(m => m !== id));

  const handleSave = () => {
    if (!name.trim()) { alert('Il nome è obbligatorio'); return; }
    onSave({ name: name.trim(), desc, phases: phases.split(',').map(p => p.trim()).filter(Boolean), currentPhase: curPhase, members, notes: initialData?.notes || '' });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? 'Modifica arco' : 'Nuovo arco narrativo'}</div>
        <div className="fg"><label className="fl">Nome dell'arco</label>
          <input className="fi" placeholder="Es. La caccia all'eretica" value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">Descrizione</label>
          <textarea className="ft" placeholder="Riassumi il filo narrativo…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="fg"><label className="fl">Fasi (separate da virgola)</label>
          <input className="fi" placeholder="Es. Innesco, Sviluppo, Climax, Risoluzione" value={phases} onChange={e => setPhases(e.target.value)} autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">Fase corrente</label>
          <input className="fi" placeholder="Es. Sviluppo" value={curPhase} onChange={e => setCurPhase(e.target.value)} autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">Elementi coinvolti</label>
          <div onClick={() => document.getElementById('aMemIn').focus()}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {members.map(id => { const el = elements.find(e => e.id === id); if (!el) return null;
              return <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}<span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeMember(id); }}>×</span></span>; })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input id="aMemIn" type="text" placeholder={members.length ? '' : 'Cerca o sfoglia…'} value={memQ}
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
                            <span>{el.name}</span>
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
          <button className="btn-p" onClick={handleSave}>{initialData ? 'Salva modifiche' : 'Crea arco'}</button>
        </div>
      </div>
    </div>
  );
}