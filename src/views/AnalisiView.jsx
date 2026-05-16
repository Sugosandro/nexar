// src/views/AnalisiView.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import { TAG_IMPORTANCE, TAG_IMP_COLOR, TAG_IMP_LABEL } from '../hooks/useWorld';
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
  incongruenza:       { labelKey: 'analisi.tipo_incongruenza',      color: '#e07070', bg: '#3a1515', icon: '⚠' },
  nuovo_elemento:     { labelKey: 'analisi.tipo_nuovo_elemento',     color: '#8ec8e4', bg: '#1e3d50', icon: '✦' },
  nuova_connessione:  { labelKey: 'analisi.tipo_nuova_connessione',  color: '#9fcd8c', bg: '#223818', icon: '🔗' },
  approfondimento:    { labelKey: 'analisi.tipo_approfondimento',    color: '#d4a84c', bg: '#3a2a08', icon: '💡' },
  nuovo_potere:       { labelKey: 'analisi.tipo_nuovo_potere',       color: '#c89fd4', bg: '#2e1e3c', icon: '⚡' },
  modifica_desc:      { labelKey: 'analisi.tipo_modifica_desc',      color: '#a0d0c0', bg: '#1a3830', icon: '✏' },
  modifica_tag:       { labelKey: 'analisi.tipo_modifica_tag',       color: '#f0c060', bg: '#3a2a08', icon: '🏷' },
  modifica_fazione:   { labelKey: 'analisi.tipo_modifica_fazione',   color: '#f5bec5', bg: '#3c1820', icon: '⚔' },
  modifica_magia:     { labelKey: 'analisi.tipo_modifica_magia',     color: '#a0d0c0', bg: '#1a3830', icon: '✨' },
  modifica_arco:      { labelKey: 'analisi.tipo_modifica_arco',      color: '#d4a84c', bg: '#3a2a08', icon: '📖' },
  aggiorna_evento:    { labelKey: 'analisi.tipo_aggiorna_evento',    color: '#7ab8d4', bg: '#1a3040', icon: '📅' },
};

