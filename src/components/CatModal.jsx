// src/components/CatModal.jsx
import { useState } from 'react';
import { useWorld, BUILTIN_CATS } from '../hooks/useWorld';

const PALETTE = ['#7ab8d4','#8fbd7c','#d4956a','#b88fc4','#e8a0a8','#a8d4b8','#d4c07a','#c4a0d4','#7ab8a8','#d4a07a','#a0b4d4','#d4b8a0'];

export default function CatModal({ onClose, showToast }) {
  const { cats, addCat, updateCat, deleteCat } = useWorld();

  const [newName,    setNewName]    = useState('');
  const [newIcon,    setNewIcon]    = useState('');
  const [newColor,   setNewColor]   = useState(PALETTE[0]);
  const [subParent,  setSubParent]  = useState('');
  const [subName,    setSubName]    = useState('');

  const allCatsEditable = [...BUILTIN_CATS, ...cats];

  const handleAddCat = async () => {
    if (!newName.trim()) return alert('Inserisci un nome');
    await addCat({
      name: newName.trim(),
      icon: newIcon.trim() || '📁',
      color: newColor,
      colorDim: newColor + '33',
      subs: [],
    });
    setNewName(''); setNewIcon(''); setNewColor(PALETTE[0]);
    showToast('✓ Categoria creata');
  };

  const handleAddSub = async () => {
  if (!subParent) return alert('Seleziona una categoria padre');
  if (!subName.trim()) return alert('Inserisci il nome della sottocategoria');

  const isBuiltin = BUILTIN_CATS.find(c => c.id === subParent);

  if (isBuiltin) {
    // Cerca se esiste già un documento di override per questa built-in
    const override = cats.find(c => c.id === subParent);
    if (override) {
      await updateCat(subParent, { subs: [...(override.subs || []), subName.trim()] });
    } else {
      // Crea documento con stesso id della categoria built-in
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'worlds', wid, 'cats'), {
        id: subParent, // stesso id della built-in
        subs: [subName.trim()],
      });
    }
  } else {
    const cat = cats.find(c => c.id === subParent);
    if (!cat) return;
    await updateCat(subParent, { subs: [...(cat.subs || []), subName.trim()] });
  }

  setSubName('');
  showToast('✓ Sottocategoria aggiunta');
};

  const handleRemoveSub = async (catId, sub) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    await updateCat(catId, { subs: cat.subs.filter(s => s !== sub) });
    showToast('✓ Sottocategoria rimossa');
  };

  const handleDeleteCat = async (catId) => {
    if (!window.confirm('Eliminare questa categoria? Gli elementi che la usano non verranno eliminati ma perderanno la categoria.')) return;
    await deleteCat(catId);
    showToast('🗑 Categoria eliminata');
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 580, maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-title">⚙ Gestione Categorie</div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          Le categorie built-in (Personaggi, Luoghi, Oggetti, Eventi) non possono essere rimosse.
        </p>

        {/* Lista categorie */}
        <div style={{ marginBottom: 20 }}>
          {allCatsEditable.map(cat => (
            <div key={cat.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span style={{ color: cat.color, fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                  {!cat.builtin && (
                    <button className="btn-d" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => handleDeleteCat(cat.id)}>
                      Elimina
                    </button>
                  )}
                  {cat.builtin && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>built-in</span>}
                </span>
              </div>

              {/* Sottocategorie */}
              {(cat.subs || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {cat.subs.map(sub => (
                    <span key={sub} style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sub}
                      {!cat.builtin && (
                        <span style={{ cursor: 'pointer', opacity: .5, fontSize: 13 }} onClick={() => handleRemoveSub(cat.id, sub)}>×</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Nuova categoria */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, marginBottom: 14 }}>
          <div className="dp-lbl" style={{ marginBottom: 10 }}>Nuova categoria</div>
          <div className="frow">
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Nome</label>
              <input className="fi" style={{ marginBottom: 0 }} placeholder="Es. Creature" value={newName} onChange={e => setNewName(e.target.value)} autoComplete="off" />
            </div>
            <div className="fg" style={{ margin: 0 }}>
  <label className="fl">Icona</label>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
    {['👤','📍','📦','⚡','🐉','👁','⚔','🏰','🌿','💀','🔮','📜','🗡','🛡','🐺','🦅','💎','🔥','❄','⚡','🌊','🌙','☀','🎭','🧙','🏔','🌋','🗺','🚢','🏛','🌾','🍄','🐴','🦁','🐍','🦋','🌹','🍷','🪄','⚗'].map(emoji => (
      <button
        key={emoji}
        type="button"
        onClick={() => setNewIcon(emoji)}
        style={{
          width: 32, height: 32,
          background: newIcon === emoji ? 'var(--surface3)' : 'var(--surface2)',
          border: `1px solid ${newIcon === emoji ? 'var(--gold-dim)' : 'var(--border)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
      >
        {emoji}
      </button>
    ))}
  </div>
  {newIcon && (
    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
      Selezionata: <span style={{ fontSize: 16 }}>{newIcon}</span>
      <button onClick={() => setNewIcon('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, marginLeft: 6 }}>✕ rimuovi</button>
    </div>
  )}
</div>
          </div>
          <div style={{ marginTop: 10, marginBottom: 12 }}>
            <label className="fl">Colore</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => setNewColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? '2px solid var(--text)' : '2px solid transparent', transition: 'transform .15s', transform: newColor === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-p" onClick={handleAddCat}>+ Crea categoria</button>
          </div>
        </div>

        {/* Aggiungi sottocategoria */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
          <div className="dp-lbl" style={{ marginBottom: 10 }}>Aggiungi sottocategoria</div>
          <div className="frow">
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Categoria padre</label>
              <select className="fs" style={{ marginBottom: 0 }} value={subParent} onChange={e => setSubParent(e.target.value)}>
                <option value="">— Seleziona —</option>
                {allCatsEditable.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Nome sottocategoria</label>
              <input className="fi" style={{ marginBottom: 0 }} placeholder="Es. Eroi, Villain…" value={subName} onChange={e => setSubName(e.target.value)} autoComplete="off"
                onKeyDown={e => e.key === 'Enter' && handleAddSub()} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn-p" onClick={handleAddSub}>+ Aggiungi</button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}