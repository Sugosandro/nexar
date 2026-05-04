import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

function MagiaModal({ initialData = null, onSave, onClose }) {
  const { elements } = useWorld();
  const [name,  setName]  = useState(initialData?.name  || '');
  const [desc,  setDesc]  = useState(initialData?.desc  || '');
  const [rules, setRules] = useState((initialData?.rules || []).join('\n'));
  const [users, setUsers] = useState(initialData?.users || []);
  const [userQ, setUserQ] = useState('');
  const [userOpen, setUserOpen] = useState(false);

  const cats = [
    { id: 'char', name: 'Personaggi', icon: '👤', color: '#9dd4ee' },
    { id: 'place', name: 'Luoghi', icon: '📍', color: '#aed896' },
    { id: 'object', name: 'Oggetti', icon: '📦', color: '#ebb488' },
    { id: 'event', name: 'Eventi', icon: '⚡', color: '#d4aedf' },
  ];
  const available = elements.filter(e => !users.includes(e.id) && (!userQ || e.name.toLowerCase().includes(userQ.toLowerCase())));
  const grouped   = cats.map(c => ({ cat: c, items: available.filter(e => e.cat === c.id) })).filter(g => g.items.length > 0);
  const addUser    = (id) => { setUsers(p => [...p, id]); setUserQ(''); };
  const removeUser = (id) => setUsers(p => p.filter(u => u !== id));

  const handleSave = () => {
    if (!name.trim()) { alert('Il nome è obbligatorio'); return; }
    onSave({ name: name.trim(), desc, rules: rules.split('\n').map(r => r.trim()).filter(Boolean), users, notes: initialData?.notes || '' });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? 'Modifica sistema' : 'Nuovo sistema di magia'}</div>
        <div className="fg"><label className="fl">Nome</label>
          <input className="fi" placeholder="Es. Alchimia Argentea" value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">Descrizione</label>
          <textarea className="ft" placeholder="Come funziona?" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="fg"><label className="fl">Regole (una per riga)</label>
          <textarea className="ft" placeholder={'Regola 1\nRegola 2'} value={rules} onChange={e => setRules(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div className="fg"><label className="fl">Chi lo usa</label>
          <div onClick={() => document.getElementById('magUserIn2').focus()}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {users.map(id => { const el = elements.find(e => e.id === id); if (!el) return null;
              return <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}<span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeUser(id); }}>×</span></span>; })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input id="magUserIn2" type="text" placeholder={users.length ? '' : 'Cerca o sfoglia…'} value={userQ}
                onChange={e => { setUserQ(e.target.value); setUserOpen(true); }}
                onFocus={() => setUserOpen(true)} onBlur={() => setTimeout(() => setUserOpen(false), 150)}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }} />
              {userOpen && (
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
                          <div key={el.id} onMouseDown={() => addUser(el.id)}
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
          <button className="btn-p" onClick={handleSave}>{initialData ? 'Salva modifiche' : 'Crea sistema'}</button>
        </div>
      </div>
    </div>
  );
}

export default function MagiaView({ onOpenMagia, showToast }) {
  const { magie, addMagia } = useWorld();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">✨ <span>Sistemi di Magia</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuovo sistema</button>
      </div>
      {magie.length === 0
        ? <div className="empty"><div className="empty-icon">✨</div><div className="empty-title">Nessun sistema di magia</div><div className="empty-sub">Crea il primo sistema magico del tuo mondo</div></div>
        : <div className="cards-grid">
            {magie.map(m => (
              <div key={m.id} className="card" style={{ borderTop: '3px solid #a0d0c0', cursor: 'pointer' }} onClick={() => onOpenMagia(m.id)}>
                <div className="card-body">
                  <div className="card-type" style={{ color: '#a0d0c0' }}>✨ Sistema di Magia</div>
                  <div className="card-name">{m.name}</div>
                  <div className="card-desc">{m.desc || <em style={{ opacity: .35 }}>Nessuna descrizione</em>}</div>
                  {(m.rules || []).length > 0 && <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>📋 {m.rules.length} regor{m.rules.length !== 1 ? 'e' : 'a'}</div>}
                </div>
              </div>
            ))}
          </div>
      }
      {showModal && <MagiaModal onSave={async (data) => { await addMagia(data); setShowModal(false); showToast('✓ Sistema creato'); }} onClose={() => setShowModal(false)} />}
    </div>
  );
}