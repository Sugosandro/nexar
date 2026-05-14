import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

function rollD20() { return Math.floor(Math.random() * 20) + 1; }

let _uid = 0;
const newId = () => String(++_uid);

export default function InitiativeTracker({ open, onClose }) {
  const { t } = useTranslation();
  const { elements, allCats, addEl } = useWorld();

  const [combatants, setCombatants] = useState([]);
  const [round,      setRound]      = useState(1);
  const [currentId,  setCurrentId]  = useState(null);
  const [minimized,  setMinimized]  = useState(false);
  const [savedIds,   setSavedIds]   = useState(new Set());

  const [fName, setFName] = useState('');
  const [fInit, setFInit] = useState('');
  const [fHp,   setFHp]   = useState('');
  const [fMod,  setFMod]  = useState('0');
  const [fNpc,  setFNpc]  = useState(false);
  const [cQuery, setCQuery] = useState('');
  const [cOpen,  setCOpen]  = useState(false);

  const sorted = useMemo(() =>
    [...combatants].sort((a, b) => b.initiative - a.initiative),
  [combatants]);

  const active  = sorted.filter(c => !c.defeated);
  const current = active.find(c => c.id === currentId) || active[0];

  const addCombatant = (name, initiative, maxHp, isNpc) => {
    const id   = newId();
    const hp   = parseInt(maxHp)      || 0;
    const init = parseInt(initiative) || 0;
    setCombatants(prev => [...prev, { id, name, initiative: init, hp, maxHp: hp, isNpc, defeated: false }]);
    setCurrentId(prev => prev || id);
  };

  const handleAdd = () => {
    if (!fName.trim()) return;
    addCombatant(fName.trim(), fInit || '10', fHp || '0', fNpc);
    setFName(''); setFInit(''); setFHp('');
  };

  const handleRoll = () => {
    setFInit(String(rollD20() + (parseInt(fMod) || 0)));
  };

  const handleQuickAdd = (el) => {
    setFName(el.name);
    setCQuery(''); setCOpen(false);
    setTimeout(() => document.getElementById('initHpInput')?.focus(), 50);
  };

  const saveNpc = async (c) => {
    if (savedIds.has(c.id)) return;
    await addEl({ name: c.name, cat: 'char', sub: 'NPC', desc: '', tags: [] });
    setSavedIds(prev => new Set([...prev, c.id]));
  };

  const updateHp = (id, delta) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, hp: Math.max(0, c.hp + delta) } : c
    ));
  };

  const toggleDefeated = (id) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, defeated: !c.defeated } : c
    ));
  };

  const removeCombatant = (id) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
    if (id === currentId) {
      const rest = active.filter(c => c.id !== id);
      setCurrentId(rest[0]?.id || null);
    }
  };

  const nextTurn = () => {
    if (active.length === 0) return;
    const curIdx  = active.findIndex(c => c.id === current?.id);
    const nextIdx = (curIdx + 1) % active.length;
    if (nextIdx === 0) setRound(r => r + 1);
    setCurrentId(active[nextIdx].id);
  };

  const prevTurn = () => {
    if (active.length === 0) return;
    const curIdx  = active.findIndex(c => c.id === current?.id);
    const prevIdx = (curIdx - 1 + active.length) % active.length;
    if (curIdx === 0) setRound(r => Math.max(1, r - 1));
    setCurrentId(active[prevIdx].id);
  };

  const reset = () => {
    if (!window.confirm(t('init.confirm_reset'))) return;
    setCombatants([]); setRound(1); setCurrentId(null);
  };

  if (!open && !minimized) return null;

  const cats    = allCats();
  const elFiltered = cQuery
    ? elements.filter(e => e.name.toLowerCase().includes(cQuery.toLowerCase()))
    : elements;
  const elGroups = cats
    .map(c => ({ cat: c, items: elFiltered.filter(e => e.cat === c.id) }))
    .filter(g => g.items.length > 0);

  const btn = (label, onClick, opts = {}) => (
    <button onClick={onClick}
      style={{
        background: opts.active ? 'var(--gold-glow)' : 'var(--surface)',
        border:  `1px solid ${opts.active ? 'var(--gold-dim)' : 'var(--border)'}`,
        color:   opts.active ? 'var(--gold)' : 'var(--text-muted)',
        borderRadius: 'var(--r)', padding: opts.wide ? '4px 12px' : '4px 8px',
        fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
        ...opts.style,
      }}>
      {label}
    </button>
  );

  if (minimized) {
    return (
      <div onClick={() => setMinimized(false)}
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 900, background: 'var(--surface)', border: '1px solid var(--gold-dim)', borderRadius: 'var(--r)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,.5)', cursor: 'pointer' }}>
        <span style={{ color: 'var(--gold)', fontSize: 13, fontFamily: "'Crimson Pro', serif" }}>
          ⚔ {t('init.round_lbl')} {round}
          {current && <> — <strong style={{ color: 'var(--text)' }}>{current.name}</strong></>}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▲</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 900, width: 'min(400px, 100vw)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderLeft: '2px solid var(--gold-dim)', boxShadow: '-4px 0 24px rgba(0,0,0,.6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: 'var(--gold)', flex: 1 }}>
          ⚔ {t('init.title')} — {t('init.round_lbl')} {round}
        </span>
        {btn('◀', prevTurn, { style: { opacity: active.length ? 1 : .35, cursor: active.length ? 'pointer' : 'default' } })}
        {btn(t('init.next_btn') + ' ▶', nextTurn, { active: active.length > 0, wide: true })}
        <button onClick={reset} title={t('init.reset_btn')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer' }}>🔄</button>
        <button onClick={() => setMinimized(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>—</button>
        <button onClick={() => { setMinimized(false); onClose(); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* Combatant list */}
      {sorted.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
          {t('init.empty')}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sorted.map(c => {
            const isCurrent = c.id === current?.id;
            const hpPct     = c.maxHp > 0 ? c.hp / c.maxHp : 1;
            const hpColor   = hpPct > 0.5 ? '#6ab675' : hpPct > 0.25 ? '#d4a84c' : '#e07070';
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isCurrent ? 'var(--gold-glow)' : 'transparent', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${isCurrent ? 'var(--gold)' : 'transparent'}`, opacity: c.defeated ? .4 : 1, transition: 'background .15s, border-color .15s' }}>
                <span style={{ width: 28, textAlign: 'right', fontSize: 15, fontFamily: "'Playfair Display', serif", color: isCurrent ? 'var(--gold)' : 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                  {c.initiative}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: c.defeated ? 'var(--text-muted)' : 'var(--text)', fontFamily: "'Crimson Pro', serif", textDecoration: c.defeated ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.isNpc && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>NPC</span>}
                    {c.name}
                  </div>
                  {c.maxHp > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <div style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(hpPct * 100, 100)}%`, height: '100%', background: c.defeated ? '#555' : hpColor, borderRadius: 2, transition: 'width .2s' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{c.hp}/{c.maxHp}</span>
                    </div>
                  )}
                </div>
                {!c.defeated && c.maxHp > 0 && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => updateHp(c.id, -1)}
                      style={{ width: 22, height: 22, background: '#3a1515', border: '1px solid #e0707044', color: '#e07070', borderRadius: 3, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'monospace' }}>−</button>
                    <button onClick={() => updateHp(c.id, 1)}
                      style={{ width: 22, height: 22, background: '#1a3020', border: '1px solid #6ab67544', color: '#6ab675', borderRadius: 3, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'monospace' }}>+</button>
                  </div>
                )}
                <button onClick={() => toggleDefeated(c.id)} title={c.defeated ? t('init.revive') : t('init.defeat')}
                  style={{ background: 'none', border: 'none', color: c.defeated ? '#6ab675' : '#e07070', cursor: 'pointer', fontSize: 13, flexShrink: 0, opacity: .65, padding: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = .65}>
                  {c.defeated ? '↩' : '☠'}
                </button>
                <button
                  onClick={() => saveNpc(c)}
                  disabled={savedIds.has(c.id)}
                  title={savedIds.has(c.id) ? t('init.npc_saved') : t('init.save_npc')}
                  style={{ background: 'none', border: 'none', color: savedIds.has(c.id) ? '#6ab675' : 'var(--text-muted)', cursor: savedIds.has(c.id) ? 'default' : 'pointer', fontSize: 12, flexShrink: 0, opacity: savedIds.has(c.id) ? 1 : .5, padding: 0 }}
                  onMouseEnter={e => { if (!savedIds.has(c.id)) e.currentTarget.style.opacity = 1; }}
                  onMouseLeave={e => { if (!savedIds.has(c.id)) e.currentTarget.style.opacity = .5; }}>
                  {savedIds.has(c.id) ? '✓' : '💾'}
                </button>
                <button onClick={() => removeCombatant(c.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, flexShrink: 0, opacity: .4, padding: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = .4}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>
          {t('init.add_lbl')}
        </div>

        {/* Quick-add: tutti gli elementi dal database, raggruppati per categoria */}
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <input type="text" placeholder={t('init.quick_add_ph')} value={cQuery}
            onChange={e => { setCQuery(e.target.value); setCOpen(true); }}
            onFocus={() => setCOpen(true)}
            onBlur={() => setTimeout(() => setCOpen(false), 200)}
            autoComplete="off"
            style={{ width: '100%', background: 'var(--surface)', border: `1px solid ${cOpen ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }} />
          {cOpen && elGroups.length > 0 && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 -8px 24px rgba(0,0,0,.6)', zIndex: 10, maxHeight: 220, overflowY: 'auto' }}>
              {elGroups.map(({ cat: c, items }) => (
                <div key={c.id}>
                  <div style={{ padding: '5px 10px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: c.color, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 5, position: 'sticky', bottom: 0 }}>
                    <span>{c.icon}</span><span>{c.name}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: .6 }}>{items.length}</span>
                  </div>
                  {items.map(el => (
                    <div key={el.id} onMouseDown={() => handleQuickAdd(el)}
                      style={{ padding: '7px 10px 7px 20px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text)' }}>{el.name}</span>
                      {el.sub && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{el.sub}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
          <input type="text" placeholder={t('init.name_ph')} value={fName}
            onChange={e => setFName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 8px', outline: 'none' }} />
          <input type="number" placeholder={t('init.init_ph')} value={fInit}
            onChange={e => setFInit(e.target.value)}
            style={{ flex: '0 0 52px', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 6px', outline: 'none', textAlign: 'center' }} />
          <input id="initHpInput" type="number" placeholder="HP" value={fHp}
            onChange={e => setFHp(e.target.value)}
            style={{ flex: '0 0 52px', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 6px', outline: 'none', textAlign: 'center' }} />
        </div>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <input type="number" placeholder={t('init.mod_ph')} value={fMod}
            onChange={e => setFMod(e.target.value)}
            style={{ flex: '0 0 54px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 6px', outline: 'none', textAlign: 'center' }} />
          <button onClick={handleRoll}
            style={{ flex: '0 0 auto', padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: "'Crimson Pro', serif" }}>
            🎲 {t('init.roll_btn')}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}>
            <input type="checkbox" checked={fNpc} onChange={e => setFNpc(e.target.checked)} style={{ cursor: 'pointer' }} />
            NPC
          </label>
          <button onClick={handleAdd} disabled={!fName.trim()}
            style={{ padding: '5px 14px', background: fName.trim() ? 'var(--gold-glow)' : 'var(--surface2)', border: `1px solid ${fName.trim() ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 'var(--r)', color: fName.trim() ? 'var(--gold)' : 'var(--text-muted)', cursor: fName.trim() ? 'pointer' : 'default', fontSize: 12, fontFamily: "'Crimson Pro', serif" }}>
            {t('init.add_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
