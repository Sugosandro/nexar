import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import MagiaModal from '../components/MagiaModal';

export default function MagiaView({ onOpenMagia, showToast }) {
  const { t } = useTranslation();
  const { magie, addMagia } = useWorld();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">✨ <span>{t('nav.magic')}</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>{t('magv.new_btn')}</button>
      </div>
      {magie.length === 0
        ? <div className="empty"><div className="empty-icon">✨</div><div className="empty-title">{t('magv.empty_title')}</div><div className="empty-sub">{t('magv.empty_sub')}</div></div>
        : <div className="cards-grid">
            {magie.map(m => (
              <div key={m.id} className="card" style={{ borderTop: '3px solid #a0d0c0', cursor: 'pointer' }} onClick={() => onOpenMagia(m.id)}>
                <div className="card-body">
                  <div className="card-type" style={{ color: '#a0d0c0' }}>{t('dp.mag_type')}</div>
                  <div className="card-name">{m.name}</div>
                  <div className="card-desc">{m.desc || <em style={{ opacity: .35 }}>{t('card.no_desc')}</em>}</div>
                  {(m.rules || []).length > 0 && <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>{t('magv.rules', { count: m.rules.length })}</div>}
                </div>
              </div>
            ))}
          </div>
      }
      {showModal && (
        <MagiaModal
          onSave={async (data) => { await addMagia(data); setShowModal(false); showToast(t('magv.toast_created')); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
