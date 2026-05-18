import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function Toggle({ on, onToggle, disabled }) {
  return (
    <div onClick={disabled ? undefined : onToggle}
      title={disabled ? undefined : undefined}
      style={{
        width: 38, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? 'var(--gold-dim)' : 'var(--surface3)',
        border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .2s, border-color .2s',
        opacity: disabled ? .4 : 1,
      }}>
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 'calc(100% - 17px)' : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: on ? 'var(--gold)' : 'var(--text-muted)',
        transition: 'left .2s, background .2s',
      }} />
    </div>
  );
}

export default function SettingsModal({ views, viewsConfig, onViewsConfigChange, onClose, onStartTour }) {
  const { t, i18n } = useTranslation();
  const [localConfig, setLocalConfig] = useState(viewsConfig);
  const [draggingId,  setDraggingId]  = useState(null);
  const [dragOverId,  setDragOverId]  = useState(null);

  const apply = (newConfig) => {
    setLocalConfig(newConfig);
    onViewsConfigChange(newConfig);
  };

  const toggleLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('nexar-lang', code);
  };

  const toggleVisible = (id) => {
    const visibleCount = localConfig.filter(v => v.visible).length;
    const item = localConfig.find(v => v.id === id);
    if (item.visible && visibleCount <= 1) return;
    apply(localConfig.map(v => v.id === id ? { ...v, visible: !v.visible } : v));
  };

  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggingId) setDragOverId(id);
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const next = [...localConfig];
    const from = next.findIndex(v => v.id === draggingId);
    const to   = next.findIndex(v => v.id === targetId);
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    apply(next);
    setDraggingId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDraggingId(null); setDragOverId(null); };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 500 }}>
        <div className="modal-title">⚙ {t('settings.title')}</div>

        {/* Lingua */}
        <div className="fg">
          <label className="fl">{t('settings.lang_lbl')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ code: 'it', label: '🇮🇹 Italiano' }, { code: 'en', label: '🇬🇧 English' }].map(l => (
              <button key={l.code} type="button" onClick={() => toggleLang(l.code)}
                style={{
                  flex: 1, padding: '9px 12px', fontSize: 14, cursor: 'pointer',
                  fontFamily: "'Crimson Pro', serif",
                  background: i18n.language === l.code ? 'var(--gold-glow)' : 'var(--surface2)',
                  border: `1px solid ${i18n.language === l.code ? 'var(--gold-dim)' : 'var(--border)'}`,
                  color: i18n.language === l.code ? 'var(--gold)' : 'var(--text-muted)',
                  borderRadius: 'var(--r)', transition: 'all .15s',
                }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tour guidato */}
        {onStartTour && (
          <div className="fg">
            <button type="button" onClick={onStartTour} style={{
              width: '100%', padding: '9px 12px', fontSize: 14, cursor: 'pointer',
              fontFamily: "'Crimson Pro', serif",
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 'var(--r)',
              transition: 'all .15s', textAlign: 'left',
            }}>
              {t('ob.tour_restart')}
            </button>
          </div>
        )}

        {/* Viste */}
        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="fl">{t('settings.views_lbl')}</label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>
            {t('settings.views_hint')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {localConfig.map(vc => {
              const view      = views.find(v => v.id === vc.id);
              if (!view) return null;
              const isDragging = draggingId === vc.id;
              const isDragOver = dragOverId === vc.id;
              const isLastVisible = vc.visible && localConfig.filter(v => v.visible).length === 1;
              return (
                <div key={vc.id}
                  draggable
                  onDragStart={e => handleDragStart(e, vc.id)}
                  onDragOver={e => handleDragOver(e, vc.id)}
                  onDrop={e => handleDrop(e, vc.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px',
                    background: isDragOver ? 'var(--gold-glow)' : 'var(--surface2)',
                    border: `1px solid ${isDragOver ? 'var(--gold-dim)' : 'var(--border)'}`,
                    borderRadius: 'var(--r)',
                    opacity: isDragging ? .35 : vc.visible ? 1 : .5,
                    cursor: 'grab',
                    transition: 'background .1s, border-color .1s, opacity .1s',
                    userSelect: 'none',
                  }}>
                  <span style={{ color: 'var(--border-light)', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>⠿</span>
                  <span style={{ fontSize: 17, flexShrink: 0 }}>{view.icon}</span>
                  <span style={{ flex: 1, fontSize: 15, color: vc.visible ? 'var(--text)' : 'var(--text-muted)', fontFamily: "'Crimson Pro', serif" }}>
                    {t(view.labelKey)}
                  </span>
                  <Toggle on={vc.visible} onToggle={() => toggleVisible(vc.id)} disabled={isLastVisible} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-p" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}
