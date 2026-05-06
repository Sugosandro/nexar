import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWorld } from '../hooks/useWorld';
import Sidebar from './Sidebar';
import WorldView from '../views/WorldView';
import TimelineView from '../views/TimelineView';
import FazioniView from '../views/FazioniView';
import MagiaView from '../views/MagiaView';
import ArcsView from '../views/ArcsView';
import ConnectionsView from '../views/ConnectionsView';
import MapView from '../views/MapView';
import AnalisiView from '../views/AnalisiView';
import TestiView  from '../views/TestiView';
import DetailPanel from './DetailPanel';
import CatModal from './CatModal';
import Toast from './Toast';
import GlobalSearch from './GlobalSearch';

const VIEWS = [
  { id: 'world',       label: '🌍 Mondo',       component: WorldView },
  { id: 'timeline',    label: '⏳ Timeline',     component: TimelineView },
  { id: 'mappa',       label: '🗺 Mappa',        component: MapView },
  { id: 'fazioni',     label: '⚔ Fazioni',      component: FazioniView },
  { id: 'magia',       label: '✨ Magia',        component: MagiaView },
  { id: 'arcs',        label: '📖 Archi',        component: ArcsView },
  { id: 'connections', label: '🕸 Connessioni',  component: ConnectionsView },
  { id: 'analisi',     label: '🔍 Analisi',      component: AnalisiView },
  { id: 'testi',       label: '📄 Testi',         component: TestiView },
];

export default function AppShell({ user, worldId, worldName, onChangeWorld }) {
  const { signOut } = useAuth();
  const { loading } = useWorld();

  const [curView,     setCurView]     = useState('world');
  const [preloadText, setPreloadText] = useState(null); // testo da caricare in Analisi
  const [panel,       setPanel]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [catModal,    setCatModal]    = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast  = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const openPanel  = (type, id) => setPanel({ type, id });
  const closePanel = () => setPanel(null);

  // Tasto indietro Android/iOS — chiude il pannello invece di uscire
  useEffect(() => {
    if (panel) {
      window.history.pushState({ panel: true }, '');
    }
  }, [panel]);

  useEffect(() => {
    const handlePopState = () => {
      if (panel) closePanel();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [panel]);

  const ActiveView = VIEWS.find(v => v.id === curView)?.component || WorldView;

  return (
    <div className="app-root">
      <header className="app-header">
        <button className="mob-menu-btn" onClick={() => setSidebarOpen(s => !s)} aria-label="Menu">☰</button>
        <div className="logo">Nexar</div>
        <nav className="app-nav">
          {VIEWS.map(v => (
            <button key={v.id} className={curView === v.id ? 'active' : ''}
              onClick={() => { setCurView(v.id); setSidebarOpen(false); }}>
              {v.label}
            </button>
          ))}
        </nav>
        <GlobalSearch onOpen={openPanel} />
        <div className="header-acts">
          <button className="btn-sm" onClick={() => setCatModal(true)}>⚙ Categorie</button>
          <button className="btn-sm" onClick={onChangeWorld}>🌍 {worldName || 'Mondo'}</button>
          <img src={user.photoURL} alt={user.displayName} className="user-avatar"
            title={`${user.displayName} — clicca per uscire`} onClick={signOut} style={{ cursor: 'pointer' }} />
        </div>
      </header>

      {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'mob-open' : ''}`}>
        <Sidebar
          onSelectElement={(id) => { openPanel('element', id); setSidebarOpen(false); }}
          activeId={panel?.type === 'element' ? panel.id : null}
        />
      </aside>

      <div className="app-inner">
        <main className="main">
          {loading ? (
            <div className="view-loading"><span className="spin">✨</span> Caricamento dati…</div>
          ) : (
            <ActiveView
              onOpenElement={(id) => openPanel('element', id)}
              onOpenFazione={(id) => openPanel('fazione', id)}
              onOpenMagia={(id)   => openPanel('magia', id)}
              onOpenArc={(id)     => openPanel('arc', id)}
              showToast={showToast}
              onAnalyze={(textData) => { setPreloadText(textData); setCurView('analisi'); }}
              preloadText={preloadText}
              onPreloadConsumed={() => setPreloadText(null)}
            />
          )}
        </main>

        <DetailPanel
          panel={panel}
          onClose={closePanel}
          onOpen={openPanel}
          showToast={showToast}
        />
      </div>

      {/* Bottom nav mobile */}
      <nav className="mob-nav">
        <div className="mob-nav-inner">
          {VIEWS.map(v => (
            <button key={v.id} className={curView === v.id ? 'active' : ''}
              onClick={() => { setCurView(v.id); setPanel(null); }}>
              {v.label}
            </button>
          ))}
        </div>
      </nav>

      {catModal && <CatModal onClose={() => setCatModal(false)} showToast={showToast} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}