// ── Divide testo in capitoli ───────────────────────────────────────────────
function splitChapters(text, customSep = '', defaultTitle = 'Inizio', getSectionTitle = (n) => `Sezione ${n}`) {
  const lines = text.split('\n');
  const chapters = [];
  let current = { title: defaultTitle, lines: [] };

  const sepRegex = customSep.trim()
    ? new RegExp('^' + customSep.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(.*)$', 'i')
    : null;

  for (const line of lines) {
    const isCustom = sepRegex && sepRegex.test(line.trim());
    const isAuto   = !customSep.trim() && (
      /^#{1,3}\s/.test(line) ||
      /^(capitolo|chapter|parte|part|prologo|epilogo)\s/i.test(line.trim()) ||
      /^[-=]{3,}$/.test(line.trim())
    );

    if ((isCustom || isAuto) && current.lines.length > 5) {
      chapters.push({ ...current, text: current.lines.join('\n').trim() });
      let title = line.trim();
      if (isCustom && customSep.trim()) {
        title = line.replace(new RegExp(customSep.trim(), 'i'), '').trim() || getSectionTitle(chapters.length + 1);
      } else {
        title = line.replace(/^#{1,3}\s/, '').trim() || line.trim();
      }
      current = { title, lines: [] };
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
function buildChapterPrompt(chapterText, chapterTitle, worldContext, chapterIndex, totalChapters, lang = 'it') {
  if (lang === 'en') return buildChapterPromptEN(chapterText, chapterTitle, worldContext, chapterIndex, totalChapters);
  return `Sei un editor letterario che analizza un testo narrativo confrontandolo con la bibbia di un mondo fantasy/narrativo.

STORIA (JSON):
${worldContext}

TESTO DA ANALIZZARE — ${chapterTitle} (${chapterIndex+1}/${totalChapters}):
${chapterText}

Analizza questo capitolo e identifica:
1. INCONGRUENZE: fatti nel testo che contraddicono la storia — nomi sbagliati, relazioni impossibili, continuity errors, poteri usati in modo incompatibile, equipaggiamento usato da chi non lo possiede
2. NUOVI ELEMENTI: personaggi, luoghi, oggetti o eventi menzionati nel testo ma assenti dalla storia. Per gli eventi usa sempre "cat":"event" e includi "eventPlace" e "eventEls" se deducibili dal testo
3. NUOVE CONNESSIONI: relazioni tra elementi esistenti nella storia che emergono dal testo ma non sono registrate
4. APPROFONDIMENTI: dettagli narrativi rilevanti che arricchirebbero la storia - backstory, motivazioni, descrizioni fisiche, abilità specifiche, date o luoghi storici
5. AGGIORNA EVENTO: se un evento già presente nella storia appare nel testo con partecipanti o un luogo non ancora registrati, usa "aggiorna_evento" per segnalarlo

IMPORTANTE — sii conciso: "titolo" max 60 caratteri, "descrizione" max 120 caratteri, "desc" nei dati max 100 caratteri. Preferisci qualità a quantità: segnala solo le osservazioni più rilevanti.

Rispondi SOLO con un array JSON valido, nessun testo prima o dopo. Ogni proposta deve avere questa struttura:
[
  {
    "tipo": "incongruenza" | "nuovo_elemento" | "nuova_connessione" | "approfondimento" | "nuovo_potere" | "modifica_desc" | "modifica_tag" | "modifica_fazione" | "modifica_magia" | "modifica_arco" | "aggiorna_evento",
    "titolo": "titolo breve della proposta",
    "descrizione": "spiegazione dettagliata di cosa hai trovato e perché è rilevante",
    "capitolo": "${chapterTitle}",
    "dati": {
      // Per nuovo_elemento (cat != event):
      "cat": "char|place|object",
      "name": "nome elemento",
      "desc": "descrizione suggerita",
      "importance": "principale|primario|secondario|minore",
      // Per nuovo_elemento con cat = "event":
      "cat": "event",
      "name": "nome evento",
      "desc": "descrizione",
      "date": "GG/MM/AAAA o solo anno",
      "importance": "principale|primario|secondario|minore",
      "eventPlace": "nome del luogo in cui avviene (deve essere un luogo presente in STORIA, oppure ometti)",
      "eventEls": ["nome personaggio 1", "nome personaggio 2"],
      // Per aggiorna_evento (evento già presente in STORIA a cui aggiungere partecipanti o luogo):
      "nome_evento": "nome esatto dell'evento già presente in STORIA",
      "eventPlace": "nome del luogo (deve essere un luogo presente in STORIA, oppure ometti)",
      "eventEls": ["nome elemento 1", "nome elemento 2"],
      // Per nuova_connessione / modifica_tag:
      "elemento_a": "nome elemento esistente",
      "elemento_b": "nome elemento esistente",
      "relazione": "descrizione della relazione",
      // Per nuovo_potere:
      "elemento_coinvolto": "nome personaggio",
      "power_name": "nome del potere",
      "power_desc": "descrizione del potere",
      "power_intensita": "Bassa|Media|Alta|Assoluta",
      // Per modifica_desc:
      "elemento_coinvolto": "nome elemento da aggiornare",
      "nuova_desc": "descrizione suggerita basata sul testo",
      // Per modifica_fazione:
      "nome_fazione": "nome fazione da aggiornare",
      "campo": "desc" | "notes" | "motto",
      "nuovo_valore": "nuovo contenuto suggerito",
      // Per modifica_magia:
      "nome_magia": "nome sistema di magia da aggiornare",
      "campo": "desc" | "notes" | "nuova_regola",
      "nuovo_valore": "nuovo contenuto suggerito",
      // Per modifica_arco:
      "nome_arco": "nome arco da aggiornare",
      "campo": "desc" | "notes" | "nuova_fase",
      "nuovo_valore": "nuovo contenuto suggerito",
      // Per incongruenza/approfondimento:
      "elemento_coinvolto": "nome elemento coinvolto se applicabile",
      "testo_originale": "citazione breve dal testo (max 80 chars)"
    }
  }
]

Se non trovi nulla di rilevante per una categoria, omettila. Se non trovi nulla in assoluto, rispondi con [].`;
}

function buildChapterPromptEN(chapterText, chapterTitle, worldContext, chapterIndex, totalChapters) {
  return `You are a literary editor analyzing a narrative text and comparing it against a fantasy/narrative world's bible.

WORLD (JSON):
${worldContext}

TEXT TO ANALYZE — ${chapterTitle} (${chapterIndex+1}/${totalChapters}):
${chapterText}

Analyze this chapter and identify:
1. INCONSISTENCIES: facts in the text that contradict the world — wrong names, impossible relationships, continuity errors, powers used incompatibly, equipment used by someone who doesn't own it
2. NEW ELEMENTS: characters, places, objects or events mentioned in the text but absent from the world. For events always use "cat":"event" and include "eventPlace" and "eventEls" if deducible from the text
3. NEW CONNECTIONS: relationships between existing world elements that emerge from the text but are not recorded
4. INSIGHTS: relevant narrative details that would enrich the world — backstory, motivations, physical descriptions, specific abilities, historical dates or locations
5. UPDATE EVENT: if an event already present in the world appears in the text with participants or a location not yet recorded, use "aggiorna_evento" to flag it

IMPORTANT — be concise: "titolo" max 60 characters, "descrizione" max 120 characters, "desc" in data max 100 characters. Prefer quality over quantity: report only the most relevant observations.

Reply ONLY with a valid JSON array, no text before or after. Each proposal must have this structure:
[
  {
    "tipo": "incongruenza" | "nuovo_elemento" | "nuova_connessione" | "approfondimento" | "nuovo_potere" | "modifica_desc" | "modifica_tag" | "modifica_fazione" | "modifica_magia" | "modifica_arco" | "aggiorna_evento",
    "titolo": "short proposal title",
    "descrizione": "detailed explanation of what you found and why it is relevant",
    "capitolo": "${chapterTitle}",
    "dati": {
      // For nuovo_elemento (cat != event):
      "cat": "char|place|object",
      "name": "element name",
      "desc": "suggested description",
      "importance": "principale|primario|secondario|minore",
      // For nuovo_elemento with cat = "event":
      "cat": "event",
      "name": "event name",
      "desc": "description",
      "date": "DD/MM/YYYY or year only",
      "importance": "principale|primario|secondario|minore",
      "eventPlace": "location name (must be a place already in WORLD, otherwise omit)",
      "eventEls": ["character 1", "character 2"],
      // For aggiorna_evento:
      "nome_evento": "exact name of the event already present in WORLD",
      "eventPlace": "location name (must be a place already in WORLD, otherwise omit)",
      "eventEls": ["element 1", "element 2"],
      // For nuova_connessione / modifica_tag:
      "elemento_a": "existing element name",
      "elemento_b": "existing element name",
      "relazione": "relation description",
      // For nuovo_potere:
      "elemento_coinvolto": "character name",
      "power_name": "power name",
      "power_desc": "power description",
      "power_intensita": "Bassa|Media|Alta|Assoluta",
      // For modifica_desc:
      "elemento_coinvolto": "element name to update",
      "nuova_desc": "suggested description based on the text",
      // For modifica_fazione:
      "nome_fazione": "faction name to update",
      "campo": "desc" | "notes" | "motto",
      "nuovo_valore": "suggested new content",
      // For modifica_magia:
      "nome_magia": "magic system name to update",
      "campo": "desc" | "notes" | "nuova_regola",
      "nuovo_valore": "suggested new content",
      // For modifica_arco:
      "nome_arco": "arc name to update",
      "campo": "desc" | "notes" | "nuova_fase",
      "nuovo_valore": "suggested new content",
      // For incongruenza/approfondimento:
      "elemento_coinvolto": "involved element name if applicable",
      "testo_originale": "short quote from the text (max 80 chars)"
    }
  }
]

If you find nothing relevant for a category, omit it. If you find nothing at all, reply with [].`;
}

// ── Card singola proposta ──────────────────────────────────────────────────
function ProposalCard({ proposal, elements, onAccept, onDiscard, onOpenElement }) {
  const { t } = useTranslation();
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
          {t(meta.labelKey)}
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
              {t('analisi.discard_btn')}
            </button>
            {proposal.tipo === 'nuovo_elemento' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_new_element')}
              </button>
            )}
            {proposal.tipo === 'nuova_connessione' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_connect')}
              </button>
            )}
            {(proposal.tipo === 'incongruenza' || proposal.tipo === 'approfondimento') && (
              <button className="btn-g" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_note')}
              </button>
            )}
            {proposal.tipo === 'nuovo_potere' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_power', { name: proposal.dati?.elemento_coinvolto || '?' })}
              </button>
            )}
            {proposal.tipo === 'modifica_desc' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_desc', { name: proposal.dati?.elemento_coinvolto || '?' })}
              </button>
            )}
            {proposal.tipo === 'modifica_tag' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_tag')}
              </button>
            )}
            {proposal.tipo === 'modifica_fazione' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_faz')}
              </button>
            )}
            {proposal.tipo === 'modifica_magia' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_mag')}
              </button>
            )}
            {proposal.tipo === 'modifica_arco' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_arc')}
              </button>
            )}
            {proposal.tipo === 'aggiorna_evento' && (
              <button className="btn-p" style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => onAccept(proposal)}>
                {t('analisi.accept_ev')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPALE ──────────────────────────────────────────────────
export default function AnalisiView({ onOpenElement, showToast, preloadText, onPreloadConsumed }) {
  const { t, i18n } = useTranslation();
  const { elements, arcs, fazioni, magie, allCats, uid, wid, addEl, updateEl, updateArc, updateFazione, updateMagia } = useWorld();

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

  // Modal accetta (solo per nuovo_elemento)
  const [acceptModal,   setAcceptModal]   = useState(null);
  // Form intermedio per modifiche dirette
  const [editForm,      setEditForm]      = useState(null); // { proposal, elA, elB, elC, fields }
  const [applying,      setApplying]      = useState(false);

  const [customSep,    setCustomSep]    = useState('');
  const textareaRef = useRef(null);

  // Carica testo proveniente da TestiView
  useEffect(() => {
    if (!preloadText) return;
    setText(preloadText.content || '');
    if (preloadText.customSep !== undefined) setCustomSep(preloadText.customSep);
    onPreloadConsumed?.();
  }, [preloadText]);

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
    const chaps = splitChapters(text, customSep, t('ed.default_title'), (n) => t('ed.section_n', { n }));
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
            max_tokens: 8000,
            messages: [{
              role: 'user',
              content: buildChapterPrompt(chap.text, chap.title, worldContext, i, chapters.length, i18n.language),
            }],
          }),
        });

        if (!response.ok) {
          let errMsg = `HTTP ${response.status}`;
          try {
            const err = await response.json();
            errMsg = err.error?.message || errMsg;
          } catch { /* risposta non-JSON (es. Vite 503 in dev mode) */ }
          if (response.status === 503) errMsg += t('analisi.err_503_hint');
          throw new Error(errMsg);
        }

        const data = await response.json();
        const raw = data.content?.find(b => b.type === 'text')?.text || '';
        console.log(`[analisi] cap ${i+1} — stop_reason:`, data.stop_reason, '— raw (primi 600 chars):', raw.slice(0, 600));
        if (data.stop_reason === 'max_tokens') {
          setError(prev => (prev ? prev + '\n' : '') + t('analisi.err_truncated', { title: chap.title }));
        }

        // Parsing robusto — gestisce markdown code block, testo prima/dopo, JSON troncato
        let parsed = [];
        try {
          // 1) Rimuovi eventuali delimitatori markdown ```json ... ```
          const cleaned = raw.trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim();
          // 2) Prova parse diretto del testo pulito
          const direct = JSON.parse(cleaned);
          if (Array.isArray(direct)) parsed = direct;
        } catch {
          // 3) Estrai il primo array JSON trovato nel testo
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              const attempt = JSON.parse(match[0]);
              if (Array.isArray(attempt)) parsed = attempt;
            } catch {
              // 4) Recupera oggetti completi uno per uno (risposta troncata)
              const objMatches = raw.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
              for (const m of objMatches) {
                try {
                  const obj = JSON.parse(m[0]);
                  if (obj.titolo && obj.tipo) parsed.push(obj);
                } catch { /* oggetto malformato */ }
              }
            }
          }
        }
        console.log(`[analisi] cap ${i+1} — parsed:`, parsed.length, 'proposte');

        // Deduplicazione per titolo (solo dentro il batch corrente)
        for (const p of parsed) {
          const isDup = newProposals.some(ex => ex.titolo === p.titolo);
          if (!isDup && p.titolo && p.tipo) {
            newProposals.push(p);
          }
        }
      } catch (e) {
        console.error(`Capitolo ${i+1}:`, e);
        setError(t('analisi.err_chapter', { title: chap.title, msg: e.message }));
        // Continua con i prossimi capitoli
      }
    }

    if (newProposals.length > 0) {
      await saveProposals(uid, wid, newProposals);
      showToast(t('analisi.toast_proposals', { count: newProposals.length }));
    } else {
      showToast(t('analisi.toast_no_proposals'));
    }

    setAnalyzing(false);
    setProgress({ current: 0, total: 0, label: '' });
  };

  // ── Scarta proposta ──
  const handleDiscard = async (pid) => {
    await deleteProposal(uid, wid, pid);
    showToast(t('analisi.toast_discarded'));
  };

  // ── Accetta proposta — apre form intermedio editabile ──
  const handleAccept = async (proposal) => {
    const tipo = proposal.tipo;

    if (tipo === 'nuovo_elemento') {
      setAcceptModal(proposal);
      return;
    }

    const elA = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_a || '').toLowerCase());
    const elB = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_b || '').toLowerCase());
    const elC = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_coinvolto || '').toLowerCase());

    if (tipo === 'nuovo_potere') {
      if (!elC) { showToast(t('analisi.toast_el_not_found')); return; }
      setEditForm({
        proposal, elC,
        fields: {
          power_name:      proposal.dati?.power_name || proposal.titolo || '',
          power_desc:      proposal.dati?.power_desc || proposal.descrizione || '',
          power_intensita: proposal.dati?.power_intensita || 'Media',
          power_magiaId:   '',
        }
      });
    } else if (tipo === 'modifica_desc') {
      if (!elC) { showToast(t('analisi.toast_el_not_found')); return; }
      setEditForm({
        proposal, elC,
        fields: {
          nuova_desc: proposal.dati?.nuova_desc || proposal.descrizione || elC.desc || '',
        }
      });
    } else if (tipo === 'nuova_connessione' || tipo === 'modifica_tag') {
      if (!elA || !elB) { showToast(t('analisi.toast_els_not_found')); return; }
      setEditForm({
        proposal, elA, elB,
        fields: {
          rel:        proposal.dati?.relazione || '',
          importance: 'Media',
        }
      });
    } else if (tipo === 'incongruenza' || tipo === 'approfondimento') {
      if (elC) {
        setEditForm({
          proposal, elC,
          fields: {
            nota: tipo === 'incongruenza'
              ? t('analisi.prop_note_inc', { cap: proposal.capitolo || '', desc: proposal.descrizione })
              : t('analisi.prop_note_app', { cap: proposal.capitolo || '', desc: proposal.descrizione }),
          }
        });
      } else {
        setAcceptModal(proposal);
      }
    } else if (tipo === 'modifica_fazione') {
      const faz = fazioni.find(f => f.name.toLowerCase() === (proposal.dati?.nome_fazione || '').toLowerCase());
      if (!faz) { showToast(t('analisi.toast_faz_not_found', { name: proposal.dati?.nome_fazione || '?' })); return; }
      setEditForm({
        proposal, faz,
        fields: { campo: proposal.dati?.campo || 'desc', nuovo_valore: proposal.dati?.nuovo_valore || proposal.descrizione || '' },
      });
    } else if (tipo === 'modifica_magia') {
      const mag = magie.find(m => m.name.toLowerCase() === (proposal.dati?.nome_magia || '').toLowerCase());
      if (!mag) { showToast(t('analisi.toast_mag_not_found', { name: proposal.dati?.nome_magia || '?' })); return; }
      setEditForm({
        proposal, mag,
        fields: { campo: proposal.dati?.campo || 'desc', nuovo_valore: proposal.dati?.nuovo_valore || proposal.descrizione || '' },
      });
    } else if (tipo === 'modifica_arco') {
      const arc = arcs.find(a => a.name.toLowerCase() === (proposal.dati?.nome_arco || '').toLowerCase());
      if (!arc) { showToast(t('analisi.toast_arc_not_found', { name: proposal.dati?.nome_arco || '?' })); return; }
      setEditForm({
        proposal, arc,
        fields: { campo: proposal.dati?.campo || 'desc', nuovo_valore: proposal.dati?.nuovo_valore || proposal.descrizione || '' },
      });
    } else if (tipo === 'aggiorna_evento') {
      const ev = elements.find(e => e.cat === 'event' && e.name.toLowerCase() === (proposal.dati?.nome_evento || '').toLowerCase());
      if (!ev) { showToast(t('analisi.toast_ev_not_found', { name: proposal.dati?.nome_evento || '?' })); return; }
      const placeEl = elements.find(e => e.cat === 'place' && e.name.toLowerCase() === (proposal.dati?.eventPlace || '').toLowerCase());
      const suggestedEls = (proposal.dati?.eventEls || [])
        .map(n => elements.find(e => e.name.toLowerCase() === n.toLowerCase()))
        .filter(Boolean);
      const existingIds = new Set(ev.eventEls || []);
      const newEls = suggestedEls.filter(e => !existingIds.has(e.id));
      setEditForm({
        proposal, ev,
        fields: {
          eventPlace: placeEl?.id || ev.eventPlace || '',
          eventEls:   [...(ev.eventEls || []), ...newEls.map(e => e.id)],
          newEls,
          newPlace: placeEl && (!ev.eventPlace || ev.eventPlace !== placeEl.id) ? placeEl : null,
        },
      });
    }
  };

  // ── Applica modifica diretta all'elemento ──
  const applyDirect = async () => {
    if (!editForm || applying) return;
    setApplying(true);
    const { proposal, elA, elB, elC, fields } = editForm;
    const tipo = proposal.tipo;

    try {
      if (tipo === 'nuovo_potere' && elC) {
        const newPower = {
          name:      fields.power_name,
          desc:      fields.power_desc,
          intensita: fields.power_intensita,
          magiaId:   fields.power_magiaId || '',
        };
        await updateEl(elC.id, { powers: [...(elC.powers || []), newPower] });
        showToast(t('analisi.toast_power_added', { name: elC.name }));

      } else if (tipo === 'modifica_desc' && elC) {
        await updateEl(elC.id, { desc: fields.nuova_desc });
        showToast(t('analisi.toast_desc_updated', { name: elC.name }));

      } else if ((tipo === 'nuova_connessione' || tipo === 'modifica_tag') && elA && elB) {
        const newTag = { id: elB.id, rel: fields.rel || '', importance: fields.importance || 'Media' };
        const tagsA  = [...(elA.tags || []).filter(tg => (typeof tg === 'string' ? tg : tg?.id) !== elB.id), newTag];
        await updateEl(elA.id, { tags: tagsA });
        showToast(t('analisi.toast_connected', { a: elA.name, b: elB.name }));

      } else if ((tipo === 'incongruenza' || tipo === 'approfondimento') && elC) {
        const notePrev = elC.notes ? elC.notes + '\n\n' + fields.nota : fields.nota;
        await updateEl(elC.id, { notes: notePrev });
        showToast(t('analisi.toast_note_added', { name: elC.name }));
      }

      // ── Modifica fazione ──
      if (tipo === 'modifica_fazione' && editForm.faz) {
        const faz = editForm.faz;
        const campo = fields.campo;
        if (campo === 'nuova_regola') {
          // non applicabile alle fazioni
        } else if (campo === 'notes') {
          const prev = faz.notes ? faz.notes + '\n\n' + fields.nuovo_valore : fields.nuovo_valore;
          await updateFazione(faz.id, { notes: prev });
        } else {
          await updateFazione(faz.id, { [campo]: fields.nuovo_valore });
        }
        showToast(t('analisi.toast_faz_updated', { name: faz.name }));
      }

      // ── Modifica magia ──
      if (tipo === 'modifica_magia' && editForm.mag) {
        const mag = editForm.mag;
        const campo = fields.campo;
        if (campo === 'nuova_regola') {
          await updateMagia(mag.id, { rules: [...(mag.rules || []), fields.nuovo_valore] });
        } else if (campo === 'notes') {
          const prev = mag.notes ? mag.notes + '\n\n' + fields.nuovo_valore : fields.nuovo_valore;
          await updateMagia(mag.id, { notes: prev });
        } else {
          await updateMagia(mag.id, { [campo]: fields.nuovo_valore });
        }
        showToast(t('analisi.toast_mag_updated', { name: mag.name }));
      }

      // ── Modifica arco ──
      if (tipo === 'modifica_arco' && editForm.arc) {
        const arc = editForm.arc;
        const campo = fields.campo;
        if (campo === 'nuova_fase') {
          await updateArc(arc.id, { phases: [...(arc.phases || []), fields.nuovo_valore] });
        } else if (campo === 'notes') {
          const prev = arc.notes ? arc.notes + '\n\n' + fields.nuovo_valore : fields.nuovo_valore;
          await updateArc(arc.id, { notes: prev });
        } else {
          await updateArc(arc.id, { [campo]: fields.nuovo_valore });
        }
        showToast(t('analisi.toast_arc_updated', { name: arc.name }));
      }

      // ── Aggiorna evento ──
      if (tipo === 'aggiorna_evento' && editForm.ev) {
        const ev = editForm.ev;
        await updateEl(ev.id, {
          eventPlace: fields.eventPlace || ev.eventPlace || null,
          eventEls:   fields.eventEls || ev.eventEls || [],
        });
        showToast(t('analisi.toast_ev_updated', { name: ev.name }));
      }

      await deleteProposal(uid, wid, proposal.id);
    } catch (e) {
      showToast(t('analisi.toast_apply_error'));
      console.error(e);
    }

    setApplying(false);
    setEditForm(null);
  };

  const setField = (key, val) => setEditForm(f => ({ ...f, fields: { ...f.fields, [key]: val } }));

  // ── Costruisce initialData per ElementModal dalla proposta ──
  const proposalToInitialData = (proposal) => {
    if (proposal.tipo === 'nuovo_elemento') {
      const isEvent = proposal.dati?.cat === 'event';
      const placeEl = isEvent && proposal.dati?.eventPlace
        ? elements.find(e => e.cat === 'place' && e.name.toLowerCase() === proposal.dati.eventPlace.toLowerCase())
        : null;
      const eventElIds = isEvent
        ? (proposal.dati?.eventEls || [])
            .map(n => elements.find(e => e.name.toLowerCase() === n.toLowerCase())?.id)
            .filter(Boolean)
        : [];
      return {
        cat:        proposal.dati?.cat || 'char',
        name:       proposal.dati?.name || '',
        desc:       proposal.dati?.desc || proposal.descrizione || '',
        importance: proposal.dati?.importance || 'secondario',
        date:       isEvent ? (proposal.dati?.date || '') : undefined,
        eventPlace: isEvent ? (placeEl?.id || '') : undefined,
        eventEls:   isEvent ? eventElIds : undefined,
        eventType:  isEvent ? 'point' : undefined,
        status:     'draft',
        tags:       [],
        extra:      {},
        powers:     [],
        equip:      [],
        changelog:  [],
        notes:      `${t('analisi.prop_from_analysis')} — ${proposal.capitolo || ''}\n\n${proposal.descrizione}`,
      };
    }
    if (proposal.tipo === 'nuova_connessione') {
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
        notes:      `${t('analisi.prop_from_analysis')} — ${proposal.capitolo || ''}\n\n${proposal.descrizione}`,
      };
    }
    if (proposal.tipo === 'nuovo_potere') {
      const targetEl = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_coinvolto || '').toLowerCase());
      // Apre la scheda dell'elemento con il potere pre-compilato nelle note
      return {
        cat:        targetEl?.cat || 'char',
        name:       targetEl?.name || proposal.dati?.elemento_coinvolto || '',
        desc:       targetEl?.desc || '',
        importance: targetEl?.importance || 'secondario',
        status:     targetEl?.status || 'draft',
        tags:       targetEl?.tags || [],
        extra:      targetEl?.extra || {},
        powers:     targetEl?.powers || [],
        equip:      targetEl?.equip || [],
        changelog:  targetEl?.changelog || [],
        notes:      t('analisi.prop_note_power', {
          name: proposal.dati?.power_name || '',
          desc: proposal.dati?.power_desc || '',
          int:  proposal.dati?.power_intensita || 'Media',
          prev: targetEl?.notes || '',
        }),
        _proposedPower: {
          name: proposal.dati?.power_name || proposal.titolo,
          desc: proposal.dati?.power_desc || proposal.descrizione,
          intensita: proposal.dati?.power_intensita || 'Media',
        },
      };
    }
    if (proposal.tipo === 'modifica_desc') {
      const targetEl = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_coinvolto || '').toLowerCase());
      return {
        cat:        targetEl?.cat || 'char',
        name:       targetEl?.name || proposal.dati?.elemento_coinvolto || '',
        desc:       proposal.dati?.nuova_desc || targetEl?.desc || proposal.descrizione,
        importance: targetEl?.importance || 'secondario',
        status:     targetEl?.status || 'draft',
        tags:       targetEl?.tags || [],
        extra:      targetEl?.extra || {},
        powers:     targetEl?.powers || [],
        equip:      targetEl?.equip || [],
        changelog:  targetEl?.changelog || [],
        notes:      targetEl?.notes || '',
      };
    }
    if (proposal.tipo === 'modifica_tag') {
      const elA = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_a || '').toLowerCase());
      const elB = elements.find(e => e.name.toLowerCase() === (proposal.dati?.elemento_b || '').toLowerCase());
      return {
        cat:        elA?.cat || 'char',
        name:       elA?.name || proposal.dati?.elemento_a || '',
        desc:       elA?.desc || '',
        importance: elA?.importance || 'secondario',
        status:     elA?.status || 'draft',
        tags:       [...new Set([...(elA?.tags || []), elB?.id].filter(Boolean))],
        extra:      elA?.extra || {},
        powers:     elA?.powers || [],
        equip:      elA?.equip || [],
        changelog:  elA?.changelog || [],
        notes:      elA?.notes || '',
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
      notes:      `${t('analisi.prop_chapter_lbl', { cap: proposal.capitolo || '—' })}\n\n${proposal.descrizione}`,
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

  const tokenLabel = tokenEstimate === 0 ? t('analisi.tok_empty')
    : tokenEstimate > TOKEN_BLOCK ? t('analisi.tok_too_long', { k: Math.round(tokenEstimate/1000) })
    : tokenEstimate > TOKEN_WARN  ? t('analisi.tok_warn',     { k: Math.round(tokenEstimate/1000) })
    : t('analisi.tok_ok', { k: Math.round(tokenEstimate/1000) });

  // ── Conteggi per tipo ──
  const counts = useMemo(() => {
    const c = {};
    proposals.forEach(p => { c[p.tipo] = (c[p.tipo] || 0) + 1; });
    return c;
  }, [proposals]);

  // Detecta mobile per riordinare le sezioni
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">Ana<span>lisi</span></div>
        {proposals.length > 0 && (
          <button className="btn-d" style={{ fontSize: 12 }}
            onClick={async () => {
              if (!window.confirm(t('analisi.clear_all_confirm', { count: proposals.length }))) return;
              await deleteAllProposals(uid, wid);
              showToast(t('analisi.clear_btn'));
            }}>
            {t('analisi.clear_btn')}
          </button>
        )}
      </div>

      <div className="analisi-grid" style={{ direction: 'ltr' }}>

        {/* ── Colonna sinistra: input testo ── */}
        <div className="analisi-col-testo">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)' }}>{t('analisi.text_lbl')}</div>
              {text && (
                <button className="btn-g" style={{ fontSize: 11 }} onClick={() => setText('')}>{t('analisi.clear_text')}</button>
              )}
            </div>

            {/* Separatore capitoli */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--text-muted)', marginBottom: 6 }}>
                {t('analisi.sep_lbl')}
              </div>
              <div className="analisi-sep-btns" style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                {['', '---', '***', '===', '# ', 'Capitolo'].map(sep => (
                  <button key={sep} type="button"
                    onClick={() => setCustomSep(sep)}
                    style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                      background: customSep === sep ? 'var(--gold-glow)' : 'var(--surface2)',
                      border: `1px solid ${customSep === sep ? 'var(--gold-dim)' : 'var(--border)'}`,
                      color: customSep === sep ? 'var(--gold)' : 'var(--text-muted)',
                    }}>
                    {sep === '' ? 'Auto' : sep === '# ' ? '# Titolo' : sep}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="text" placeholder={t('analisi.sep_ph')} value={customSep}
                  onChange={e => setCustomSep(e.target.value)}
                  style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, padding: '5px 10px', outline: 'none' }} />
                {customSep && <button type="button" onClick={() => setCustomSep('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                {customSep
                  ? t('analisi.sep_hint_custom', { sep: customSep })
                  : t('analisi.sep_hint_auto')}
              </div>
            </div>

            {/* Upload file */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border-light)', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', marginBottom: 10, fontSize: 13, color: 'var(--text-muted)', transition: 'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span>{t('analisi.upload_lbl')}</span>
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

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>{t('analisi.or')}</div>

            <textarea ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={t('analisi.text_ph')}
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
                {t('analisi.warn_too_long')}
              </div>
            )}

            {/* Avviso warning */}
            {tokenEstimate > TOKEN_WARN && tokenEstimate <= TOKEN_BLOCK && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: '#3a2a08', border: '1px solid #d4a84c55', borderRadius: 7, fontSize: 13, color: '#d4a84c', lineHeight: 1.6 }}>
                {t('analisi.warn_long')}
              </div>
            )}
          </div>

          {/* Anteprima capitoli */}
          {chapters.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
                {t('analisi.chapters_found', { count: chapters.length })}
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
              ? t('analisi.analyzing', { current: progress.current, total: progress.total, label: progress.label })
              : chapters.length > 1
                ? t('analisi.analyze_btn_chapters', { count: chapters.length })
                : t('analisi.analyze_btn')
            }
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#3a1515', border: '1px solid #e0707055', borderRadius: 7, fontSize: 13, color: '#e07070' }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Colonna destra: proposte ── */}
        <div className="analisi-col-proposte">
          {/* Header proposte con contatori */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: proposals.length > 0 ? 12 : 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)' }}>
                {t('analisi.proposals_lbl')}
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
                    {meta.icon} {t(meta.labelKey)} ({counts[tipo]})
                  </button>
                ) : null)}
              </div>
            )}

            {/* Filtro capitolo */}
            {capList.length > 1 && (
              <select className="fs" style={{ margin: 0, fontSize: 12, padding: '4px 10px' }}
                value={filterCap} onChange={e => setFilterCap(e.target.value)}>
                <option value="">{t('analisi.filter_all_caps')}</option>
                {capList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Lista proposte */}
          {loadingProps ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
              {t('analisi.loading_proposals')}
            </div>
          ) : filteredProposals.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14, padding: '30px 0', textAlign: 'center', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {proposals.length === 0 ? t('analisi.no_proposals') : t('analisi.no_proposals_filtered')}
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

      {/* ── Conferma modifica diretta ── */}
      {/* ── Form intermedio modifica ── */}
      {editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '24px 28px', maxWidth: 480, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,.7)', maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>
              {TIPO_META[editForm.proposal.tipo]?.icon} {TIPO_META[editForm.proposal.tipo]?.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              {editForm.proposal.descrizione}
            </div>

            {/* ── Form: nuovo potere ── */}
            {editForm.proposal.tipo === 'nuovo_potere' && editForm.elC && (
              <div>
                <div style={{ fontSize: 11, color: '#c89fd4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                  {t('analisi.form_add_power_to')} <strong>{editForm.elC.name}</strong>
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_power_name_lbl')}</label>
                  <input className="fi" value={editForm.fields.power_name}
                    onChange={e => setField('power_name', e.target.value)} autoFocus />
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_power_desc_lbl')}</label>
                  <textarea className="ft" value={editForm.fields.power_desc}
                    onChange={e => setField('power_desc', e.target.value)} style={{ minHeight: 80 }} />
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_power_int_lbl')}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Bassa','Media','Alta','Assoluta'].map(i => (
                      <button key={i} type="button" onClick={() => setField('power_intensita', i)}
                        style={{ flex: 1, padding: '6px 4px', fontSize: 12, borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                          background: editForm.fields.power_intensita === i ? 'var(--surface3)' : 'var(--surface2)',
                          border: `1px solid ${editForm.fields.power_intensita === i ? 'var(--gold-dim)' : 'var(--border)'}`,
                          color: editForm.fields.power_intensita === i ? 'var(--gold)' : 'var(--text-muted)' }}>
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_power_magic_lbl')}</label>
                  <select className="fs" value={editForm.fields.power_magiaId}
                    onChange={e => setField('power_magiaId', e.target.value)}>
                    <option value="">{t('analisi.form_no_magic')}</option>
                    {magie.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Form: modifica descrizione ── */}
            {editForm.proposal.tipo === 'modifica_desc' && editForm.elC && (
              <div>
                <div style={{ fontSize: 11, color: '#a0d0c0', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                  {t('analisi.form_update_desc_of')} <strong>{editForm.elC.name}</strong>
                </div>
                {editForm.elC.desc && (
                  <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, textDecoration: 'line-through', opacity: .6 }}>
                    {editForm.elC.desc.slice(0, 200)}{editForm.elC.desc.length > 200 ? '…' : ''}
                  </div>
                )}
                <div className="fg">
                  <label className="fl">{t('analisi.form_new_desc_lbl')}</label>
                  <textarea className="ft" value={editForm.fields.nuova_desc}
                    onChange={e => setField('nuova_desc', e.target.value)} style={{ minHeight: 100 }} autoFocus />
                </div>
              </div>
            )}

            {/* ── Form: nuova connessione / modifica tag ── */}
            {(editForm.proposal.tipo === 'nuova_connessione' || editForm.proposal.tipo === 'modifica_tag') && editForm.elA && editForm.elB && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 14, color: 'var(--text)' }}>
                  <span style={{ fontStyle: 'italic' }}>{editForm.elA.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>↔</span>
                  <span style={{ fontStyle: 'italic' }}>{editForm.elB.name}</span>
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_rel_type_lbl')}</label>
                  <input className="fi" placeholder={t('analisi.form_rel_ph')}
                    value={editForm.fields.rel}
                    onChange={e => setField('rel', e.target.value)} autoFocus />
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_rel_imp_lbl')}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {TAG_IMPORTANCE.map(imp => (
                      <button key={imp} type="button" onClick={() => setField('importance', imp)}
                        style={{ flex: 1, padding: '6px 4px', fontSize: 11, borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                          background: editForm.fields.importance === imp ? TAG_IMP_COLOR[imp] + '33' : 'var(--surface2)',
                          border: `1px solid ${editForm.fields.importance === imp ? TAG_IMP_COLOR[imp] : 'var(--border)'}`,
                          color: editForm.fields.importance === imp ? TAG_IMP_COLOR[imp] : 'var(--text-muted)' }}>
                        {TAG_IMP_LABEL[imp]} {imp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Form: modifica fazione/magia/arco ── */}
            {(editForm.proposal.tipo === 'modifica_fazione' || editForm.proposal.tipo === 'modifica_magia' || editForm.proposal.tipo === 'modifica_arco') && (
              <div>
                {(() => {
                  const tipo = editForm.proposal.tipo;
                  const target = editForm.faz || editForm.mag || editForm.arc;
                  const tipoLabel = tipo === 'modifica_fazione' ? t('analisi.form_tipo_fazione') : tipo === 'modifica_magia' ? t('analisi.form_tipo_magia') : t('analisi.form_tipo_arco');
                  const campoOptions = tipo === 'modifica_magia'
                    ? [{ v: 'desc', l: t('common.desc_lbl') }, { v: 'notes', l: t('dp.tab_notes') }, { v: 'nuova_regola', l: t('analisi.form_campo_new_rule') }]
                    : tipo === 'modifica_arco'
                    ? [{ v: 'desc', l: t('common.desc_lbl') }, { v: 'notes', l: t('dp.tab_notes') }, { v: 'nuova_fase', l: t('analisi.form_campo_new_phase') }]
                    : [{ v: 'desc', l: t('common.desc_lbl') }, { v: 'notes', l: t('dp.tab_notes') }, { v: 'motto', l: t('analisi.form_campo_motto') }];
                  return (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                        {tipoLabel}: <strong style={{ color: 'var(--text)' }}>{target?.name}</strong>
                      </div>
                      <div className="fg">
                        <label className="fl">{t('analisi.form_campo_lbl')}</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {campoOptions.map(o => (
                            <button key={o.v} type="button" onClick={() => setField('campo', o.v)}
                              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                                background: editForm.fields.campo === o.v ? 'var(--gold-glow)' : 'var(--surface2)',
                                border: `1px solid ${editForm.fields.campo === o.v ? 'var(--gold-dim)' : 'var(--border)'}`,
                                color: editForm.fields.campo === o.v ? 'var(--gold)' : 'var(--text-muted)' }}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      {target && editForm.fields.campo && target[editForm.fields.campo] && editForm.fields.campo !== 'nuova_regola' && editForm.fields.campo !== 'nuova_fase' && (
                        <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, textDecoration: 'line-through', opacity: .6 }}>
                          {String(target[editForm.fields.campo]).slice(0, 200)}
                        </div>
                      )}
                      <div className="fg">
                        <label className="fl">
                          {editForm.fields.campo === 'nuova_regola' ? t('analisi.form_add_rule_lbl') :
                           editForm.fields.campo === 'nuova_fase'   ? t('analisi.form_add_phase_lbl') :
                           t('analisi.form_new_content_lbl')}
                        </label>
                        <textarea className="ft" value={editForm.fields.nuovo_valore}
                          onChange={e => setField('nuovo_valore', e.target.value)}
                          style={{ minHeight: 80 }} autoFocus />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Form: incongruenza / approfondimento ── */}
            {(editForm.proposal.tipo === 'incongruenza' || editForm.proposal.tipo === 'approfondimento') && editForm.elC && (
              <div>
                <div style={{ fontSize: 11, color: editForm.proposal.tipo === 'incongruenza' ? '#e07070' : '#d4a84c', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                  {t('analisi.form_note_for')} <strong>{editForm.elC.name}</strong>
                </div>
                <div className="fg">
                  <label className="fl">{t('analisi.form_note_lbl')}</label>
                  <textarea className="ft" value={editForm.fields.nota}
                    onChange={e => setField('nota', e.target.value)} style={{ minHeight: 100 }} autoFocus />
                </div>
              </div>
            )}

            {/* ── Form: aggiorna evento ── */}
            {editForm.proposal.tipo === 'aggiorna_evento' && editForm.ev && (
              <div>
                <div style={{ fontSize: 11, color: '#7ab8d4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>
                  Evento: <strong style={{ color: 'var(--text)' }}>{editForm.ev.name}</strong>
                  {editForm.ev.date && <span style={{ marginLeft: 8, opacity: .6 }}>({editForm.ev.date})</span>}
                </div>
                {editForm.fields.newPlace && (
                  <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>{t('analisi.form_ev_place_lbl')}</span>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📍</span>
                      <span style={{ color: 'var(--text)' }}>{editForm.fields.newPlace.name}</span>
                      {editForm.ev.eventPlace && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('analisi.form_ev_replaces')}</span>}
                    </div>
                  </div>
                )}
                {editForm.fields.newEls?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                      {t('analisi.form_ev_els_title', { count: editForm.fields.newEls.length })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {editForm.fields.newEls.map(el => (
                        <span key={el.id} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border-light)', color: 'var(--text)' }}>
                          {el.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!editForm.fields.newPlace && !editForm.fields.newEls?.length && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('analisi.form_ev_no_changes')}</div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-g" onClick={() => setEditForm(null)} disabled={applying}>{t('common.cancel')}</button>
              <button className="btn-p" onClick={applyDirect} disabled={applying}>
                {applying ? t('analisi.form_applying') : t('analisi.form_apply_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal crea nuovo elemento ── */}
      {acceptModal && (
        <ElementModal
          initialData={proposalToInitialData(acceptModal)}
          defaultCat={acceptModal.dati?.cat || 'char'}
          onSave={async (data) => {
            await addEl(data);
            await deleteProposal(uid, wid, acceptModal.id);
            setAcceptModal(null);
            showToast(t('analisi.toast_created_from_prop'));
          }}
          onClose={() => setAcceptModal(null)}
        />
      )}
    </div>
  );
}
