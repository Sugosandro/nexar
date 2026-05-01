import { useState } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementModal from './ElementModal';
import FazioneModal from './FazioneModal';
import MagiaModal from './MagiaModal';
import ArcModal from './ArcModal';

function ChangelogTab({ el, updateEl, elements, showToast }) {
  const luoghi = elements.filter(e => e.cat === 'place');
  const [newDate,  setNewDate]  = useState('');
  const [newPlace, setNewPlace] = useState('');
  const [newText,  setNewText]  = useState('');

  const handleAdd = async () => {
    if (!newText.trim()) return;
    const entry = { date: newDate.trim(), placeId: newPlace || null, text: newText.trim() };
    const updated = [...(el.changelog || []), entry];
    await updateEl(el.id, { changelog: updated });
    setNewDate(''); setNewPlace(''); setNewText('');
    showToast('✓ Voce aggiunta');
  };

  const handleDelete = async (i) => {
    const updated = (el.changelog || []).filter((_, idx) => idx !== i);
    await updateEl(el.id, { changelog: updated });
    showToast('🗑 Voce eliminata');
  };

  return (
    <div className="dp-sec">
      <div className="dp-lbl">Storico narrativo</div>
      <div className="changelog">
        {(el.changelog || []).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, padding: '8px 0' }}>
            Nessuna voce — aggiungi il primo momento narrativo
          </p>
        ) : (
          [...(el.changelog || [])].map((c, i) => {
            const luogo = luoghi.find(l => l.id === c.placeId);
            return (
              <div key={i} className="cl-entry" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  {c.date && <span className="cl-date" style={{ margin: 0 }}>{c.date}</span>}
                  {luogo && (
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'var(--place-dim)', color: 'var(--place)' }}>
                      📍 {luogo.name}
                    </span>
                  )}
                  <button onClick={() => handleDelete(i)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, opacity: .5, padding: '0 2px' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = .5}>×</button>
                </div>
                <div className="cl-text">{c.text}</div>
              </div>
            );
          })
        )}
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div className="dp-lbl" style={{ marginBottom: 8 }}>Aggiungi voce</div>
        <input className="fi" style={{ fontSize: 12, marginBottom: 6 }}
          placeholder="GG/MM/AAAA o data narrativa…" value={newDate}
          onChange={e => {
            let v = e.target.value.replace(/[^\d/]/g, '');
            if (v.length === 2 && !v.includes('/')) v += '/';
            if (v.length === 5 && v.split('/').length === 2) v += '/';
            if (v.length > 10) v = v.slice(0, 10);
            setNewDate(v);
          }} maxLength={10} autoComplete="off" />
        <select className="fs" style={{ fontSize: 12, marginBottom: 6 }} value={newPlace} onChange={e => setNewPlace(e.target.value)}>
          <option value="">📍 Luogo (opzionale)</option>
          {luoghi.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <textarea className="ft" style={{ fontSize: 12, minHeight: 60, marginBottom: 6 }}
          placeholder="Cosa è successo in questo momento?" value={newText} onChange={e => setNewText(e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-p" style={{ fontSize: 11, padding: '5px 12px' }} onClick={handleAdd}>+ Aggiungi</button>
        </div>
      </div>
    </div>
  );
}

export default function DetailPanel({ panel, onClose, onOpen, showToast }) {
  const {
    elById, elColor, elIcon, elLabel,
    arcsByMember, fazioniOfEl, magieOfEl, backlinks,
    updateEl, deleteEl, addEl,
    arcs, updateArc, deleteArc,
    fazioni, updateFazione, deleteFazione,
    magie, updateMagia, deleteMagia,
    elements,
  } = useWorld();

  const [activeTab,    setActiveTab]    = useState('info');
  const [editing,      setEditing]      = useState(false);
  const [editingFaz,   setEditingFaz]   = useState(false);
  const [editingMagia, setEditingMagia] = useState(false);
  const [editingArc,   setEditingArc]   = useState(false);

  if (!panel) return <div className="dp hidden" />;

  const { type, id } = panel;

  // ── ELEMENTO ──
  if (type === 'element') {
    const el = elById(id);
    if (!el) return <div className="dp hidden" />;

    const color  = elColor(el);
    const elArcs = arcsByMember(el.id);
    const elFaz  = fazioniOfEl(el.id);
    const elMag  = magieOfEl(el.id);
    const links  = backlinks(el.id);

    const TABS = [
      { id: 'info',      label: 'Scheda' },
      { id: 'changelog', label: 'Storico' },
      { id: 'notes',     label: 'Note' },
    ];

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color }}>{elIcon(el)} {elLabel(el)}</div>
              <div className="dp-name">{el.name}</div>
              {el.extra?.ruolo && <div className="dp-sub">{el.extra.ruolo}</div>}
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditing(true)}>Modifica</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(`Eliminare "${el.name}"?`)) return;
                await deleteEl(el.id); onClose(); showToast('🗑 Elemento eliminato');
              }}>Elimina</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`dp-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="dp-body">
          {activeTab === 'info' && (
            <>
              {el.image && <img className="dp-img" src={el.image} alt="" />}
              <div className="dp-sec">
                <div className="dp-lbl">Descrizione</div>
                <div className="dp-txt">{el.desc || <em style={{ opacity: .4 }}>—</em>}</div>
              </div>
              {Object.entries(el.extra || {}).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="dp-sec">
                  <div className="dp-lbl">{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                  <div className="dp-txt" style={{ fontSize: 13 }}>{v}</div>
                </div>
              ))}
              {elArcs.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">Archi narrativi</div>
                  <div className="dp-tags">
                    {elArcs.map(a => (
                      <span key={a.id} className="tag" style={{ background: 'var(--arc-dim)', color: 'var(--arc)', cursor: 'pointer' }}
                        onClick={() => onOpen('arc', a.id)}>📖 {a.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {elFaz.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">⚔ Fazioni</div>
                  <div className="dp-tags">
                    {elFaz.map(f => (
                      <span key={f.id} className="tag" style={{ background: '#4a3810', color: '#f0c060', cursor: 'pointer' }}
                        onClick={() => onOpen('fazione', f.id)}>⚔ {f.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {elMag.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">✨ Sistemi di magia</div>
                  <div className="dp-tags">
                    {elMag.map(m => (
                      <span key={m.id} className="tag" style={{ background: '#1a3830', color: '#a0d0c0', cursor: 'pointer' }}
                        onClick={() => onOpen('magia', m.id)}>✨ {m.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {links.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-lbl">Citato in</div>
                  <div className="bl-list">
                    {links.map(e => (
                      <div key={e.id} className="bl-item" onClick={() => onOpen('element', e.id)}>
                        <span className="bl-dot" style={{ background: elColor(e) }} />
                        <span className="bl-name">{e.name}</span>
                        <span className="bl-type">{elLabel(e)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'changelog' && (
            <ChangelogTab el={el} updateEl={updateEl} elements={elements} showToast={showToast} />
          )}
          {activeTab === 'notes' && (
            <>
              <textarea className="notes-area" defaultValue={el.notes || ''} placeholder="Scrivi note libere…"
                onBlur={async e => { await updateEl(el.id, { notes: e.target.value }); showToast('✓ Note salvate'); }} />
              <div className="notes-hint">💾 Salvato quando esci dal campo</div>
            </>
          )}
        </div>
       {editing && (
  <ElementModal initialData={el}
    onSave={async (data, birthDate) => {
      await updateEl(el.id, data);

      if (birthDate) {
        await addEl({
          cat: 'event', name: `Nascita di ${data.name}`,
          desc: `${data.name} viene al mondo.`,
          date: birthDate, tags: [el.id], status: 'done',
          extra: {}, powers: [], equip: [], changelog: [], notes: '',
        });
      }

      // Aggiorna storico elementi presenti all'evento
      if (data.cat === 'event' && data.eventPlace && data.date && data.eventEls?.length) {
        for (const elId of data.eventEls) {
          const elTarget = elements.find(e => e.id === elId);
          if (!elTarget) continue;
          // Evita duplicati — non aggiungere se esiste già una voce con stessa data e luogo
          const alreadyExists = (elTarget.changelog || []).some(
            c => c.date === data.date && c.placeId === data.eventPlace
          );
          if (!alreadyExists) {
            const newEntry = {
              date:    data.date,
              placeId: data.eventPlace,
              text:    `Presente durante: ${data.name}`,
            };
            await updateEl(elId, { changelog: [...(elTarget.changelog || []), newEntry] });
          }
        }
      }

      setEditing(false);
      showToast('✓ Elemento salvato');
    }}
    onClose={() => setEditing(false)} />
)}
      </div>
    );
  }

  // ── FAZIONE ──
  if (type === 'fazione') {
    const faz = fazioni.find(f => f.id === id);
    if (!faz) return <div className="dp hidden" />;
    const REL_LABELS = { ally: '🤝 Alleata', enemy: '⚔ Nemica', neutral: '○ Neutrale' };
    const REL_COLORS = { ally: '#1a3020', enemy: '#3a1515', neutral: '#2a2810' };

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color: '#f0c060' }}>⚔ Fazione</div>
              <div className="dp-name">{faz.name}</div>
              {faz.motto && <div className="dp-sub">"{faz.motto}"</div>}
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditingFaz(true)}>Modifica</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(`Eliminare "${faz.name}"?`)) return;
                await deleteFazione(faz.id); onClose(); showToast('🗑 Fazione eliminata');
              }}>Elimina</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-body">
          {faz.desc && <div className="dp-sec"><div className="dp-lbl">Descrizione</div><div className="dp-txt">{faz.desc}</div></div>}
          <div className="dp-sec">
            <div className="dp-lbl">Membri</div>
            <div className="dp-tags">
              {(faz.members || []).map(mid => {
                const el = elements.find(e => e.id === mid);
                return el ? <span key={mid} className="tag" style={{ background: 'var(--char-dim)', color: 'var(--char)', cursor: 'pointer' }}
                  onClick={() => onOpen('element', el.id)}>👤 {el.name}</span> : null;
              })}
              {(!faz.members?.length) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Nessun membro</span>}
            </div>
          </div>
          {(faz.rels || []).length > 0 && (
            <div className="dp-sec">
              <div className="dp-lbl">Relazioni</div>
              {faz.rels.map((r, i) => {
                const other = fazioni.find(f => f.id === r.fazId);
                return other ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: REL_COLORS[r.type] || 'var(--surface3)', color: 'var(--text)' }}>
                      {REL_LABELS[r.type] || r.type}
                    </span>
                    <span style={{ cursor: 'pointer', color: 'var(--text)' }} onClick={() => onOpen('fazione', other.id)}>{other.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
          <div className="dp-sec">
            <div className="dp-lbl">Note</div>
            <textarea className="notes-area" defaultValue={faz.notes || ''} placeholder="Note sulla fazione…"
              onBlur={async e => { await updateFazione(faz.id, { notes: e.target.value }); showToast('✓ Note salvate'); }} />
          </div>
        </div>
        {editingFaz && (
          <FazioneModal initialData={faz}
            onSave={async (data) => { await updateFazione(faz.id, data); setEditingFaz(false); showToast('✓ Fazione aggiornata'); }}
            onClose={() => setEditingFaz(false)} />
        )}
      </div>
    );
  }

  // ── MAGIA ──
  if (type === 'magia') {
    const mag = magie.find(m => m.id === id);
    if (!mag) return <div className="dp hidden" />;

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color: '#a0d0c0' }}>✨ Sistema di Magia</div>
              <div className="dp-name">{mag.name}</div>
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditingMagia(true)}>Modifica</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(`Eliminare "${mag.name}"?`)) return;
                await deleteMagia(mag.id); onClose(); showToast('🗑 Sistema eliminato');
              }}>Elimina</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-body">
          {mag.desc && <div className="dp-sec"><div className="dp-lbl">Descrizione</div><div className="dp-txt">{mag.desc}</div></div>}
          {(mag.rules || []).length > 0 && (
            <div className="dp-sec">
              <div className="dp-lbl">Regole e limitazioni</div>
              {mag.rules.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-dim)' }}>
                  <span style={{ color: '#a0d0c0', flexShrink: 0 }}>▸</span>{r}
                </div>
              ))}
            </div>
          )}
          <div className="dp-sec">
            <div className="dp-lbl">Chi lo usa</div>
            <div className="dp-tags">
              {(mag.users || []).map(uid => {
                const el = elements.find(e => e.id === uid);
                return el ? <span key={uid} className="tag" style={{ background: 'var(--surface3)', color: 'var(--text-dim)', cursor: 'pointer' }}
                  onClick={() => onOpen('element', el.id)}>{el.name}</span> : null;
              })}
              {(!mag.users?.length) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Nessuno</span>}
            </div>
          </div>
          <div className="dp-sec">
            <div className="dp-lbl">Note</div>
            <textarea className="notes-area" defaultValue={mag.notes || ''} placeholder="Note sul sistema di magia…"
              onBlur={async e => { await updateMagia(mag.id, { notes: e.target.value }); showToast('✓ Note salvate'); }} />
          </div>
        </div>
        {editingMagia && (
          <MagiaModal initialData={mag}
            onSave={async (data) => { await updateMagia(mag.id, data); setEditingMagia(false); showToast('✓ Sistema aggiornato'); }}
            onClose={() => setEditingMagia(false)} />
        )}
      </div>
    );
  }

  // ── ARCO ──
  if (type === 'arc') {
    const arc = arcs.find(a => a.id === id);
    if (!arc) return <div className="dp hidden" />;

    return (
      <div className="dp mob-open">
        <div className="dp-hd">
          <div className="dp-hd-top">
            <div>
              <div className="dp-type" style={{ color: 'var(--arc)' }}>📖 Arco Narrativo</div>
              <div className="dp-name">{arc.name}</div>
              {arc.currentPhase && <div className="dp-sub">Fase: {arc.currentPhase}</div>}
            </div>
            <div className="dp-acts">
              <button className="btn-g" onClick={() => setEditingArc(true)}>Modifica</button>
              <button className="btn-d" onClick={async () => {
                if (!window.confirm(`Eliminare "${arc.name}"?`)) return;
                await deleteArc(arc.id); onClose(); showToast('🗑 Arco eliminato');
              }}>Elimina</button>
              <button className="dp-close" onClick={onClose}>×</button>
            </div>
          </div>
        </div>
        <div className="dp-body">
          {arc.desc && <div className="dp-sec"><div className="dp-lbl">Descrizione</div><div className="dp-txt">{arc.desc}</div></div>}
          {(arc.phases || []).length > 0 && (
            <div className="dp-sec">
              <div className="dp-lbl">Fasi</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {arc.phases.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: p === arc.currentPhase ? 'var(--arc)' : 'var(--surface3)', border: `1px solid ${p === arc.currentPhase ? 'var(--arc)' : 'var(--border)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: p === arc.currentPhase ? 'var(--bg)' : 'var(--text-muted)' }}>{i + 1}</span>
                    <span style={{ color: p === arc.currentPhase ? 'var(--text)' : 'var(--text-dim)', fontWeight: p === arc.currentPhase ? 600 : 400 }}>{p}</span>
                    {p === arc.currentPhase && <span style={{ fontSize: 10, color: 'var(--arc)', marginLeft: 'auto' }}>← corrente</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="dp-sec">
            <div className="dp-lbl">Elementi coinvolti</div>
            <div className="dp-tags">
              {(arc.members || []).map(mid => {
                const el = elements.find(e => e.id === mid);
                return el ? <span key={mid} className="tag" style={{ background: 'var(--arc-dim)', color: 'var(--arc)', cursor: 'pointer' }}
                  onClick={() => onOpen('element', el.id)}>{el.name}</span> : null;
              })}
              {(!arc.members?.length) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Nessun elemento</span>}
            </div>
          </div>
          <div className="dp-sec">
            <div className="dp-lbl">Note</div>
            <textarea className="notes-area" defaultValue={arc.notes || ''} placeholder="Note sull'arco narrativo…"
              onBlur={async e => { await updateArc(arc.id, { notes: e.target.value }); showToast('✓ Note salvate'); }} />
          </div>
        </div>
        {editingArc && (
          <ArcModal initialData={arc}
            onSave={async (data) => { await updateArc(arc.id, data); setEditingArc(false); showToast('✓ Arco aggiornato'); }}
            onClose={() => setEditingArc(false)} />
        )}
      </div>
    );
  }

  return <div className="dp hidden" />;
}