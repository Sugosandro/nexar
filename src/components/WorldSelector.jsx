// src/components/WorldSelector.jsx
// ─────────────────────────────────────────────
// Schermata di selezione/creazione mondi.
// Mostrata dopo il login, prima di entrare nell'app.
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getWorlds, createWorld } from '../firebase/db';

export default function WorldSelector({ user, onSelectWorld }) {
  const { signOut } = useAuth();
  const [worlds,      setWorlds]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [showCreate,  setShowCreate]  = useState(false);

  // Carica i mondi dell'utente
  useEffect(() => {
    getWorlds(user.uid).then(data => {
      setWorlds(data);
      setLoading(false);
    });
  }, [user.uid]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const wid = await createWorld(user.uid, newName.trim());
    onSelectWorld(wid, newName.trim());
  };

  return (
    <div className="world-selector-page">
      <header className="ws-header">
        <div className="login-logo">Story<span>World</span></div>
        <div className="ws-user">
          <img src={user.photoURL} alt={user.displayName} className="ws-avatar" />
          <span>{user.displayName}</span>
          <button className="btn-link" onClick={signOut}>Esci</button>
        </div>
      </header>

      <main className="ws-main">
        <h1 className="ws-title">I tuoi mondi</h1>

        {loading ? (
          <div className="ws-loading">Caricamento…</div>
        ) : (
          <>
            <div className="ws-grid">
              {worlds.map(w => (
                <button
                  key={w.id}
                  className="ws-card"
                  onClick={() => onSelectWorld(w.id, w.name)}
                >
                  <div className="ws-card-icon">🌍</div>
                  <div className="ws-card-name">{w.name}</div>
                  <div className="ws-card-meta">
                    {w.updatedAt?.toDate
                      ? `Modificato ${w.updatedAt.toDate().toLocaleDateString('it-IT')}`
                      : 'Nuovo mondo'}
                  </div>
                </button>
              ))}

              {/* Card "Nuovo mondo" */}
              <button
                className="ws-card ws-card-new"
                onClick={() => setShowCreate(true)}
              >
                <div className="ws-card-icon">+</div>
                <div className="ws-card-name">Nuovo mondo</div>
              </button>
            </div>

            {/* Form creazione */}
            {showCreate && (
              <div className="ws-create-form">
                <input
                  className="fi"
                  placeholder="Nome del mondo…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <div className="ws-create-actions">
                  <button className="btn-g" onClick={() => setShowCreate(false)}>Annulla</button>
                  <button className="btn-p" onClick={handleCreate} disabled={creating || !newName.trim()}>
                    {creating ? 'Creazione…' : 'Crea mondo'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
