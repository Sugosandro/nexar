// src/views/TestiView.jsx
import { useState, useEffect } from 'react';
import { useWorld } from '../hooks/useWorld';
import { subscribeTexts, saveText, loadTextContent, deleteText, updateTextMeta } from '../firebase/db';

function formatSize(chars) {
  if (chars < 1000) return `${chars} car.`;
  if (chars < 1_000_000) return `${(chars / 1000).toFixed(1)}K car.`;
  return `${(chars / 1_000_000).toFixed(2)}M car.`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TestiView({ onAnalyze, showToast }) {
  const { uid, wid } = useWorld();

  const [texts,       setTexts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);

  // Form nuovo testo
  const [showForm,    setShowForm]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newText,     setNewText]     = useState('');
  const [newSep,      setNewSep]      = useState('');
  const [loadingText, setLoadingText] = useState(null);
  const [readingText, setReadingText] = useState(null); // { text, content, chapters }

  // Rinomina inline
  const [renaming,    setRenaming]    = useState(null); // id
  const [renameVal,   setRenameVal]   = useState('');

  // Divide il testo in capitoli per la vista lettura
  const splitForReading = (text, customSep = '') => {
    const lines = text.split('\n');
    const chapters = [];
    let current = { title: 'Inizio', lines: [] };
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
        let title = line.replace(/^#{1,3}\s/, '').trim() || `Sezione ${chapters.length + 1}`;
        current = { title, lines: [] };
      } else {
        current.lines.push(line);
      }
    }
    if (current.lines.length > 0) chapters.push({ ...current, text: current.lines.join('\n').trim() });
    return chapters.filter(c => c.text.length > 20);
  };

  useEffect(() => {
    if (!uid || !wid) return;
    const unsub = subscribeTexts(uid, wid, data => {
      setTexts(data);
      setLoading(false);
    });
    return unsub;
  }, [uid, wid]);

  const handleSave = async () => {
    if (!newName.trim()) return showToast('⚠ Inserisci un nome');
    if (!newText.trim()) return showToast('⚠ Inserisci il testo');
    setUploading(true);
    try {
      await saveText(uid, wid, { name: newName.trim(), content: newText, customSep: newSep });
      setNewName(''); setNewText(''); setNewSep(''); setShowForm(false);
      showToast('✓ Testo salvato');
    } catch (e) {
      showToast('⚠ Errore nel salvataggio');
      console.error(e);
    }
    setUploading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setNewText(ev.target.result);
      if (!newName) setNewName(file.name.replace(/\.(txt|md)$/, ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRead = async (textMeta) => {
    setLoadingText(textMeta.id);
    try {
      const content = await loadTextContent(uid, wid, textMeta.id);
      const chapters = splitForReading(content, textMeta.customSep || '');
      setReadingText({ meta: textMeta, content, chapters });
    } catch (e) {
      showToast('⚠ Errore nel caricamento del testo');
      console.error(e);
    }
    setLoadingText(null);
  };

  const handleAnalyze = async (text) => {
    setLoadingText(text.id);
    try {
      const content = await loadTextContent(uid, wid, text.id);
      onAnalyze({ content, name: text.name, customSep: text.customSep || '' });
    } catch (e) {
      showToast('⚠ Errore nel caricamento del testo');
      console.error(e);
    }
    setLoadingText(null);
  };

  const handleDelete = async (tid) => {
    if (!window.confirm('Eliminare questo testo? L\'azione è irreversibile.')) return;
    await deleteText(uid, wid, tid);
    showToast('🗑 Testo eliminato');
  };

  const handleRename = async (tid) => {
    if (!renameVal.trim()) return;
    await updateTextMeta(uid, wid, tid, { name: renameVal.trim() });
    setRenaming(null);
    showToast('✓ Rinominato');
  };

  const tokenEstimate = (chars) => Math.ceil(chars / 4);

  return (
    <div className="view">
      <div className="view-hd">
        <div className="view-title">📄 <span>Testi</span></div>
        <button className="btn-p" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Annulla' : '+ Nuovo testo'}
        </button>
      </div>

      {/* Form nuovo testo */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 'clamp(12px, 3vw, 20px)', marginBottom: 20 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', marginBottom: 14 }}>Nuovo testo</div>

          <div className="fg">
            <label className="fl">Nome</label>
            <input className="fi" placeholder="Es. Capitolo 1 — L'inizio" value={newName}
              onChange={e => setNewName(e.target.value)} autoComplete="off" />
          </div>

          <div className="fg">
            <label className="fl">Separatore capitoli (opzionale)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {['', '---', '***', '===', '# ', 'Capitolo'].map(sep => (
                <button key={sep} type="button" onClick={() => setNewSep(sep)}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: "'Crimson Pro', serif",
                    background: newSep === sep ? 'var(--gold-glow)' : 'var(--surface2)',
                    border: `1px solid ${newSep === sep ? 'var(--gold-dim)' : 'var(--border)'}`,
                    color: newSep === sep ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {sep === '' ? 'Auto' : sep === '# ' ? '# Titolo' : sep}
                </button>
              ))}
              <input type="text" placeholder="Personalizzato…" value={newSep}
                onChange={e => setNewSep(e.target.value)}
                style={{ flex: 1, minWidth: 120, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, padding: '3px 10px', outline: 'none' }} />
            </div>
          </div>

          {/* Upload file */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border-light)', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', marginBottom: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>📄</span> Carica file .txt o .md
            <input type="file" accept=".txt,.md" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>

          <textarea value={newText} onChange={e => setNewText(e.target.value)}
            placeholder="Oppure incolla qui il testo…"
            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 14, padding: '10px 12px', outline: 'none', resize: 'vertical', minHeight: 160, lineHeight: 1.65 }} />

          {newText && (() => {
            const chars   = newText.length;
            const mb      = chars / 1_000_000;
            const tokens  = tokenEstimate(chars);
            const isWarn  = mb > 0.6;
            const isBlock = mb > 0.95;
            return (
              <div style={{ marginTop: 6, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: isBlock ? '#e07070' : isWarn ? '#d4a84c' : 'var(--text-muted)' }}>
                  {formatSize(chars)} ({mb.toFixed(2)} MB) — ~{Math.round(tokens / 1000)}k token
                </div>
                {isBlock && (
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#3a1515', border: '1px solid #e0707055', borderRadius: 7, fontSize: 13, color: '#e07070', lineHeight: 1.6 }}>
                    ⚠ Il testo supera il limite di 1MB per documento Firestore. Verrà salvato automaticamente in più chunk, ma considera di dividerlo in testi separati per prestazioni migliori.
                  </div>
                )}
                {isWarn && !isBlock && (
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#3a2a08', border: '1px solid #d4a84c55', borderRadius: 7, fontSize: 13, color: '#d4a84c', lineHeight: 1.6 }}>
                    ⚠ Il testo è abbastanza lungo ({mb.toFixed(2)} MB). Verrà salvato in {Math.ceil(mb / 0.8)} chunk — funzionerà correttamente ma potrebbe essere lento da caricare.
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-g" onClick={() => { setShowForm(false); setNewName(''); setNewText(''); setNewSep(''); }}>Annulla</button>
            <button className="btn-p" onClick={handleSave} disabled={uploading}>
              {uploading ? '⏳ Salvataggio…' : '💾 Salva testo'}
            </button>
          </div>
        </div>
      )}

      {/* Lista testi */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>Caricamento…</div>
      ) : texts.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📄</div>
          <div className="empty-title">Nessun testo salvato</div>
          <div className="empty-sub">Salva un testo per poterlo analizzare più volte</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {texts.map(text => (
            <div key={text.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Nome — cliccabile per rinominare */}
                {renaming === text.id ? (
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(text.id); if (e.key === 'Escape') setRenaming(null); }}
                    onBlur={() => handleRename(text.id)}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--gold-dim)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Playfair Display', serif", fontSize: 16, padding: '4px 10px', outline: 'none' }} />
                ) : (
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: 'var(--text)', marginBottom: 3 }}>
                      {text.name}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>{formatSize(text.charCount || 0)}</span>
                      <span>~{Math.round(tokenEstimate(text.charCount || 0) / 1000)}k token</span>
                      {text.chunkCount > 1 && <span>📦 {text.chunkCount} chunk</span>}
                      {text.customSep && <span>Sep: "{text.customSep}"</span>}
                      <span>{formatDate(text.createdAt)}</span>
                    </div>
                  </div>
                )}

                {/* Azioni */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn-g" style={{ fontSize: 12 }}
                    onClick={() => { setRenaming(text.id); setRenameVal(text.name); }}>
                    ✏ Rinomina
                  </button>
                  <button className="btn-g" style={{ fontSize: 12 }}
                    onClick={() => handleRead(text)}
                    disabled={loadingText === text.id}>
                    📖 Leggi
                  </button>
                  <button className="btn-p" style={{ fontSize: 12 }}
                    onClick={() => handleAnalyze(text)}
                    disabled={loadingText === text.id}>
                    {loadingText === text.id ? '⏳' : '🔍 Analizza'}
                  </button>
                  <button className="btn-d" style={{ fontSize: 12 }}
                    onClick={() => handleDelete(text.id)}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista lettura ── */}
      {readingText && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 800, display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button className="btn-g" style={{ fontSize: 12 }} onClick={() => setReadingText(null)}>← Chiudi</button>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--text)', flex: 1 }}>
              {readingText.meta.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {formatSize(readingText.meta.charCount || readingText.content.length)}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Indice capitoli — su mobile mostra toggle invece di colonna fissa */}
            {readingText.chapters.length > 1 && (
              <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '14px 0', display: 'var(--index-display, flex)', flexDirection: 'column' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', padding: '0 14px 10px' }}>
                  Indice — {readingText.chapters.length} sezioni
                </div>
                {readingText.chapters.map((ch, i) => (
                  <div key={i}
                    onClick={() => document.getElementById(`chapter-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{ padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.4, borderLeft: '2px solid transparent', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderLeftColor = 'var(--gold-dim)'; e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderLeftColor = 'transparent'; e.currentTarget.style.background = ''; }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 6 }}>{i + 1}.</span>
                    {ch.title.length > 30 ? ch.title.slice(0, 30) + '…' : ch.title}
                  </div>
                ))}
              </div>
            )}

            {/* Testo */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', maxWidth: 780, margin: '0 auto' }}>
              {readingText.chapters.map((ch, i) => (
                <div key={i} id={`chapter-${i}`} style={{ marginBottom: 48 }}>
                  {readingText.chapters.length > 1 && (
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--gold)', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                      {ch.title}
                    </h2>
                  )}
                  <div style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.9, fontFamily: "'Crimson Pro', serif", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {ch.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
