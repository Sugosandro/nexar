import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import FazioneModal from '../components/FazioneModal';

function FazioneCard({ fazione, onOpen, depth = 0 }) {
  const { t } = useTranslation();
  const { elements, fazioni } = useWorld();
  const [cardOpen, setCardOpen] = useState(true);
  const [treeOpen, setTreeOpen] = useState(true);
  const members  = (fazione.members || []).map(id => elements.find(e => e.id === id)).filter(Boolean);
  const children = fazioni.filter(f => f.parentId === fazione.id);

  return (
    <div style={{ marginLeft: depth * 20, marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        <button
          onClick={() => setTreeOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: children.length ? 'var(--text-muted)' : 'transparent', cursor: children.length ? 'pointer' : 'default', fontSize: 10, padding: '0 6px', flexShrink: 0, marginTop: 13, width: 22 }}>
          {children.length > 0 ? (treeOpen ? '▼' : '▶') : ''}
        </button>

        <div className="card" style={{ borderTop: '3px solid #f0c060', flex: 1 }}>
          <div
            onClick={() => setCardOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: cardOpen ? '10px 14px 4px' : '10px 14px', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{cardOpen ? '▾' : '▸'}</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', flex: 1 }}>{fazione.name}</span>
            {children.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: .6 }}>
                {t('fazv.subfactions', { count: children.length })}
              </span>
            )}
          </div>

          {cardOpen && (
            <div className="card-body" style={{ paddingTop: 4 }}>
              <div className="card-type" style={{ color: '#f0c060' }}>{t('dp.faz_type')}</div>
              {fazione.motto && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>"{fazione.motto}"</div>}
              <div className="card-desc">{fazione.desc || <em style={{ opacity: .35 }}>{t('card.no_desc')}</em>}</div>
              {members.length > 0 && (
                <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {members.map(m => <span key={m.id} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--char-dim)', color: 'var(--char)' }}>👤 {m.name}</span>)}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <button className="btn-g" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => onOpen(fazione.id)}>
                  {t('dp.open_card')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {treeOpen && children.map(child => (
        <FazioneCard key={child.id} fazione={child} onOpen={onOpen} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FazioniView({ onOpenFazione, showToast }) {
  const { t } = useTranslation();
  const { fazioni, addFazione } = useWorld();
  const [showModal, setShowModal] = useState(false);
  const rootFazioni = fazioni.filter(f => !f.parentId);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">⚔ <span>{t('nav.factions')}</span></div>
        <button className="btn-p" onClick={() => setShowModal(true)}>{t('fazv.new_btn')}</button>
      </div>
      {fazioni.length === 0
        ? <div className="empty"><div className="empty-icon">⚔</div><div className="empty-title">{t('fazv.empty_title')}</div><div className="empty-sub">{t('fazv.empty_sub')}</div></div>
        : rootFazioni.map(f => <FazioneCard key={f.id} fazione={f} onOpen={onOpenFazione} />)
      }
      {showModal && (
        <FazioneModal
          onSave={async (data) => { await addFazione(data); setShowModal(false); showToast(t('fazv.toast_created')); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
