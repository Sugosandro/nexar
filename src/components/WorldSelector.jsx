import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getWorlds, createWorld } from '../firebase/db';

export default function WorldSelector({ user, onSelectWorld }) {
  const { signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [worlds,     setWorlds]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState('');
  const [showCreate, setShowCreate] = useState(false);

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
        <div className="login-logo">Nexar</div>
        <div className="ws-user">
          <img src={user.photoURL} alt={user.displayName} className="ws-avatar" />
          <span>{user.displayName}</span>
          <button className="btn-link" onClick={signOut}>{t('ws.sign_out')}</button>
        </div>
      </header>

      <main className="ws-main">
        <h1 className="ws-title">{t('ws.title')}</h1>

        {loading ? (
          <div className="ws-loading">{t('ws.loading')}</div>
        ) : (
          <>
            <div className="ws-grid">
              {worlds.map(w => (
                <button key={w.id} className="ws-card" onClick={() => onSelectWorld(w.id, w.name)}>
                  <div className="ws-card-icon">🌍</div>
                  <div className="ws-card-name">{w.name}</div>
                  <div className="ws-card-meta">
                    {w.updatedAt?.toDate
                      ? t('ws.updated', { date: w.updatedAt.toDate().toLocaleDateString(i18n.language) })
                      : t('ws.new_world')}
                  </div>
                </button>
              ))}

              <button className="ws-card ws-card-new" onClick={() => setShowCreate(true)}>
                <div className="ws-card-icon">+</div>
                <div className="ws-card-name">{t('ws.new_world')}</div>
              </button>
            </div>

            {showCreate && (
              <div className="ws-create-form">
                <input
                  className="fi"
                  placeholder={t('ws.placeholder')}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <div className="ws-create-actions">
                  <button className="btn-g" onClick={() => setShowCreate(false)}>{t('ws.cancel')}</button>
                  <button className="btn-p" onClick={handleCreate} disabled={creating || !newName.trim()}>
                    {creating ? t('ws.creating') : t('ws.create')}
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
