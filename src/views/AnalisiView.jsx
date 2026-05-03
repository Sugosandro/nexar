// src/views/AnalisiView.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useWorld } from '../hooks/useWorld';
import ElementModal from '../components/ElementModal';
import {
  subscribeProposals, saveProposals,
  deleteProposal, deleteAllProposals,
} from '../firebase/db';

// ── Stima token (approssimazione: ~4 chars per token) ──────────────────────
const estimateTokens = (str) => Math.ceil((str || '').length / 4);
const TOKEN_WARN  = 80_000;   // warning giallo
const TOKEN_BLOCK = 180_000;  // blocco rosso (limite sicuro per claude-sonnet)

// ── Colori per tipo proposta ───────────────────────────────────────────────
const TIPO_META = {
  incongruenza:     { label: 'Incongruenza',      color: '#e07070', bg: '#3a1515', icon: '⚠' },
  nuovo_elemento:   { label: 'Nuovo elemento',     color: '#8ec8e4', bg: '#1e3d50', icon: '✦' },
  nuova_connessione:{ label: 'Nuova connessione',  color: '#9fcd8c', bg: '#223818', icon: '🔗' },
  approfondimento:  { label: 'Approfondimento',    color: '#d4a84c', bg: '#3a2a08', icon: '💡' },
};

