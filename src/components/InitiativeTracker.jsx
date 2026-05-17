import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';

function rollD20() { return Math.floor(Math.random() * 20) + 1; }

const newId = () => crypto.randomUUID();

const CONDITIONS = [
  { id: 'poisoned',      icon: '🤢', color: '#8fbd7c', it: 'Avvelenato',   en: 'Poisoned' },
  { id: 'blinded',       icon: '🚫', color: '#777',    it: 'Accecato',     en: 'Blinded' },
  { id: 'stunned',       icon: '💫', color: '#d4a84c', it: 'Stordito',     en: 'Stunned' },
  { id: 'prone',         icon: '⬇',  color: '#7ab8d4', it: 'Prono',        en: 'Prone' },
  { id: 'grappled',      icon: '✊',  color: '#c89fd4', it: 'Afferrato',    en: 'Grappled' },
  { id: 'restrained',    icon: '⛓',  color: '#d4956a', it: 'Trattenuto',   en: 'Restrained' },
  { id: 'paralyzed',     icon: '🗿',  color: '#a0a060', it: 'Paralizzato',  en: 'Paralyzed' },
  { id: 'frightened',    icon: '😨',  color: '#e07070', it: 'Spaventato',   en: 'Frightened' },
  { id: 'charmed',       icon: '💗',  color: '#c860b0', it: 'Affascinato',  en: 'Charmed' },
  { id: 'deafened',      icon: '🔕',  color: '#777',    it: 'Assordato',    en: 'Deafened' },
  { id: 'exhausted',     icon: '😴',  color: '#888',    it: 'Esausto',      en: 'Exhausted' },
  { id: 'invisible',     icon: '👻',  color: '#a0d0c0', it: 'Invisibile',   en: 'Invisible' },
  { id: 'petrified',     icon: '🪨',  color: '#a0a0a0', it: 'Pietrificato', en: 'Petrified' },
  { id: 'incapacitated', icon: '💀',  color: '#555',    it: 'Incapacitato', en: 'Incapacitated' },
];

function DeathDot({ filled, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 22, height: 22, borderRadius: '50%',
      background: filled ? color : 'transparent',
      border: `2px solid ${filled ? color : 'var(--border)'}`,
      cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
    }} />
  );
}

