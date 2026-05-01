import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

export default function MagiaModal({ initialData = null, onSave, onClose }) {
  const { elements } = useWorld();
  const [name,  setName]  = useState(initialData?.name  || '');
  const [desc,  setDesc]  = useState(initialData?.desc  || '');
  const [rules, setRules] = useState((initialData?.rules || []).join('\n'));
  const [users, setUsers] = useState(initialData?.users || []);
  const [userQ, setUserQ] = useState('');
  const [userOpen, setUserOpen] = useState(false);

  const suggestions = userQ ? elements.filter(e => !users.includes(e.id) && e.name.toLowerCase().includes(userQ.toLowerCase())).slice(0, 6) : [];
  const addUser    = (id) => { setUsers(p => [...p, id]); setUserQ(''); setUserOpen(false); };
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
          <div onClick={() => document.getElementById('mUserIn').focus()}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {users.map(id => { const el = elements.find(e => e.id === id); if (!el) return null;
              return <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}<span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeUser(id); }}>×</span></span>; })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input id="mUserIn" type="text" placeholder={users.length ? '' : 'Cerca elemento…'} value={userQ}
                onChange={e => { setUserQ(e.target.value); setUserOpen(true); }}
                onFocus={() => setUserOpen(true)} onBlur={() => setTimeout(() => setUserOpen(false), 150)}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }} />
              {userOpen && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700 }}>
                  {suggestions.map(el => <div key={el.id} onMouseDown={() => addUser(el.id)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>{el.name}</div>)}
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