// ── Divide testo in capitoli ───────────────────────────────────────────────
function splitChapters(text) {
  // Splitta su righe che iniziano con #, Capitolo, Chapter, --- o ===
  const lines = text.split('\n');
  const chapters = [];
  let current = { title: 'Inizio', lines: [] };

  for (const line of lines) {
    const isHeader =
      /^#{1,3}\s/.test(line) ||
      /^(capitolo|chapter|parte|part|prologo|epilogo)\s/i.test(line.trim()) ||
      /^[-=]{3,}$/.test(line.trim());

    if (isHeader && current.lines.length > 20) {
      chapters.push({ ...current, text: current.lines.join('\n').trim() });
      current = { title: line.replace(/^#{1,3}\s/, '').trim() || line.trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) {
    chapters.push({ ...current, text: current.lines.join('\n').trim() });
  }
  return chapters.filter(c => c.text.length > 50);
}

// ── Costruisce il contesto mondo da mandare all'IA ─────────────────────────
function buildWorldContext(elements, arcs, fazioni, magie, allCats) {
  const cats = allCats();
  const elById = (id) => elements.find(e => e.id === id);

  const elSummary = elements.map(e => ({
    id: e.id,
    nome: e.name,
    categoria: cats.find(c => c.id === e.cat)?.name || e.cat,
    sottocategoria: e.sub || null,
    importanza: e.importance || 'minore',
    descrizione: e.desc ? e.desc.slice(0, 200) : null,
    // Connessioni via tag (bidirezionali — mostra solo uscenti per evitare duplicati)
    connessioni: (e.tags || [])
      .map(tid => elById(tid)?.name).filter(Boolean),
    // Fazioni e archi di appartenenza
    fazioni: fazioni.filter(f => (f.members||[]).includes(e.id)).map(f => f.name),
    archi:   arcs.filter(a => (a.members||[]).includes(e.id)).map(a => a.name),
    // Poteri
    poteri: (e.powers || []).map(p => ({
      nome: p.name,
      intensita: p.intensita,
      desc: p.desc ? p.desc.slice(0, 100) : null,
    })),
    // Equipaggiamento
    equipaggiamento: (e.equip || [])
      .map(id => elById(id)?.name).filter(Boolean),
    // Storico narrativo (ultime 10 voci)
    storico: (e.changelog || []).slice(-10).map(c => ({
      data: c.date,
      luogo: c.placeId ? elById(c.placeId)?.name : null,
      testo: c.text ? c.text.slice(0, 120) : null,
    })).filter(c => c.testo),
  }));

  // Connessioni esplicite tra fazioni
  const relazioniFazioni = [];
  fazioni.forEach(f => {
    (f.rels || []).forEach(r => {
      const altra = fazioni.find(x => x.id === r.fazId);
      if (altra) relazioniFazioni.push({
        da: f.name, a: altra.name,
        tipo: r.type === 'ally' ? 'alleata' : r.type === 'enemy' ? 'nemica' : 'neutrale',
      });
    });
  });

  return JSON.stringify({
    elementi: elSummary,
    archi: arcs.map(a => ({
      nome: a.name,
      desc: a.desc?.slice(0, 150),
      fasi: a.phases,
      fase_corrente: a.currentPhase || null,
      membri: (a.members||[]).map(id => elById(id)?.name).filter(Boolean),
    })),
    fazioni: fazioni.map(f => ({
      nome: f.name,
      desc: f.desc?.slice(0, 150),
      motto: f.motto || null,
      membri: (f.members||[]).map(id => elById(id)?.name).filter(Boolean),
    })),
    relazioni_fazioni: relazioniFazioni,
    sistemi_magia: magie.map(m => ({
      nome: m.name,
      desc: m.desc?.slice(0, 150),
      regole: (m.rules || []).slice(0, 5),
      utenti: (m.users || []).map(id => elById(id)?.name).filter(Boolean),
    })),
  }, null, 0);
}

// ── Prompt per un singolo capitolo ────────────────────────────────────────
function buildChapterPrompt(chapterText, chapterTitle, worldContext, chapterIndex, totalChapters) {
  return `Sei un editor letterario che analizza un testo narrativo confrontandolo con la bibbia di un mondo fantasy/narrativo.

STORIA (JSON):
${worldContext}

TESTO DA ANALIZZARE — ${chapterTitle} (${chapterIndex+1}/${totalChapters}):
${chapterText}

Analizza questo capitolo e identifica:
1. INCONGRUENZE: fatti nel testo che contraddicono la storia — nomi sbagliati, relazioni impossibili, proprietà fisiche errate, continuity errors, personaggi che conoscono cose che non dovrebbero sapere, poteri usati in modo incompatibile con le regole del sistema di magia, equipaggiamento usato da chi non lo possiede, spostamenti impossibili rispetto allo storico narrativo
2. NUOVI ELEMENTI: personaggi, luoghi, oggetti o eventi menzionati nel testo ma completamente assenti dalla bibbia
3. NUOVE CONNESSIONI: relazioni tra elementi già esistenti in bibbia che emergono dal testo ma non sono registrate come connessioni (tag) — es. due personaggi che si conoscono, un oggetto che appartiene a qualcuno, un personaggio che fa parte di una fazione non registrata
4. APPROFONDIMENTI: dettagli narrativi rilevanti nel testo che arricchirebbero la bibbia — backstory, motivazioni, descrizioni fisiche, abilità specifiche, date o luoghi storici

Rispondi SOLO con un array JSON valido, nessun testo prima o dopo. Ogni proposta deve avere questa struttura:
[
  {
    "tipo": "incongruenza" | "nuovo_elemento" | "nuova_connessione" | "approfondimento",
    "titolo": "titolo breve della proposta",
    "descrizione": "spiegazione dettagliata di cosa hai trovato e perché è rilevante",
    "capitolo": "${chapterTitle}",
    "dati": {
      // Per nuovo_elemento:
      "cat": "char|place|object|event",
      "name": "nome elemento",
      "desc": "descrizione suggerita",
      "importance": "protagonista|primario|secondario|minore",
      // Per nuova_connessione:
      "elemento_a": "nome elemento esistente",
      "elemento_b": "nome elemento esistente",
      "relazione": "descrizione della relazione",
      // Per incongruenza/approfondimento:
      "elemento_coinvolto": "nome elemento coinvolto se applicabile",
      "testo_originale": "citazione breve dal testo (max 80 chars)"
    }
  }
]

Se non trovi nulla di rilevante per una categoria, omettila. Se non trovi nulla in assoluto, rispondi con [].`;
}

// ── Card singola proposta ──────────────────────────────────────────────────
function ProposalCard({ proposal, elements, onAccept, onDiscard, onOpenElement }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TIPO_META[proposal.tipo] || TIPO_META.approfondimento;

  // Trova elementi collegati per aprirli
  const linkedEl = useMemo(() => {
    const names = [
      proposal.dati?.elemento_a,
      proposal.dati?.elemento_b,
      proposal.dati?.elemento_coinvolto,
    ].filter(Boolean);
    return names.map(n => elements.find(e => e.name.toLowerCase() === n.toLowerCase())).filter(Boolean);
  }, [proposal, elements]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${meta.color}44`,
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Header */}
      <div onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.bg, color: meta.color, flexShrink: 0, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {meta.label}
        </span>
        {proposal.capitolo && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, fontStyle: 'italic' }}>
            {proposal.capitolo}
          </span>
        )}
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {proposal.titolo}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${meta.color}22` }}>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, marginTop: 12, marginBottom: 12 }}>
            {proposal.descrizione}
          </p>

          {/* Citazione originale */}
          {proposal.dati?.testo_originale && (
            <div style={{ margin: '8px 0 12px', padding: '8px 12px', background: 'var(--surface2)', borderLeft: '2px solid var(--border-light)', borderRadius: '0 4px 4px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              "{proposal.dati.testo_originale}"
            </div>
          )}

          {/* Dati specifici */}
          {proposal.tipo === 'nuovo_elemento' && proposal.dati?.name && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {proposal.dati.cat && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text-muted)' }}>{proposal.dati.cat}</span>}
              {proposal.dati.importance && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--gold)' }}>{proposal.dati.importance}</span>}
            </div>
          )}

          {proposal.tipo === 'nuova_connessione' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: 'var(--text)', fontStyle: 'italic' }}>{proposal.dati?.elemento_a}</span>
              <span style={{ color: 'var(--text-muted)' }}>↔</span>
              <span style={{ color: 'var(--text)', fontStyle: 'italic' }}>{proposal.dati?.elemento_b}</span>
            </div>
          )}

          {/* Elementi collegati cliccabili */}
          {linkedEl.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
              {linkedEl.map(el => (
                <button key={el.id} onClick={() => onOpenElement(el.id)}
                  style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--surface3)', border: '1px solid var(--border-light)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif" }}>
                  → {el.name}
                </button>
              ))}
            </div>
          )}

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn-d" style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => onDiscard(proposal.id)}>
              ✕ Scarta
            </button>
            {proposal.tipo === 'nuovo_elemento' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                ✦ Crea elemento →
              </button>
            )}
            {proposal.tipo === 'nuova_connessione' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                🔗 Aggiungi connessione →
              </button>
            )}
            {(proposal.tipo === 'incongruenza' || proposal.tipo === 'approfondimento') && (
              <button className="btn-g" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                📋 Prendi nota →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPALE ──────────────────────────────────────────────────
export default function AnalisiView({ onOpenElement, showToast }) {
  const { elements, arcs, fazioni, magie, allCats, uid, wid, addEl } = useWorld();

  // Testo (solo in memoria)
  const [text,          setText]          = useState('');
  const [chapters,      setChapters]      = useState([]);
  const [tokenEstimate, setTokenEstimate] = useState(0);

  // Stato analisi
  const [analyzing,     setAnalyzing]     = useState(false);
  const [progress,      setProgress]      = useState({ current: 0, total: 0, label: '' });
  const [error,         setError]         = useState('');

  // Proposte (da Firestore)
  const [proposals,     setProposals]     = useState([]);
  const [loadingProps,  setLoadingProps]  = useState(true);

  // Filtri proposte
  const [filterTipo,    setFilterTipo]    = useState('');
  const [filterCap,     setFilterCap]     = useState('');

  // Modal accetta
  const [acceptModal,   setAcceptModal]   = useState(null); // proposta da accettare

  const textareaRef = useRef(null);

  // ── Subscribe proposte Firestore ──
  useEffect(() => {
    if (!uid || !wid) return;
    const unsub = subscribeProposals(uid, wid, data => {
      setProposals(data);
      setLoadingProps(false);
    });
    return unsub;
  }, [uid, wid]);

  // ── Aggiorna stima token e capitoli quando cambia il testo ──
  useEffect(() => {
    if (!text) { setChapters([]); setTokenEstimate(0); return; }
    const worldCtx = buildWorldContext(elements, arcs, fazioni, magie, allCats);
    const chaps = splitChapters(text);
    setChapters(chaps);
    // Stima pessimistica: testo + contesto mondo * numero capitoli
    const est = chaps.reduce((acc, c) => acc + estimateTokens(c.text) + estimateTokens(worldCtx) + 800, 0);
    setTokenEstimate(est);
  }, [text, elements, arcs, fazioni, magie]);

  // ── Analisi per capitolo ──
  const runAnalysis = async () => {
    if (!text.trim() || chapters.length === 0) return;
    if (tokenEstimate > TOKEN_BLOCK) return;

    setAnalyzing(true);
    setError('');
    const worldContext = buildWorldContext(elements, arcs, fazioni, magie, allCats);
    const newProposals = [];

    for (let i = 0; i < chapters.length; i++) {
      const chap = chapters[i];
      setProgress({ current: i + 1, total: chapters.length, label: chap.title });

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: buildChapterPrompt(chap.text, chap.title, worldContext, i, chapters.length),
            }],
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const raw = data.content?.find(b => b.type === 'text')?.text || '[]';

        // Parsing robusto — gestisce JSON troncato o con testo extra
        let parsed = [];
        try {
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            parsed = JSON.parse(match[0]);
          }
        } catch {
          // JSON troncato — recupera oggetti completi uno per uno
          const objMatches = raw.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          for (const m of objMatches) {
            try {
              const obj = JSON.parse(m[0]);
              if (obj.titolo && obj.tipo) parsed.push(obj);
            } catch { /* oggetto malformato, salta */ }
          }
        }
        // Deduplicazione per titolo
        for (const p of parsed) {
          const isDup = newProposals.some(ex => ex.titolo === p.titolo) ||
                        proposals.some(ex => ex.titolo === p.titolo);
          if (!isDup && p.titolo && p.tipo) {
            newProposals.push(p);
          }
        }
      } catch (e) {
        console.error(`Capitolo ${i+1}:`, e);
        setError(`Errore al capitolo "${chap.title}": ${e.message}`);
        // Continua con i prossimi capitoli
      }
    }

    if (newProposals.length > 0) {
      await saveProposals(uid, wid, newProposals);
      showToast(`✓ ${newProposals.length} nuove proposte generate`);
    } else {
      showToast('Analisi completata — nessuna nuova proposta');
    }

    setAnalyzing(false);
    setProgress({ current: 0, total: 0, label: '' });
  };

  // ── Scarta proposta ──
  const handleDiscard = async (pid) => {
    await deleteProposal(uid, wid, pid);
    showToast('Proposta scartata');
  };

  // ── Accetta proposta ──
  const handleAccept = (proposal) => {
    setAcceptModal(proposal);
  };

  // ── Costruisce initialData per ElementModal dalla proposta ──
  const proposalToInitialData = (proposal) => {
    if (proposal.tipo === 'nuovo_elemento') {
      return {
        cat:        proposal.dati?.cat || 'char',
        name:       proposal.dati?.name || '',
        desc:       proposal.dati?.desc || proposal.descrizione || '',
        importance: proposal.dati?.importance || 'secondario',
        status:     'draft',
        tags:       [],
        extra:      {},
        powers:     [],
        equip:      [],
        changelog:  [],
        notes:      `Suggerito dall'analisi — ${proposal.capitolo || ''}\n\n${proposal.descrizione}`,
      };
    }
    if (proposal.tipo === 'nuova_connessione') {
      // Pre-compila come personaggio con nota sulla connessione
      const elA = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_a || '').toLowerCase());
      const elB = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_b || '').toLowerCase());
      return {
        cat:        'char',
        name:       `Connessione: ${proposal.dati?.elemento_a} ↔ ${proposal.dati?.elemento_b}`,
        desc:       proposal.dati?.relazione || proposal.descrizione || '',
        importance: 'minore',
        status:     'draft',
        tags:       [elA?.id, elB?.id].filter(Boolean),
        extra:      {},
        powers:     [],
        equip:      [],
        changelog:  [],
        notes:      `Suggerito dall'analisi — ${proposal.capitolo || ''}\n\n${proposal.descrizione}`,
      };
    }
    // incongruenza / approfondimento → nota libera
    return {
      cat:        'char',
      name:       proposal.titolo || '',
      desc:       proposal.descrizione || '',
      importance: 'minore',
      status:     'draft',
      tags:       [],
      extra:      {},
      powers:     [],
      equip:      [],
      changelog:  [],
      notes:      `Capitolo: ${proposal.capitolo || '—'}\n\n${proposal.descrizione}`,
    };
  };

  // ── Filtri sulle proposte ──
  const filteredProposals = useMemo(() => {
    let p = proposals;
    if (filterTipo) p = p.filter(x => x.tipo === filterTipo);
    if (filterCap)  p = p.filter(x => x.capitolo === filterCap);
    return p;
  }, [proposals, filterTipo, filterCap]);

  const capList = useMemo(() => [...new Set(proposals.map(p => p.capitolo).filter(Boolean))], [proposals]);

  // ── Indicatore token ──
  const tokenColor = tokenEstimate === 0 ? 'var(--text-muted)'
    : tokenEstimate > TOKEN_BLOCK ? '#e07070'
    : tokenEstimate > TOKEN_WARN  ? '#d4a84c'
    : '#9fcd8c';

  const tokenLabel = tokenEstimate === 0 ? '—'
    : tokenEstimate > TOKEN_BLOCK ? `~${Math.round(tokenEstimate/1000)}k token — TROPPO LUNGO`
    : tokenEstimate > TOKEN_WARN  ? `~${Math.round(tokenEstimate/1000)}k token — lungo, potrebbe essere lento`
    : `~${Math.round(tokenEstimate/1000)}k token — ok`;

  // ── Conteggi per tipo ──
  const counts = useMemo(() => {
    const c = {};
    proposals.forEach(p => { c[p.tipo] = (c[p.tipo] || 0) + 1; });
    return c;
  }, [proposals]);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">Ana<span>lisi</span></div>
        {proposals.length > 0 && (
          <button className="btn-d" style={{ fontSize: 12 }}
            onClick={async () => {
              if (!window.confirm(`Eliminare tutte le ${proposals.length} proposte salvate?`)) return;
              await deleteAllProposals(uid, wid);
              showToast('🗑 Tutte le proposte eliminate');
            }}>
            🗑 Svuota tutto
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Colonna sinistra: input testo ── */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)' }}>Testo da analizzare</div>
              {text && (
                <button className="btn-g" style={{ fontSize: 11 }} onClick={() => setText('')}>✕ Cancella</button>
              )}
            </div>

            {/* Upload file */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border-light)', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', marginBottom: 10, fontSize: 13, color: 'var(--text-muted)', transition: 'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span>Carica file .txt o .md</span>
              <input type="file" accept=".txt,.md" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setText(ev.target.result);
                  reader.readAsText(file);
                  e.target.value = '';
                }} />
            </label>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>oppure</div>

            <textarea ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Incolla qui il testo della storia…"
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 7, color: 'var(--text)', fontFamily: "'Crimson Pro', serif",
                fontSize: 14, padding: '10px 12px', outline: 'none', resize: 'vertical',
                minHeight: 200, lineHeight: 1.65,
              }} />

            {/* Stima token */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: tokenColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: tokenColor }}>{tokenLabel}</span>
            </div>

            {/* Avviso blocco */}
            {tokenEstimate > TOKEN_BLOCK && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: '#3a1515', border: '1px solid #e0707055', borderRadius: 7, fontSize: 13, color: '#e07070', lineHeight: 1.6 }}>
                ⚠ Il testo è troppo lungo per essere analizzato in un'unica sessione. Prova a dividerlo in parti più piccole e caricale separatamente.
              </div>
            )}

            {/* Avviso warning */}
            {tokenEstimate > TOKEN_WARN && tokenEstimate <= TOKEN_BLOCK && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: '#3a2a08', border: '1px solid #d4a84c55', borderRadius: 7, fontSize: 13, color: '#d4a84c', lineHeight: 1.6 }}>
                ⚠ Il testo è lungo. L'analisi richiederà più tempo e chiamate API multiple. Puoi procedere, ma tieniti pronto ad aspettare.
              </div>
            )}
          </div>

          {/* Anteprima capitoli */}
          {chapters.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
                {chapters.length} capitoli / sezioni rilevati
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {chapters.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '5px 8px', borderRadius: 5, background: 'var(--surface2)' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 22, fontSize: 11 }}>{i + 1}.</span>
                    <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>~{estimateTokens(c.text).toLocaleString()} tok</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pulsante analisi */}
          <button
            onClick={runAnalysis}
            disabled={!text.trim() || analyzing || tokenEstimate > TOKEN_BLOCK}
            style={{
              width: '100%',
              padding: '13px 20px',
              background: analyzing ? 'var(--surface2)' : 'var(--gold-glow)',
              border: `1px solid ${analyzing ? 'var(--border)' : 'var(--gold-dim)'}`,
              borderRadius: 8,
              color: analyzing ? 'var(--text-muted)' : 'var(--gold)',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 16,
              cursor: analyzing || !text.trim() || tokenEstimate > TOKEN_BLOCK ? 'not-allowed' : 'pointer',
              transition: 'all .2s',
              opacity: !text.trim() || tokenEstimate > TOKEN_BLOCK ? .5 : 1,
            }}>
            {analyzing
              ? `⏳ Analisi in corso — capitolo ${progress.current}/${progress.total}: "${progress.label}"…`
              : `🔍 Avvia analisi${chapters.length > 1 ? ` (${chapters.length} capitoli)` : ''}`
            }
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#3a1515', border: '1px solid #e0707055', borderRadius: 7, fontSize: 13, color: '#e07070' }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Colonna destra: proposte ── */}
        <div>
          {/* Header proposte con contatori */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: proposals.length > 0 ? 12 : 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)' }}>
                Proposte salvate
                {proposals.length > 0 && <span style={{ marginLeft: 8, color: 'var(--text)', fontWeight: 600 }}>{proposals.length}</span>}
              </div>
            </div>

            {/* Badge contatori per tipo */}
            {proposals.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {Object.entries(TIPO_META).map(([tipo, meta]) => counts[tipo] ? (
                  <button key={tipo}
                    onClick={() => setFilterTipo(filterTipo === tipo ? '' : tipo)}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                      background: filterTipo === tipo ? meta.bg : 'var(--surface2)',
                      border: `1px solid ${filterTipo === tipo ? meta.color + '88' : 'var(--border)'}`,
                      color: filterTipo === tipo ? meta.color : 'var(--text-muted)',
                      fontFamily: "'Crimson Pro', serif",
                      transition: 'all .15s',
                    }}>
                    {meta.icon} {meta.label} ({counts[tipo]})
                  </button>
                ) : null)}
              </div>
            )}

            {/* Filtro capitolo */}
            {capList.length > 1 && (
              <select className="fs" style={{ margin: 0, fontSize: 12, padding: '4px 10px' }}
                value={filterCap} onChange={e => setFilterCap(e.target.value)}>
                <option value="">Tutti i capitoli</option>
                {capList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Lista proposte */}
          {loadingProps ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
              Caricamento proposte…
            </div>
          ) : filteredProposals.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14, padding: '30px 0', textAlign: 'center', lineHeight: 1.8 }}>
              {proposals.length === 0
                ? 'Nessuna proposta ancora.\nCarica un testo e avvia l\'analisi.'
                : 'Nessuna proposta per i filtri selezionati.'}
            </div>
          ) : (
            <div>
              {filteredProposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  elements={elements}
                  onAccept={handleAccept}
                  onDiscard={handleDiscard}
                  onOpenElement={onOpenElement}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal accetta proposta ── */}
      {acceptModal && (
        <ElementModal
          initialData={proposalToInitialData(acceptModal)}
          defaultCat={acceptModal.dati?.cat || 'char'}
          onSave={async (data, birthDate) => {
            await addEl(data);
            await deleteProposal(uid, wid, acceptModal.id);
            setAcceptModal(null);
            showToast('✓ Elemento creato dalla proposta');
          }}
          onClose={() => setAcceptModal(null)}
        />
      )}
    </div>
  );
}