export default function InitiativeTracker({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const { elements, allCats, addEl } = useWorld();

  const [combatants, setCombatants] = useState([]);
  const [round,      setRound]      = useState(1);
  const [currentId,  setCurrentId]  = useState(null);
  const [minimized,  setMinimized]  = useState(false);
  const [savedIds,   setSavedIds]   = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const [fName,  setFName]  = useState('');
  const [fInit,  setFInit]  = useState('');
  const [fHp,    setFHp]    = useState('');
  const [fMod,   setFMod]   = useState('');
  const [fNpc,   setFNpc]   = useState(false);
  const [fEnemy, setFEnemy] = useState(false);
  const [cQuery, setCQuery] = useState('');
  const [cOpen,  setCOpen]  = useState(false);
  const [editHpId,  setEditHpId]  = useState(null);
  const [editHpVal, setEditHpVal] = useState('');

  const lang = i18n.language?.startsWith('it') ? 'it' : 'en';
  const condLabel = (cond) => cond[lang] || cond.it;

  const sorted = useMemo(() =>
    [...combatants].sort((a, b) => b.initiative - a.initiative),
  [combatants]);

  const active  = sorted.filter(c => !c.defeated);
  const current = active.find(c => c.id === currentId) || active[0];

  const addCombatant = (name, initiative, maxHp, isNpc, isEnemy) => {
    const id   = newId();
    const hp   = parseInt(maxHp)      || 0;
    const init = parseInt(initiative) || 0;
    setCombatants(prev => [...prev, {
      id, name, initiative: init, hp, maxHp: hp, isNpc, isEnemy: !!isEnemy, defeated: false,
      conditions: [], deathSucc: 0, deathFail: 0,
    }]);
    setCurrentId(prev => prev || id);
  };

  const handleAdd = () => {
    if (!fName.trim()) return;
    addCombatant(fName.trim(), fInit || '10', fHp || '0', fNpc, fEnemy);
    setFName(''); setFInit(''); setFHp('');
  };

  const toggleEnemy = (id) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, isEnemy: !c.isEnemy } : c
    ));
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

  const confirmEditHp = () => {
    const n = parseInt(editHpVal);
    if (!isNaN(n)) {
      setCombatants(prev => prev.map(c =>
        c.id === editHpId ? { ...c, hp: Math.max(0, c.maxHp > 0 ? Math.min(n, c.maxHp) : n) } : c
      ));
    }
    setEditHpId(null);
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
    if (id === expandedId) setExpandedId(null);
  };

  const toggleCondition = (id, condId) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        conditions: c.conditions.includes(condId)
          ? c.conditions.filter(x => x !== condId)
          : [...c.conditions, condId],
      } : c
    ));
  };

  const setDeathSave = (id, field, val) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, [field]: Math.max(0, Math.min(3, val)) } : c
    ));
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
    setCombatants([]); setRound(1); setCurrentId(null); setExpandedId(null);
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>
          {t('init.empty')}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sorted.map(c => {
            const isCurrent  = c.id === current?.id;
            const isExpanded = expandedId === c.id;
            const hpPct      = c.maxHp > 0 ? c.hp / c.maxHp : 1;
            const hpColor    = hpPct > 0.5 ? '#6ab675' : hpPct > 0.25 ? '#d4a84c' : '#e07070';
            const isDying    = c.hp === 0 && !c.defeated && c.maxHp > 0;
            const isStable   = c.deathSucc >= 3;
            const isDead     = c.deathFail >= 3;
            const activeConds = CONDITIONS.filter(cond => c.conditions.includes(cond.id));

            const sideColor = c.isEnemy ? '#e07070' : '#7ab8d4';
            const sideBg    = c.isEnemy ? 'rgba(224,112,112,.15)' : 'rgba(122,184,212,.15)';

            return (
              <div key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Main row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                  background: isCurrent ? 'var(--gold-glow)' : 'transparent',
                  borderLeft: `3px solid ${isCurrent ? 'var(--gold)' : sideColor}`,
                  opacity: c.defeated ? .45 : 1, transition: 'background .15s, border-color .15s',
                }}>

                  {/* Initiative bubble — click to toggle side */}
                  <div
                    onClick={() => toggleEnemy(c.id)}
                    title={t(c.isEnemy ? 'init.enemy' : 'init.ally')}
                    style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isCurrent ? 'var(--gold-glow)' : sideBg,
                      border: `2px solid ${isCurrent ? 'var(--gold)' : sideColor}`,
                      cursor: 'pointer', transition: 'all .2s',
                    }}>
                    <span style={{ fontSize: 15, fontFamily: "'Playfair Display', serif", color: isCurrent ? 'var(--gold)' : sideColor, fontWeight: 700, lineHeight: 1 }}>
                      {c.initiative}
                    </span>
                  </div>

                  {/* Name + HP + conditions */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: c.maxHp > 0 ? 5 : 0 }}>
                      {c.isNpc && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3, padding: '0 4px', flexShrink: 0, lineHeight: '16px' }}>
                          NPC
                        </span>
                      )}
                      <span style={{ fontSize: 15, color: c.defeated ? 'var(--text-muted)' : 'var(--text)', fontFamily: "'Crimson Pro', serif", textDecoration: c.defeated ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </span>
                    </div>

                    {/* HP row */}
                    {c.maxHp > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {/* Thin bar */}
                        <div style={{ width: 60, flexShrink: 0, height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(hpPct * 100, 100)}%`, height: '100%', background: c.defeated ? '#555' : hpColor, transition: 'width .25s' }} />
                        </div>
                        {/* HP number — clickable to edit */}
                        {editHpId === c.id ? (
                          <input
                            autoFocus type="number" min="0" value={editHpVal}
                            onChange={e => setEditHpVal(e.target.value)}
                            onBlur={confirmEditHp}
                            onKeyDown={e => { if (e.key === 'Enter') confirmEditHp(); if (e.key === 'Escape') setEditHpId(null); }}
                            style={{ width: 52, fontSize: 13, textAlign: 'center', background: 'var(--surface2)', border: '1px solid var(--gold-dim)', borderRadius: 4, color: 'var(--text)', padding: '2px 4px', outline: 'none', fontFamily: 'monospace', flexShrink: 0 }}
                          />
                        ) : (
                          <span
                            title={t('init.hp_edit_title')}
                            onClick={() => { if (!c.defeated) { setEditHpId(c.id); setEditHpVal(String(c.hp)); } }}
                            style={{ fontSize: 13, fontFamily: 'monospace', flexShrink: 0, cursor: c.defeated ? 'default' : 'text', userSelect: 'none', lineHeight: 1 }}>
                            <span style={{ color: c.defeated ? 'var(--text-muted)' : hpColor, fontWeight: 700 }}>{c.hp}</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{c.maxHp}</span>
                          </span>
                        )}
                        {/* Dying status inline */}
                        {isDying && (
                          <span style={{ fontSize: 11, color: isDead ? '#e07070' : isStable ? '#6ab675' : '#d4a84c', fontStyle: 'italic', flexShrink: 0 }}>
                            {isDead ? t('init.dead_txt') : isStable ? t('init.stable') : t('init.dying')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Active conditions */}
                    {activeConds.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                        {activeConds.map(cond => (
                          <span key={cond.id}
                            onClick={() => toggleCondition(c.id, cond.id)}
                            title={condLabel(cond)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: cond.color + '28', border: `1px solid ${cond.color}80`, color: cond.color, cursor: 'pointer', lineHeight: 1.2 }}>
                            <span style={{ fontSize: 12 }}>{cond.icon}</span>
                            <span>{condLabel(cond)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* HP ±1 buttons */}
                  {!c.defeated && c.maxHp > 0 && (
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <button onClick={() => updateHp(c.id, -1)}
                        style={{ width: 28, height: 28, background: 'rgba(224,112,112,.15)', border: '1px solid rgba(224,112,112,.6)', color: '#e07070', borderRadius: 5, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>−</button>
                      <button onClick={() => updateHp(c.id, 1)}
                        style={{ width: 28, height: 28, background: 'rgba(106,182,117,.15)', border: '1px solid rgba(106,182,117,.6)', color: '#6ab675', borderRadius: 5, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>+</button>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    {/* Expand toggle */}
                    <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      title={t('init.expand_conditions')}
                      style={{ background: isExpanded ? 'var(--gold-glow)' : 'var(--surface2)', border: `1px solid ${isExpanded ? 'var(--gold-dim)' : 'var(--border)'}`, color: isExpanded ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '5px 8px', borderRadius: 5, transition: 'all .15s' }}>
                      {isExpanded ? '▴' : '▾'}
                    </button>

                    {/* Defeat / Revive */}
                    <button onClick={() => toggleDefeated(c.id)}
                      title={c.defeated ? t('init.revive') : t('init.defeat')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12,
                        fontFamily: "'Crimson Pro', serif", transition: 'all .15s', whiteSpace: 'nowrap',
                        background: c.defeated ? 'rgba(106,182,117,.18)' : 'rgba(224,112,112,.18)',
                        border: `1px solid ${c.defeated ? 'rgba(106,182,117,.6)' : 'rgba(224,112,112,.6)'}`,
                        color: c.defeated ? '#6ab675' : '#e07070',
                      }}>
                      <span>{c.defeated ? '↩' : '☠'}</span>
                      <span>{c.defeated ? t('init.revive') : t('init.defeat')}</span>
                    </button>

                    {/* Remove */}
                    <button onClick={() => removeCombatant(c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '2px 5px', opacity: .5, lineHeight: 1, transition: 'opacity .15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = .5}>×</button>
                  </div>
                </div>

                {/* Expanded panel: conditions + death saves + save NPC */}
                {isExpanded && (
                  <div style={{ padding: '12px 14px 14px', background: 'var(--surface2)', borderLeft: `3px solid ${isCurrent ? 'var(--gold-dim)' : 'var(--border)'}` }}>
                    {/* Save NPC to world — inside expanded, less prominent */}
                    {c.isNpc && (
                      <button
                        onClick={() => saveNpc(c)}
                        disabled={savedIds.has(c.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          marginBottom: 12, padding: '5px 12px', borderRadius: 5, fontSize: 12,
                          fontFamily: "'Crimson Pro', serif", cursor: savedIds.has(c.id) ? 'default' : 'pointer',
                          background: savedIds.has(c.id) ? 'rgba(106,182,117,.15)' : 'var(--surface)',
                          border: `1px solid ${savedIds.has(c.id) ? 'rgba(106,182,117,.5)' : 'var(--border)'}`,
                          color: savedIds.has(c.id) ? '#6ab675' : 'var(--text-muted)',
                          transition: 'all .15s',
                        }}>
                        <span>{savedIds.has(c.id) ? '✓' : '💾'}</span>
                        <span>{savedIds.has(c.id) ? t('init.npc_saved') : t('init.save_npc')}</span>
                      </button>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8, fontWeight: 600 }}>
                      {t('init.conditions_lbl')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: isDying ? 14 : 0 }}>
                      {CONDITIONS.map(cond => {
                        const isActive = c.conditions.includes(cond.id);
                        return (
                          <button key={cond.id} onClick={() => toggleCondition(c.id, cond.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 9px', fontSize: 12, cursor: 'pointer',
                              borderRadius: 'var(--r)', fontFamily: "'Crimson Pro', serif",
                              background: isActive ? cond.color + '28' : 'var(--surface)',
                              border: `1px solid ${isActive ? cond.color + 'cc' : 'var(--border)'}`,
                              color: isActive ? cond.color : 'var(--text)',
                              transition: 'all .15s',
                            }}>
                            <span style={{ fontSize: 14 }}>{cond.icon}</span>
                            <span>{condLabel(cond)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isDying && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, fontWeight: 600 }}>
                          {t('init.death_saves_lbl')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#6ab675', width: 76, flexShrink: 0, fontFamily: "'Crimson Pro', serif" }}>{t('init.death_succ')}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {[0, 1, 2].map(i => (
                                <DeathDot key={i} filled={c.deathSucc > i} color="#6ab675"
                                  onClick={() => setDeathSave(c.id, 'deathSucc', c.deathSucc > i ? i : i + 1)} />
                              ))}
                            </div>
                            {isStable && <span style={{ fontSize: 12, color: '#6ab675', fontStyle: 'italic' }}>{t('init.stable')}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#e07070', width: 76, flexShrink: 0, fontFamily: "'Crimson Pro', serif" }}>{t('init.death_fail')}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {[0, 1, 2].map(i => (
                                <DeathDot key={i} filled={c.deathFail > i} color="#e07070"
                                  onClick={() => setDeathSave(c.id, 'deathFail', c.deathFail > i ? i : i + 1)} />
                              ))}
                            </div>
                            {isDead && <span style={{ fontSize: 12, color: '#e07070', fontStyle: 'italic' }}>{t('init.dead_txt')}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

        {/* Quick-add */}
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
            style={{ flex: '0 0 50px', width: '50px', minWidth: '0', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 2px', outline: 'none', textAlign: 'center' }} />
          <input id="initHpInput" type="number" placeholder="HP" value={fHp}
            onChange={e => setFHp(e.target.value)}
            style={{ flex: '0 0 50px', width: '50px', minWidth: '0', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 2px', outline: 'none', textAlign: 'center' }} />
        </div>

        {/* Ally / Enemy toggle + mod + roll */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
          <button type="button" onClick={() => setFEnemy(false)}
            style={{ flex: 1, padding: '5px 8px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro', serif", transition: 'all .15s', background: !fEnemy ? 'rgba(122,184,212,.2)' : 'var(--surface)', border: `1px solid ${!fEnemy ? '#7ab8d4' : 'var(--border)'}`, color: !fEnemy ? '#7ab8d4' : 'var(--text-muted)' }}>
            🛡 {t('init.ally')}
          </button>
          <button type="button" onClick={() => setFEnemy(true)}
            style={{ flex: 1, padding: '5px 8px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro', serif", transition: 'all .15s', background: fEnemy ? 'rgba(224,112,112,.2)' : 'var(--surface)', border: `1px solid ${fEnemy ? '#e07070' : 'var(--border)'}`, color: fEnemy ? '#e07070' : 'var(--text-muted)' }}>
            ⚔ {t('init.enemy')}
          </button>
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
