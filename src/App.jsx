import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { WorldProvider } from './hooks/useWorld.jsx';
import LoginPage from './components/LoginPage';
import WorldSelector from './components/WorldSelector';
import AppShell from './components/AppShell';
import './styles/globals.css';

export default function App() {
  const { user, loading } = useAuth();
  const [activeWorldId, setActiveWorldId] = useState(null);
  const [activeWorldName, setActiveWorldName] = useState('');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">Nex<span>ar</span></div>
        <div className="loading-spinner">✨</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!activeWorldId) {
    return (
      <WorldSelector
  user={user}
  onSelectWorld={(id, name) => { setActiveWorldId(id); setActiveWorldName(name); }}
/>
    );
  }

  return (
    <WorldProvider uid={user.uid} wid={activeWorldId}>
      <AppShell
  user={user}
  worldId={activeWorldId}
  worldName={activeWorldName}
  onChangeWorld={() => { setActiveWorldId(null); setActiveWorldName(''); }}
/>
    </WorldProvider>
  );
}