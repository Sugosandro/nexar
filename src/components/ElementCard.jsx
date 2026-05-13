import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

const STATUS_CLASSES = { draft: 'status-draft', wip: 'status-wip', done: 'status-done' };
const IMP_STARS = { principale: '⭐⭐⭐', primario: '⭐⭐', secondario: '⭐' };

export default function ElementCard({ element: el, onClick }) {
  const { t } = useTranslation();
  const { elColor, elIcon, elLabel, arcsByMember, fazioniOfEl, magieOfEl } = useWorld();

  const color = elColor(el);
  const arcs  = arcsByMember(el.id);
  const faz   = fazioniOfEl(el.id);
  const mag   = magieOfEl(el.id);

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }} onClick={onClick}>
      {el.image
        ? <img className="card-img" src={el.image} alt="" />
        : <div className="card-img-ph">{elIcon(el)}</div>
      }

      <div className="card-body">
        <div className="card-type" style={{ color }}>{elIcon(el)} {elLabel(el)}</div>
        <div className="card-name">{el.name}</div>
        <div className="card-desc">
          {el.desc || <em style={{ opacity: .35 }}>{t('card.no_desc')}</em>}
        </div>

        {arcs.map(a => (
          <div key={a.id} className="card-arc">📖 {a.name}</div>
        ))}
        {faz.map(f => (
          <div key={f.id} className="card-arc" style={{ background: '#4a3810', color: '#f0c060' }}>
            ⚔ {f.name}
          </div>
        ))}
        {mag.map(m => (
          <div key={m.id} className="card-arc" style={{ background: '#1a3830', color: '#a0d0c0' }}>
            ✨ {m.name}
          </div>
        ))}
        {(el.powers || []).length > 0 && (
          <div className="card-arc" style={{ background: '#2a1a3a', color: '#c4a0e4' }}>
            {t('card.powers', { count: el.powers.length })}
          </div>
        )}
        {el.importance && el.importance !== 'minore' && IMP_STARS[el.importance] && (
          <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>
            {IMP_STARS[el.importance]} {t('importance.' + el.importance)}
          </div>
        )}
        {el.status && el.status !== 'draft' && (
          <span className={`status-badge ${STATUS_CLASSES[el.status] || ''}`} style={{ marginTop: 5 }}>
            {t('status.' + el.status, { defaultValue: el.status })}
          </span>
        )}
      </div>
    </div>
  );
}
