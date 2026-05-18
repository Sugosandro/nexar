import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import TestiView   from '../views/TestiView';
import EditorView    from '../views/EditorView';
import SessioniView  from '../views/SessioniView';
import FiliView      from '../views/FiliView';
import RumorsView    from '../views/RumorsView';
import HandoutView   from '../views/HandoutView';
import TavoleView   from '../views/TavoleView';
import DetailPanel from './DetailPanel';
import CatModal from './CatModal';
import Toast from './Toast';
import GlobalSearch from './GlobalSearch';
import InitiativeTracker from './InitiativeTracker';
import SettingsModal from './SettingsModal';
import ViewHint from './ViewHint';
import OnboardingModal from './OnboardingModal';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getViewTour, hasViewTour } from '../tours/viewTours';

const VIEWS = [
  { id: 'world',       icon: '🌍', labelKey: 'nav.world',       component: WorldView },
  { id: 'timeline',    icon: '⏳', labelKey: 'nav.timeline',    component: TimelineView },
  { id: 'mappa',       icon: '🗺', labelKey: 'nav.map',         component: MapView },
  { id: 'fazioni',     icon: '⚔', labelKey: 'nav.factions',    component: FazioniView },
  { id: 'magia',       icon: '✨', labelKey: 'nav.magic',       component: MagiaView },
  { id: 'arcs',        icon: '📖', labelKey: 'nav.arcs',        component: ArcsView },
  { id: 'connections', icon: '🕸', labelKey: 'nav.connections', component: ConnectionsView },
  { id: 'analisi',     icon: '🔍', labelKey: 'nav.analysis',    component: AnalisiView },
  { id: 'testi',       icon: '📄', labelKey: 'nav.texts',       component: TestiView },
  { id: 'editor',      icon: '✍', labelKey: 'nav.editor',      component: EditorView },
  { id: 'sessioni',    icon: '🎲', labelKey: 'nav.sessions',    component: SessioniView },
  { id: 'fili',        icon: '🔀', labelKey: 'nav.threads',     component: FiliView },
  { id: 'rumors',      icon: '💬', labelKey: 'nav.rumors',      component: RumorsView },
  { id: 'handout',     icon: '📜', labelKey: 'nav.handout',     component: HandoutView },
  { id: 'tavole',     icon: '🎲', labelKey: 'nav.tavole',      component: TavoleView },
];

const VIEWS_META = VIEWS.map(({ id, icon, labelKey }) => ({ id, icon, labelKey }));

function loadViewsConfig() {
  try {
    const raw = localStorage.getItem('nexar-views-config');
    if (!raw) return VIEWS.map(v => ({ id: v.id, visible: true }));
    const saved = JSON.parse(raw);
    const savedIds = saved.map(s => s.id).filter(id => VIEWS.find(v => v.id === id));
    const ordered  = savedIds.map(id => ({ id, visible: saved.find(s => s.id === id)?.visible ?? true }));
    const newOnes  = VIEWS.filter(v => !savedIds.includes(v.id)).map(v => ({ id: v.id, visible: true }));
    return [...ordered, ...newOnes];
  } catch {
    return VIEWS.map(v => ({ id: v.id, visible: true }));
  }
}

function buildDriverInstance(steps, t) {
  return driver({
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done'),
    overlayColor: 'rgba(0,0,0,.75)',
    stagePadding: 8,
    stageRadius: 6,
    steps,
  });
}

function safeSteps(rawSteps) {
  return rawSteps.map(step => {
    if (!step.element) return step;
    if (!document.querySelector(step.element)) return { popover: step.popover };
    return step;
  });
}

