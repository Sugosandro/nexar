import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import ArcModal from '../components/ArcModal';

export default function ArcsView({ onOpenArc, showToast }) {
  const { t } = useTranslation();
  const { arcs, addArc } = useWorld();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">📖 <span>{t('nav.arcs')}</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>{t('arcv.new_btn')}</button>
      </div>
      {arcs.length === 0
        ? <div className="empty"><div className="empty-icon">📖</div><div className="empty-title">{t('arcv.empty_title')}</div><div className="empty-sub">{t('arcv.empty_sub')}</div></div>
        : <div className="cards-grid">
            {arcs.map(arc => (
              <div key={arc.id} className="card" style={{ borderTop: '3px solid var(--arc)', cursor: 'pointer' }} onClick={() => onOpenArc(arc.id)}>
                <div className="card-body">
                  <div className="card-type" style={{ color: 'var(--arc)' }}>{t('dp.arc_type')}</div>
                  <div className="card-name">{arc.name}</div>
                  <div className="card-desc">{arc.desc || <em style={{ opacity: .35 }}>{t('card.no_desc')}</em>}</div>
                  {arc.currentPhase && <div style={{ marginTop: 6, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--arc-dim)', color: 'var(--arc)', display: 'inline-block' }}>▸ {arc.currentPhase}</div>}
                  {(arc.members || []).length > 0 && <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-muted)' }}>{t('arcv.members', { count: arc.members.length })}</div>}
                </div>
              </div>
            ))}
          </div>
      }
      {showModal && (
        <ArcModal
          onSave={async (data) => { await addArc(data); setShowModal(false); showToast(t('arcv.toast_created')); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
