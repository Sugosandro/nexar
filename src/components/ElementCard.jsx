// src/components/ElementCard.jsx
// ─────────────────────────────────────────────
// Card singola di un elemento (personaggio, luogo, ecc.)
// ─────────────────────────────────────────────

import { useWorld } from '../hooks/useWorld';

const STATUS_CLASSES = { draft: 'status-draft', wip: 'status-wip', done: 'status-done' };
const STATUS_LABELS  = { draft: '✏ Bozza', wip: '🔵 In sviluppo', done: '✅ Definitivo' };

export default function ElementCard({ element: el, onClick }) {
  const { elColor, elIcon, elLabel, arcsByMember, fazioniOfEl, magieOfEl, catById } = useWorld();

  const color = elColor(el);
  const arcs  = arcsByMember(el.id);
  const faz   = fazioniOfEl(el.id);
  const mag   = magieOfEl(el.id);

  return (
    <div
      className="card"
      style={{ borderTop: `3px solid ${color}` }}
      onClick={onClick}
    >
      {/* Immagine o placeholder */}
      {el.image
        ? <img className="card-img" src={el.image} alt="" />
        : <div className="card-img-ph">{elIcon(el)}</div>
      }

      <div className="card-body">
        <div className="card-type" style={{ color }}>{elIcon(el)} {elLabel(el)}</div>
        <div className="card-name">{el.name}</div>
        <div className="card-desc">
          {el.desc || <em style={{ opacity: .35 }}>Nessuna descrizione</em>}
        </div>

        {/* Badge archi */}
        {arcs.map(a => (
          <div key={a.id} className="card-arc">📖 {a.name}</div>
        ))}
        {/* Badge fazioni */}
        {faz.map(f => (
          <div key={f.id} className="card-arc" style={{ background: '#4a3810', color: '#f0c060' }}>
            ⚔ {f.name}
          </div>
        ))}
        {/* Badge magie */}
        {mag.map(m => (
          <div key={m.id} className="card-arc" style={{ background: '#1a3830', color: '#a0d0c0' }}>
            ✨ {m.name}
          </div>
        ))}
        {/* Badge poteri */}
        {(el.powers || []).length > 0 && (
          <div className="card-arc" style={{ background: '#2a1a3a', color: '#c4a0e4' }}>
            ⚡ {el.powers.length} poter{el.powers.length !== 1 ? 'i' : 'e'}
          </div>
        )}
        {/* Badge importanza */}
        {el.importance && el.importance !== 'minore' && (
  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>
    {{ protagonista: '⭐⭐⭐ Protagonista', primario: '⭐⭐ Primario', secondario: '⭐ Secondario' }[el.importance]}
  </div>
)}
        {/* Badge stato */}
        {el.status && el.status !== 'draft' && (
          <span className={`status-badge ${STATUS_CLASSES[el.status] || ''}`} style={{ marginTop: 5 }}>
            {STATUS_LABELS[el.status] || el.status}
          </span>
        )}
      </div>
    </div>
  );
}
