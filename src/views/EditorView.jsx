// src/views/EditorView.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useWorld } from '../hooks/useWorld';
import {
  subscribeChapters, addChapter, updateChapter,
  deleteChapter, reorderChapters,
  loadTextContent, subscribeTexts,
} from '../firebase/db';

// ── Conta parole dal testo plain ──────────────────────────────────────────
const countWords = (html) => {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
};

// ── Divide testo plain in capitoli (per import) ───────────────────────────
const splitIntoChapters = (text, customSep = '') => {
  const lines = text.split('\n');
  const chapters = [];
  let current = { title: 'Inizio', lines: [] };
  const sepRegex = customSep.trim()
    ? new RegExp('^' + customSep.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(.*)$', 'i')
    : null;

  for (const line of lines) {
    const isCustom = sepRegex && sepRegex.test(line.trim());
    const isAuto = !customSep.trim() && (
      /^#{1,3}\s/.test(line) ||
      /^(capitolo|chapter|parte|part|prologo|epilogo)\s/i.test(line.trim()) ||
      /^[-=]{3,}$/.test(line.trim())
    );
    if ((isCustom || isAuto) && current.lines.length > 5) {
      chapters.push({ ...current, text: current.lines.join('\n').trim() });
      const title = line.replace(/^#{1,3}\s/, '').trim() || `Sezione ${chapters.length + 1}`;
      current = { title, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) chapters.push({ ...current, text: current.lines.join('\n').trim() });
  return chapters.filter(c => c.text.length > 10);
};

// ── Barra strumenti Tiptap ────────────────────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null;

  const btn = (action, label, isActive = false) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); action(); }}
      style={{
        padding: '5px 9px', fontSize: 13, border: 'none', borderRadius: 4,
        cursor: 'pointer', fontFamily: 'inherit',
        background: isActive ? 'var(--surface3)' : 'transparent',
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
        transition: 'all .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
      onMouseLeave={e => e.currentTarget.style.background = isActive ? 'var(--surface3)' : 'transparent'}
    >
      {label}
    </button>
  );

  const sep = () => (
    <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px', alignSelf: 'center' }} />
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
      padding: '6px 12px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', flexShrink: 0,
    }}>
      {btn(() => editor.chain().focus().toggleBold().run(), <b>G</b>, editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), <i>C</i>, editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), <s>S</s>, editor.isActive('strike'))}
      {sep()}
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      {sep()}
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• Lista', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. Lista', editor.isActive('orderedList'))}
      {sep()}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      {sep()}
      {btn(() => editor.chain().focus().undo().run(), '↩')}
      {btn(() => editor.chain().focus().redo().run(), '↪')}
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────
export default function EditorView({ onOpenElement, showToast }) {
  const { uid, wid, elements, allCats } = useWorld();
  const cats = allCats();

  const [chapters,       setChapters]       = useState([]);
  const [activeId,       setActiveId]       = useState(null);
  const [saveStatus,     setSaveStatus]     = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [showImport,     setShowImport]     = useState(false);
  const [texts,          setTexts]          = useState([]);
  const [importingId,    setImportingId]    = useState(null);
  const [dragging,       setDragging]       = useState(null);
  const [dragOver,       setDragOver]       = useState(null);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Note capitolo (pannello destra)
  const [chapterNote,    setChapterNote]    = useState('');
  const [notesSaved,     setNotesSaved]     = useState(true);

  const saveTimer = useRef(null);
  const activeChapter = chapters.find(c => c.id === activeId);

  // ── Editor Tiptap ──
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      // Debounce autosave 3 secondi
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveContent(editor.getHTML());
      }, 3000);
    },
  });

  // ── Subscribe capitoli ──
  useEffect(() => {
    if (!uid || !wid) return;
    const unsub = subscribeChapters(uid, wid, data => {
      setChapters(data);
      // Se non c'è un capitolo attivo, seleziona il primo
      if (data.length > 0 && !activeId) {
        setActiveId(data[0].id);
      }
    });
    return unsub;
  }, [uid, wid]);

  // ── Subscribe testi (per import) ──
  useEffect(() => {
    if (!uid || !wid) return;
    const unsub = subscribeTexts(uid, wid, setTexts);
    return unsub;
  }, [uid, wid]);

  // ── Carica contenuto quando cambia capitolo attivo ──
  useEffect(() => {
    if (!editor || !activeChapter) return;
    editor.commands.setContent(activeChapter.content || '');
    setChapterNote(activeChapter.notes || '');
    setNotesSaved(true);
    setSaveStatus('saved');
    clearTimeout(saveTimer.current);
  }, [activeId, editor]);

  // ── Salva contenuto ──
  const saveContent = useCallback(async (html) => {
    if (!activeId) return;
    setSaveStatus('saving');
    try {
      await updateChapter(uid, wid, activeId, {
        content: html,
        wordCount: countWords(html),
      });
      setSaveStatus('saved');
    } catch (e) {
      console.error(e);
      setSaveStatus('unsaved');
    }
  }, [uid, wid, activeId]);

  // ── Salva forzato (Ctrl+S) ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editor && saveStatus === 'unsaved') {
          clearTimeout(saveTimer.current);
          saveContent(editor.getHTML());
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, saveStatus, saveContent]);

  // ── Nuovo capitolo ──
  const handleNewChapter = async () => {
    const order = chapters.length;
    const id = await addChapter(uid, wid, {
      title: `Capitolo ${order + 1}`,
      content: '',
      order,
    });
    setActiveId(id);
    showToast('✓ Capitolo creato');
  };

  // ── Elimina capitolo ──
  const handleDelete = async (cid) => {
    if (!window.confirm('Eliminare questo capitolo? Il contenuto verrà perso.')) return;
    await deleteChapter(uid, wid, cid);
    if (activeId === cid) {
      const remaining = chapters.filter(c => c.id !== cid);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('🗑 Capitolo eliminato');
  };

  // ── Rinomina capitolo ──
  const handleRename = async (cid, newTitle) => {
    if (!newTitle.trim()) return;
    await updateChapter(uid, wid, cid, { title: newTitle.trim() });
  };

  // ── Cambia status ──
  const handleStatusChange = async (cid, status) => {
    await updateChapter(uid, wid, cid, { status });
  };

  // ── Drag & drop riordina ──
  const handleDragStart = (id) => setDragging(id);
  const handleDragOver  = (e, id) => { e.preventDefault(); setDragOver(id); };
  const handleDrop      = async (e, targetId) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const ids      = chapters.map(c => c.id);
    const fromIdx  = ids.indexOf(dragging);
    const toIdx    = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, dragging);
    setDragging(null); setDragOver(null);
    await reorderChapters(uid, wid, reordered);
  };

  // ── Salva note ──
  const handleSaveNote = async () => {
    if (!activeId) return;
    await updateChapter(uid, wid, activeId, { notes: chapterNote });
    setNotesSaved(true);
    showToast('✓ Note salvate');
  };

  // ── Import da Testi ──
  const handleImport = async (textMeta) => {
    setImportingId(textMeta.id);
    try {
      const content = await loadTextContent(uid, wid, textMeta.id);
      const parts = splitIntoChapters(content, textMeta.customSep || '');
      const startOrder = chapters.length;
      for (let i = 0; i < parts.length; i++) {
        await addChapter(uid, wid, {
          title:   parts[i].title,
          content: `<p>${parts[i].text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
          order:   startOrder + i,
        });
      }
      setShowImport(false);
      showToast(`✓ Importati ${parts.length} capitoli`);
    } catch (e) {
      showToast('⚠ Errore durante l\'importazione');
      console.error(e);
    }
    setImportingId(null);
  };

  // ── Export capitolo come .txt ──
  const handleExport = () => {
    if (!activeChapter || !editor) return;
    const text = editor.getText();
    const blob = new Blob([activeChapter.title + '\n\n' + text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${activeChapter.title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Totale parole ──
  const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || 0), 0);

  const STATUS_COLOR = { draft: 'var(--text-muted)', wip: 'var(--char)', done: 'var(--place)' };
  const STATUS_LABEL = { draft: '✏', wip: '🔵', done: '✅' };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Colonna sinistra: outline capitoli ── */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--surface)',
        overflow: 'hidden',
      }}>
        {/* Header outline */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--text)' }}>
              Capitoli
            </div>
            <button className="btn-p" style={{ fontSize: 11, padding: '3px 8px' }} onClick={handleNewChapter}>
              +
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {chapters.length} cap. · {totalWords.toLocaleString()} parole
          </div>
        </div>

        {/* Lista capitoli */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {chapters.length === 0 ? (
            <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
              Nessun capitolo.<br />Creane uno o importa da Testi.
            </div>
          ) : chapters.map(ch => (
            <div key={ch.id}
              draggable
              onDragStart={() => handleDragStart(ch.id)}
              onDragOver={e => handleDragOver(e, ch.id)}
              onDrop={e => handleDrop(e, ch.id)}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              onClick={() => {
                // Salva il capitolo corrente prima di cambiare
                if (editor && saveStatus === 'unsaved') {
                  clearTimeout(saveTimer.current);
                  saveContent(editor.getHTML());
                }
                setActiveId(ch.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', cursor: 'pointer',
                background: activeId === ch.id ? 'var(--surface2)' :
                            dragOver  === ch.id ? 'var(--gold-glow)' : 'transparent',
                borderLeft: `2px solid ${activeId === ch.id ? 'var(--gold)' : 'transparent'}`,
                transition: 'all .15s', opacity: dragging === ch.id ? .4 : 1,
              }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, cursor: 'grab' }}>⠿</span>
              <span style={{ fontSize: 12, color: STATUS_COLOR[ch.status || 'draft'], flexShrink: 0 }}>
                {STATUS_LABEL[ch.status || 'draft']}
              </span>
              <span style={{ fontSize: 13, color: activeId === ch.id ? 'var(--text)' : 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ch.title}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                {ch.wordCount || 0}p
              </span>
            </div>
          ))}
        </div>

        {/* Footer: import */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="btn-g" style={{ width: '100%', fontSize: 12 }}
            onClick={() => setShowImport(s => !s)}>
            {showImport ? '✕ Chiudi' : '📥 Importa da Testi'}
          </button>
          {showImport && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
              {texts.length === 0
                ? <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Nessun testo salvato</div>
                : texts.map(t => (
                  <div key={t.id}
                    onClick={() => handleImport(t)}
                    style={{ padding: '7px 8px', fontSize: 12, cursor: importingId === t.id ? 'wait' : 'pointer', borderRadius: 6, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <span>📄</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    {importingId === t.id && <span style={{ fontSize: 10 }}>⏳</span>}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Colonna centrale: editor ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {activeChapter ? (
          <>
            {/* Header editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              {/* Titolo editabile */}
              <input
                value={activeChapter.title}
                onChange={e => updateChapter(uid, wid, activeId, { title: e.target.value })}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--text)' }}
              />
              {/* Status */}
              <select
                value={activeChapter.status || 'draft'}
                onChange={e => handleStatusChange(activeId, e.target.value)}
                className="fs"
                style={{ margin: 0, fontSize: 12, padding: '3px 8px', width: 'auto' }}>
                <option value="draft">✏ Bozza</option>
                <option value="wip">🔵 In sviluppo</option>
                <option value="done">✅ Definitivo</option>
              </select>
              {/* Salva status */}
              <span style={{ fontSize: 11, color: saveStatus === 'saved' ? 'var(--place)' : saveStatus === 'saving' ? 'var(--gold)' : 'var(--text-muted)', flexShrink: 0 }}>
                {saveStatus === 'saved' ? '✓ Salvato' : saveStatus === 'saving' ? '⏳ Salvataggio…' : '● Non salvato'}
              </span>
              {/* Export */}
              <button className="btn-g" style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }} onClick={handleExport}>
                ↓ .txt
              </button>
              {/* Elimina */}
              <button className="btn-d" style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }} onClick={() => handleDelete(activeId)}>
                🗑
              </button>
              {/* Toggle pannello destra */}
              <button className="btn-g" style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                onClick={() => setShowRightPanel(s => !s)}>
                {showRightPanel ? '▶' : '◀'}
              </button>
            </div>

            {/* Toolbar Tiptap */}
            <Toolbar editor={editor} />

            {/* Area editor */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', maxWidth: 780, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
              <EditorContent editor={editor} style={{ minHeight: 400 }} />
            </div>

            {/* Word count footer */}
            <div style={{ padding: '6px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16, flexShrink: 0 }}>
              <span>{activeChapter.wordCount || 0} parole in questo capitolo</span>
              <span>{totalWords.toLocaleString()} parole totali</span>
              <span style={{ marginLeft: 'auto', fontSize: 10 }}>Ctrl+S per salvare</span>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32 }}>✍</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--text)' }}>Nessun capitolo selezionato</div>
            <div style={{ fontSize: 13 }}>Crea un nuovo capitolo o importa da Testi</div>
            <button className="btn-p" onClick={handleNewChapter}>+ Nuovo capitolo</button>
          </div>
        )}
      </div>

      {/* ── Colonna destra: pannello contestuale ── */}
      {showRightPanel && activeChapter && (
        <div style={{
          width: 240, flexShrink: 0, borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', background: 'var(--surface)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>
              Pannello capitolo
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {/* Note capitolo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Note
              </div>
              <textarea
                value={chapterNote}
                onChange={e => { setChapterNote(e.target.value); setNotesSaved(false); }}
                onBlur={handleSaveNote}
                placeholder="Note su questo capitolo…"
                style={{ width: '100%', minHeight: 100, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 13, padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              />
              {!notesSaved && (
                <button className="btn-g" style={{ fontSize: 11, marginTop: 4 }} onClick={handleSaveNote}>
                  Salva note
                </button>
              )}
            </div>

            {/* Elementi del mondo collegati */}
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Elementi mondo
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
                Elementi menzionati nel capitolo:
              </div>
              {/* Ricerca elementi da collegare */}
              <ChapterElementLinker
                chapter={activeChapter}
                elements={elements}
                cats={cats}
                onLink={async (elId) => {
                  const current = activeChapter.tags || [];
                  if (!current.includes(elId)) {
                    await updateChapter(uid, wid, activeId, { tags: [...current, elId] });
                  }
                }}
                onUnlink={async (elId) => {
                  await updateChapter(uid, wid, activeId, { tags: (activeChapter.tags || []).filter(id => id !== elId) });
                }}
                onOpen={onOpenElement}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sotto-componente: collegamento elementi al capitolo ───────────────────
function ChapterElementLinker({ chapter, elements, cats, onLink, onUnlink, onOpen }) {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const inputRef = useRef(null);

  const linked    = (chapter.tags || []).map(id => elements.find(e => e.id === id)).filter(Boolean);
  const available = elements.filter(e =>
    !(chapter.tags || []).includes(e.id) &&
    (!query || e.name.toLowerCase().includes(query.toLowerCase()))
  );
  const grouped = cats
    .map(c => ({ cat: c, items: available.filter(e => e.cat === c.id) }))
    .filter(g => g.items.length > 0);

  return (
    <div>
      {/* Chip elementi collegati */}
      {linked.map(el => {
        const cat = cats.find(c => c.id === el.cat);
        const color = cat?.color || '#888';
        return (
          <span key={el.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 7px', margin: '0 3px 4px 0', borderRadius: 20, background: color + '22', border: `1px solid ${color}44`, color: 'var(--text-dim)', cursor: 'pointer' }}
            onClick={() => onOpen(el.id)}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {el.name}
            <span style={{ opacity: .6, fontSize: 12, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onUnlink(el.id); }}>×</span>
          </span>
        );
      })}

      {/* Input ricerca */}
      <div style={{ position: 'relative', marginTop: 6 }}>
        <input ref={inputRef} type="text" placeholder="Collega elemento…"
          value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontFamily: "'Crimson Pro', serif", fontSize: 12, padding: '5px 9px', outline: 'none' }} />

        {open && grouped.length > 0 && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r)', boxShadow: '0 -8px 24px rgba(0,0,0,.5)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
            {grouped.map(({ cat: c, items }) => (
              <div key={c.id}>
                <div style={{ padding: '4px 10px 3px', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: c.color, background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                  {c.icon} {c.name}
                </div>
                {items.map(el => (
                  <div key={el.id} onMouseDown={() => { onLink(el.id); setQuery(''); }}
                    style={{ padding: '6px 10px 6px 18px', cursor: 'pointer', fontSize: 12, color: 'var(--text-dim)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {el.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
