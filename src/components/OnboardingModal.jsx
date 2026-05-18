import { useTranslation } from 'react-i18next';

const FEATURES = [
  { icon: '🌍', key: 'f1' },
  { icon: '⏳', key: 'f2' },
  { icon: '🗺', key: 'f3' },
  { icon: '⚔', key: 'f4' },
  { icon: '🎲', key: 'f5' },
];

export default function OnboardingModal({ onClose, onStartTour }) {
  const { t } = useTranslation();

  const close = () => {
    localStorage.setItem('nexar-onboarding-done', '1');
    onClose();
  };

  const tour = () => {
    localStorage.setItem('nexar-onboarding-done', '1');
    onClose();
    setTimeout(onStartTour, 150);
  };

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✨</div>
          <h2 style={{ margin: 0, fontFamily: "'Crimson Pro', serif", fontSize: 24, color: 'var(--text)' }}>
            {t('ob.title')}
          </h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {t('ob.subtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {FEATURES.map((f, i) => (
            <div key={f.key}
              style={{
                gridColumn: i === 4 ? '1 / -1' : undefined,
                padding: '14px 16px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
              <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: "'Crimson Pro', serif", marginBottom: 3 }}>
                  {t(`ob.${f.key}_title`)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {t(`ob.${f.key}_desc`)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-p" onClick={tour} style={{ padding: '11px', fontSize: 14 }}>
            {t('ob.tour_btn')}
          </button>
          <button onClick={close} style={{
            padding: '9px', fontSize: 13, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 'var(--r)', transition: 'all .15s',
          }}>
            {t('ob.skip_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
