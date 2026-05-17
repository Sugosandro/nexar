import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

const CATEGORIE = [
  { id: 'incontro', icon: '⚔',  color: '#e07070' },
  { id: 'meteo',    icon: '🌩',  color: '#7ab8d4' },
  { id: 'bottino',  icon: '💰',  color: '#d4a84c' },
  { id: 'npc',      icon: '👤',  color: '#8fbd7c' },
  { id: 'evento',   icon: '📅',  color: '#c89fd4' },
  { id: 'nome',     icon: '📝',  color: '#8ec8e4' },
  { id: 'altro',    icon: '🎲',  color: '#888'    },
];
const catById = (id) => CATEGORIE.find(c => c.id === id) || CATEGORIE[CATEGORIE.length - 1];

const rollWeighted = (voci) => {
  if (!voci?.length) return null;
  const total = voci.reduce((sum, v) => sum + (v.peso || 1), 0);
  let rand = Math.random() * total;
  for (const v of voci) {
    rand -= (v.peso || 1);
    if (rand <= 0) return v;
  }
  return voci[voci.length - 1];
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function TabellaModal({ initialData, onSave, onClose }) {
  const { t } = useTranslation();
  const [titolo,      setTitolo]      = useState(initialData?.titolo      || '');
  const [categoria,   setCategoria]   = useState(initialData?.categoria   || 'altro');
  const [descrizione, setDescrizione] = useState(initialData?.descrizione || '');
  const [voci,        setVoci]        = useState(() =>
    (initialData?.voci || []).map((v, i) => ({ ...v, id: v.id || String(i) }))
  );
  const [newTesto, setNewTesto] = useState('');
  const [newPeso,  setNewPeso]  = useState('1');

  const addVoce = () => {
    if (!newTesto.trim()) return;
    setVoci(prev => [...prev, { id: Date.now().toString(), testo: newTesto.trim(), peso: Math.max(1, parseInt(newPeso) || 1) }]);
    setNewTesto(''); setNewPeso('1');
  };

  const removeVoce  = (id) => setVoci(prev => prev.filter(v => v.id !== id));
  const updatePeso  = (id, p) => setVoci(prev => prev.map(v => v.id === id ? { ...v, peso: Math.max(1, parseInt(p) || 1) } : v));
  const updateTesto = (id, t) => setVoci(prev => prev.map(v => v.id === id ? { ...v, testo: t } : v));

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-title">{initialData ? t('tav.modal_edit') : t('tav.modal_new')}</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="fg" style={{ flex: 1, minWidth: 180 }}>
            <label className="fl">{t('tav.title_lbl')}</label>
            <input className="fi" autoFocus placeholder={t('tav.title_ph')} value={titolo}
              onChange={e => setTitolo(e.target.value)} autoComplete="off" />
          </div>
          <div className="fg" style={{ flex: '0 0 170px' }}>
            <label className="fl">{t('tav.cat_lbl')}</label>
            <select className="fs" value={categoria} onChange={e => setCategoria(e.target.value)}>
              {CATEGORIE.map(c => <option key={c.id} value={c.id}>{c.icon} {t('tav.cat_' + c.id)}</option>)}
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl">{t('tav.desc_lbl')}</label>
          <textarea className="ft" style={{ minHeight: 50 }} placeholder={t('tav.desc_ph')}
            value={descrizione} onChange={e => setDescrizione(e.target.value)} />
        </div>

        <div className="fg">
          <label className="fl" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {t('tav.voci_lbl')}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({voci.length})</span>
            {voci.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                % · {t('tav.peso_col')}
              </span>
            )}
          </label>

          {voci.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 260, overflowY: 'auto', marginBottom: 8, padding: '2px 0' }}>
              {(() => {
                const pesoTotal = voci.reduce((s, v) => s + (v.peso || 1), 0);
                return voci.map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, width: 20, textAlign: 'right' }}>{i + 1}.</span>
                    <input type="text" value={v.testo} onChange={e => updateTesto(v.id, e.target.value)}
                      style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, padding: '4px 8px', outline: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                        {Math.round((v.peso || 1) / pesoTotal * 100)}%
                      </span>
                      <input type="number" min="1" max="99" value={v.peso} onChange={e => updatePeso(v.id, e.target.value)}
                        title={t('tav.peso_title')}
                        style={{ width: 42, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12, padding: '4px 4px', outline: 'none', textAlign: 'center' }} />
                    </div>
                    <button onClick={() => removeVoce(v.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, opacity: .4, padding: 0, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = .4}>×</button>
                  </div>
                ));
              })()}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <input className="fi" style={{ flex: 1, marginBottom: 0 }}
              placeholder={t('tav.voce_ph')} value={newTesto}
              onChange={e => setNewTesto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVoce(); } }}
              autoComplete="off" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>×</span>
              <input type="number" min="1" max="20" value={newPeso} onChange={e => setNewPeso(e.target.value)}
                title={t('tav.peso_title')}
                style={{ width: 42, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 4px', outline: 'none', textAlign: 'center' }} />
            </div>
            <button type="button" className="btn-g" onClick={addVoce} style={{ flexShrink: 0, padding: '5px 12px' }}>+</button>
          </div>
          {voci.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, fontStyle: 'italic' }}>
              {t('tav.peso_hint')}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p"
            onClick={() => onSave({ titolo: titolo.trim(), categoria, descrizione: descrizione.trim(), voci })}
            disabled={!titolo.trim() || voci.length === 0}>
            {initialData ? t('common.save_changes') : t('tav.create_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function TabellaCard({ tabella, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [expanded,  setExpanded]  = useState(false);
  const [risultato, setRisultato] = useState(null);
  const [rolling,   setRolling]   = useState(false);
  const [rollKey,   setRollKey]   = useState(0);

  const cat   = catById(tabella.categoria);
  const voci  = tabella.voci || [];
  const total = voci.reduce((s, v) => s + (v.peso || 1), 0);

  const handleRoll = (e) => {
    e?.stopPropagation();
    if (!voci.length || rolling) return;
    setRolling(true);
    setExpanded(true);
    setTimeout(() => {
      setRisultato(rollWeighted(voci));
      setRollKey(k => k + 1);
      setRolling(false);
    }, 250);
  };

  return (
    <div style={{ border: `1px solid ${cat.color}44`, borderLeft: `3px solid ${cat.color}`, borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--surface2)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(o => !o)}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tabella.titolo}
          </div>
          <div style={{ fontSize: 11, color: cat.color, marginTop: 2 }}>
            {t('tav.cat_' + tabella.categoria)} · {voci.length} {t('tav.voci_count')}
          </div>
        </div>
        <button onClick={handleRoll} disabled={!voci.length || rolling}
          style={{ padding: '5px 16px', fontSize: 12, borderRadius: 'var(--r)', cursor: voci.length && !rolling ? 'pointer' : 'default', fontFamily: "'Crimson Pro', serif", background: rolling ? 'var(--surface3)' : 'var(--gold-glow)', border: `1px solid ${rolling ? 'var(--border)' : 'var(--gold-dim)'}`, color: rolling ? 'var(--text-muted)' : 'var(--gold)', flexShrink: 0, transition: 'all .15s' }}>
          {rolling ? '…' : `🎲 ${t('tav.roll_btn')}`}
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${cat.color}33`, padding: '12px 14px' }}>
          {tabella.descrizione && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, fontStyle: 'italic' }}>
              {tabella.descrizione}
            </p>
          )}

          {/* Result */}
          {risultato && (
            <div key={rollKey}
              style={{ margin: '0 0 14px', padding: '14px 18px', background: cat.color + '18', border: `1px solid ${cat.color}66`, borderRadius: 'var(--r)', textAlign: 'center', animation: 'fadeIn .3s ease' }}>
              <div style={{ fontSize: 10, color: cat.color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                {t('tav.result_lbl')}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--text)', lineHeight: 1.5 }}>
                {risultato.testo}
              </div>
              {risultato.peso > 1 && (
                <div style={{ fontSize: 10, color: cat.color, marginTop: 6, opacity: .7 }}>
                  {t('tav.peso_weight', { p: risultato.peso, t: total })}
                </div>
              )}
            </div>
          )}

          {/* Entry list */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              {t('tav.voci_lbl')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {voci.map((v, i) => {
                const isResult = risultato?.id === v.id;
                return (
                  <div key={v.id || i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 13, background: isResult ? cat.color + '14' : 'transparent', transition: 'background .2s', borderRadius: isResult ? 4 : 0 }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 11, width: 20, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ flex: 1, color: isResult ? 'var(--text)' : 'var(--text-dim)', fontWeight: isResult ? 600 : 400 }}>{v.testo}</span>
                    <span style={{ fontSize: 10, color: isResult ? cat.color : 'var(--text-muted)', flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
                      {Math.round((v.peso || 1) / total * 100)}%
                    </span>
                    {isResult && <span style={{ fontSize: 10, color: cat.color, flexShrink: 0 }}>◀</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-g" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onEdit(tabella)}>
              {t('dp.edit_btn')}
            </button>
            <button className="btn-g" style={{ fontSize: 12, padding: '5px 12px', color: '#e07070' }} onClick={() => onDelete(tabella)}>
              {t('dp.delete_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function TavoleView({ showToast }) {
  const { t } = useTranslation();
  const { tavole, addTabella, updateTabella, deleteTabella } = useWorld();
  const [modal,     setModal]     = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const importRef = useRef(null);

  const handleExport = () => {
    const data = tavole.map(({ titolo, categoria, descrizione, voci }) => ({
      titolo, categoria, descrizione,
      voci: (voci || []).map(({ testo, peso }) => ({ testo, peso: peso || 1 })),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'tavole-casuali.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('not array');
      let count = 0;
      for (const tbl of data) {
        if (!tbl.titolo || !Array.isArray(tbl.voci) || tbl.voci.length === 0) continue;
        await addTabella({
          titolo:      String(tbl.titolo),
          categoria:   tbl.categoria || 'altro',
          descrizione: tbl.descrizione || '',
          voci: tbl.voci.map(v => ({ testo: String(v.testo || ''), peso: Math.max(1, parseInt(v.peso) || 1) })).filter(v => v.testo),
        });
        count++;
      }
      if (count === 0) throw new Error('no valid tables');
      showToast(t('tav.toast_imported', { count }));
    } catch {
      showToast(t('tav.toast_import_err'));
    }
  };

  const usedCats = CATEGORIE.filter(c => tavole.some(tb => tb.categoria === c.id));
  const filtered  = tavole.filter(tb => !filterCat || tb.categoria === filterCat);

  const handleSave = async (data) => {
    if (modal === 'new') {
      await addTabella(data);
      showToast(t('tav.toast_created'));
    } else {
      await updateTabella(modal.id, data);
      showToast(t('tav.toast_updated'));
    }
    setModal(null);
  };

  const handleDelete = async (tab) => {
    if (!window.confirm(t('tav.confirm_delete', { title: tab.titolo }))) return;
    await deleteTabella(tab.id);
    showToast(t('tav.toast_deleted'));
  };

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">🎲 <span>{t('tav.title')}</span></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn-g" style={{ fontSize: 12, padding: '5px 11px' }}
            onClick={handleExport} disabled={tavole.length === 0}>
            📤 {t('tav.export_btn')}
          </button>
          <button className="btn-g" style={{ fontSize: 12, padding: '5px 11px' }}
            onClick={() => importRef.current?.click()}>
            📥 {t('tav.import_btn')}
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn-p" onClick={() => setModal('new')}>{t('tav.new_btn')}</button>
        </div>
      </div>

      {/* Category filter chips */}
      {usedCats.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterCat('')}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: !filterCat ? 'var(--gold-glow)' : 'var(--surface2)', border: `1px solid ${!filterCat ? 'var(--gold-dim)' : 'var(--border)'}`, color: !filterCat ? 'var(--gold)' : 'var(--text-muted)' }}>
            {t('tav.filter_all')}
          </button>
          {usedCats.map(c => (
            <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: filterCat === c.id ? c.color + '22' : 'var(--surface2)', border: `1px solid ${filterCat === c.id ? c.color + '88' : 'var(--border)'}`, color: filterCat === c.id ? c.color : 'var(--text-muted)', transition: 'all .15s' }}>
              {c.icon} {t('tav.cat_' + c.id)}
            </button>
          ))}
        </div>
      )}

      {tavole.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎲</div>
          <div className="empty-title">{t('tav.empty_title')}</div>
          <div className="empty-sub">{t('tav.empty_sub')}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
          {t('tav.no_results')}
        </div>
      ) : (
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(tab => (
            <TabellaCard key={tab.id} tabella={tab} onEdit={setModal} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modal && (
        <TabellaModal
          initialData={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}
