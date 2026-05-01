import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';

function ArcModal({ initialData = null, onSave, onClose }) {
  const { elements } = useWorld();
  const [name,     setName]     = useState(initialData?.name         || '');
  const [desc,     setDesc]     = useState(initialData?.desc         || '');
  const [phases,   setPhases]   = useState((initialData?.phases || []).join(', '));
  const [curPhase, setCurPhase] = useState(initialData?.currentPhase || '');
  const [members,  setMembers]  = useState(initialData?.members      || []);
  const [memQ,     setMemQ]     = useState('');
  const [memOpen,  setMemOpen]  = useState(false);

  const suggestions  = memQ ? elements.filter(e => !members.includes(e.id) && e.name.toLowerCase().includes(memQ.toLowerCase())).slice(0, 6) : [];
  const addMember    = (id) => { setMembers(p => [...p, id]); setMemQ(''); setMemOpen(false); };
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
          <div onClick={() => document.getElementById('arcMemIn2').focus()}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 9px', display: 'flex', flexWrap: 'wrap', gap: 5, cursor: 'text' }}>
            {members.map(id => { const el = elements.find(e => e.id === id); if (!el) return null;
              return <span key={id} style={{ background: 'var(--surface3)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {el.name}<span style={{ cursor: 'pointer', opacity: .6, fontSize: 14 }} onClick={e => { e.stopPropagation(); removeMember(id); }}>×</span></span>; })}
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input id="arcMemIn2" type="text" placeholder={members.length ? '' : 'Cerca elemento…'} value={memQ}
                onChange={e => { setMemQ(e.target.value); setMemOpen(true); }}
                onFocus={() => setMemOpen(true)} onBlur={() => setTimeout(() => setMemOpen(false), 150)}
                autoComplete="off"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, width: '100%' }} />
              {memOpen && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', zIndex: 700 }}>
                  {suggestions.map(el => <div key={el.id} onMouseDown={() => addMember(el.id)}
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
          <button className="btn-p" onClick={handleSave}>{initialData ? 'Salva modifiche' : 'Crea arco'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ArcsView({ onOpenArc, showToast }) {
  const { arcs, addArc } = useWorld();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">📖 <span>Archi Narrativi</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>+ Nuovo arco</button>
      </div>
      {arcs.length === 0
        ? <div className="empty"><div className="empty-icon">📖</div><div className="empty-title">Nessun arco narrativo</div><div className="empty-sub">Crea il primo filo narrativo del tuo mondo</div></div>
        : <div className="cards-grid">
            {arcs.map(arc => (
              <div key={arc.id} className="card" style={{ borderTop: '3px solid var(--arc)', cursor: 'pointer' }} onClick={() => onOpenArc(arc.id)}>
                <div className="card-body">
                  <div className="card-type" style={{ color: 'var(--arc)' }}>📖 Arco Narrativo</div>
                  <div className="card-name">{arc.name}</div>
                  <div className="card-desc">{arc.desc || <em style={{ opacity: .35 }}>Nessuna descrizione</em>}</div>
                  {arc.currentPhase && <div style={{ marginTop: 6, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--arc-dim)', color: 'var(--arc)', display: 'inline-block' }}>▸ {arc.currentPhase}</div>}
                  {(arc.members || []).length > 0 && <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-muted)' }}>👥 {arc.members.length} element{arc.members.length !== 1 ? 'i' : 'o'}</div>}
                </div>
              </div>
            ))}
          </div>
      }
      {showModal && <ArcModal onSave={async (data) => { await addArc(data); setShowModal(false); showToast('✓ Arco creato'); }} onClose={() => setShowModal(false)} />}
    </div>
  );
}