export default function AppShell({ user, worldId, worldName, onChangeWorld }) {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const { loading } = useWorld();

  const [curView,        setCurView]        = useState('world');
  const [preloadText,    setPreloadText]    = useState(null);
  const [panel,          setPanel]          = useState(null);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [catModal,       setCatModal]       = useState(false);
  const [initOpen,       setInitOpen]       = useState(false);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [toast,          setToast]          = useState(null);
  const [viewsConfig,    setViewsConfig]    = useState(loadViewsConfig);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('nexar-onboarding-done'));

  const handleViewsConfigChange = (newConfig) => {
    setViewsConfig(newConfig);
    localStorage.setItem('nexar-views-config', JSON.stringify(newConfig));
  };

  const startTour = useCallback(() => {
    const driverObj = buildDriverInstance([
      { element: '.logo',            popover: { title: t('tour.s1_title'), description: t('tour.s1_desc'), side: 'bottom', align: 'start' } },
      { element: '#tour-nav',        popover: { title: t('tour.s2_title'), description: t('tour.s2_desc'), side: 'bottom' } },
      { element: '#tour-categories', popover: { title: t('tour.s3_title'), description: t('tour.s3_desc'), side: 'bottom' } },
      { element: '#tour-initiative', popover: { title: t('tour.s4_title'), description: t('tour.s4_desc'), side: 'bottom' } },
      { element: '#tour-settings',   popover: { title: t('tour.s5_title'), description: t('tour.s5_desc'), side: 'bottom' } },
      { element: '#tour-sidebar',    popover: { title: t('tour.s6_title'), description: t('tour.s6_desc'), side: 'right', align: 'start' } },
    ], t);
    driverObj.drive();
  }, [t]);

  const startViewTour = useCallback((viewId) => {
    const rawSteps = getViewTour(viewId, i18n.language);
    if (!rawSteps?.length) return;
    const driverObj = buildDriverInstance(safeSteps(rawSteps), t);
    driverObj.drive();
  }, [t, i18n.language]);

  // Auto-trigger per-view tour on first visit
  useEffect(() => {
    if (loading) return;
    const key = `nexar-tour-view-${curView}`;
    if (localStorage.getItem(key)) return;
    if (!hasViewTour(curView)) return;
    localStorage.setItem(key, '1');
    const timer = setTimeout(() => startViewTour(curView), 700);
    return () => clearTimeout(timer);
  }, [curView, loading, startViewTour]);

  const orderedViews = viewsConfig
    .filter(vc => vc.visible)
    .map(vc => VIEWS.find(v => v.id === vc.id))
    .filter(Boolean);

  const showToast  = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const openPanel  = (type, id) => setPanel({ type, id });
  const closePanel = () => setPanel(null);

  useEffect(() => {
    if (panel) window.history.pushState({ panel: true }, '');
  }, [panel]);

  useEffect(() => {
    const handlePopState = () => { if (panel) closePanel(); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [panel]);

  const ActiveView = VIEWS.find(v => v.id === curView)?.component || WorldView;

  return (
    <div className="app-root">
      <header className="app-header">
        <button className="mob-menu-btn" onClick={() => setSidebarOpen(s => !s)} aria-label="Menu">☰</button>
        <div className="logo">Nexar</div>
        <button id="tour-categories" className="mob-hide"
          onClick={() => setCatModal(true)}
          style={{
            flexShrink: 0, padding: '5px 13px', fontSize: 13, cursor: 'pointer',
            fontFamily: "'Crimson Pro', serif", fontWeight: 600, letterSpacing: '.3px',
            background: 'var(--gold-glow)', border: '1px solid var(--gold-dim)',
            color: 'var(--gold)', borderRadius: 'var(--r)', transition: 'all .15s',
            whiteSpace: 'nowrap',
          }}>
          {t('header.categories_btn')}
        </button>
        <nav id="tour-nav" className="app-nav">
          {orderedViews.map(v => (
            <button key={v.id} className={curView === v.id ? 'active' : ''}
              onClick={() => { setCurView(v.id); setSidebarOpen(false); }}>
              {v.icon} {t(v.labelKey)}
            </button>
          ))}
        </nav>
        <ViewHint
          viewId={curView}
          onReplayTour={hasViewTour(curView) ? () => startViewTour(curView) : undefined}
        />
        <GlobalSearch onOpen={openPanel} />
        <div className="header-acts">
          <button id="tour-settings" className="btn-sm mob-hide" onClick={() => setSettingsOpen(true)} title={t('settings.title')}>⚙</button>
          <button id="tour-initiative" className="mob-hide"
            onClick={() => setInitOpen(v => !v)}
            style={{
              flexShrink: 0, padding: '5px 13px', fontSize: 13, cursor: 'pointer',
              fontFamily: "'Crimson Pro', serif", fontWeight: 600, letterSpacing: '.3px',
              background: initOpen ? 'rgba(200,50,50,.25)' : 'rgba(200,50,50,.12)',
              border: `1px solid ${initOpen ? 'rgba(220,80,80,.7)' : 'rgba(200,50,50,.35)'}`,
              color: initOpen ? '#e07070' : '#c07070',
              borderRadius: 'var(--r)', transition: 'all .15s', whiteSpace: 'nowrap',
            }}>
            ⚔ {t('init.title')}
          </button>
          <button className="btn-sm" onClick={onChangeWorld}>🌍 {worldName || t('nav.world')}</button>
          <img src={user.photoURL} alt={user.displayName} className="user-avatar"
            title={t('header.user_tooltip', { name: user.displayName })} onClick={signOut} style={{ cursor: 'pointer' }} />
        </div>
      </header>

      {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside id="tour-sidebar" className={`sidebar ${sidebarOpen ? 'mob-open' : ''}`}>
        <Sidebar
          onSelectElement={(id) => { openPanel('element', id); setSidebarOpen(false); }}
          activeId={panel?.type === 'element' ? panel.id : null}
          onCatModal={() => { setCatModal(true); setSidebarOpen(false); }}
          onInitOpen={() => { setInitOpen(v => !v); setSidebarOpen(false); }}
          onSettingsOpen={() => { setSettingsOpen(true); setSidebarOpen(false); }}
          initOpen={initOpen}
        />
      </aside>

      <div className="app-inner">
        <main className="main">
          {loading ? (
            <div className="view-loading"><span className="spin">✨</span> {t('header.loading')}</div>
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
          {orderedViews.map(v => (
            <button key={v.id} className={curView === v.id ? 'active' : ''}
              onClick={() => { setCurView(v.id); setPanel(null); }}>
              {v.icon} {t(v.labelKey)}
            </button>
          ))}
        </div>
      </nav>

      {catModal && <CatModal onClose={() => setCatModal(false)} showToast={showToast} />}
      <InitiativeTracker open={initOpen} onClose={() => setInitOpen(false)} />
      {settingsOpen && (
        <SettingsModal
          views={VIEWS_META}
          viewsConfig={viewsConfig}
          onViewsConfigChange={handleViewsConfigChange}
          onClose={() => setSettingsOpen(false)}
          onStartTour={() => { setSettingsOpen(false); setTimeout(startTour, 150); }}
        />
      )}
      {toast && <Toast message={toast} />}
      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onStartTour={startTour}
        />
      )}
    </div>
  );
}
