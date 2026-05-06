import { createContext, useContext, useEffect, useState } from 'react';
import {
  subscribeElements, subscribeArcs, subscribeFazioni,
  subscribeMagie, subscribeCats,
  addElement, updateElement, deleteElement, syncBidirectionalTags,
  addArc, updateArc, deleteArc,
  addFazione, updateFazione, deleteFazione,
  addMagia, updateMagia, deleteMagia,
  addCat, updateCat, deleteCat,
} from '../firebase/db';
import { db } from '../firebase/config';

export const BUILTIN_CATS = [
  { id: 'char',   name: 'Personaggi', icon: '👤', color: '#7ab8d4', colorDim: '#2a4a5a', subs: [], builtin: true },
  { id: 'place',  name: 'Luoghi',     icon: '📍', color: '#8fbd7c', colorDim: '#2f4a28', subs: [], builtin: true },
  { id: 'object', name: 'Oggetti',    icon: '📦', color: '#d4956a', colorDim: '#4a2e18', subs: [], builtin: true },
  { id: 'event',  name: 'Eventi',     icon: '⚡', color: '#b88fc4', colorDim: '#3a2848', subs: [], builtin: true },
];

// ── Helpers formato tag ──────────────────────────────────────────────────
// I tag possono essere stringhe (vecchio formato) o oggetti { id, rel, importance }
export const TAG_IMPORTANCE = ['alta', 'media', 'bassa', 'trascurabile'];
export const TAG_IMP_LABEL  = { alta: '❤❤❤', media: '❤❤', bassa: '❤', trascurabile: '·' };
export const TAG_IMP_COLOR  = { alta: '#e07070', media: '#d4a84c', bassa: '#7ab8d4', trascurabile: '#555' };

// Estrai l'ID da un tag (stringa o oggetto)
export const tagId  = (t) => (typeof t === 'string' ? t : t?.id);
// Converti tag in oggetto normalizzato
export const tagObj = (t) => typeof t === 'string'
  ? { id: t, rel: '', importance: 'media' }
  : { id: t.id, rel: t.rel || '', importance: t.importance || 'media' };
// Ordina tag per importanza
export const sortTags = (tags) => {
  const order = { alta: 0, media: 1, bassa: 2, trascurabile: 3 };
  return [...(tags || [])].sort((a, b) => {
    const ia = order[tagObj(a).importance] ?? 1;
    const ib = order[tagObj(b).importance] ?? 1;
    return ia - ib;
  });
};

const WorldContext = createContext(null);

export function WorldProvider({ uid, wid, children }) {
  const [elements, setElements] = useState([]);
  const [arcs,     setArcs]     = useState([]);
  const [fazioni,  setFazioni]  = useState([]);
  const [magie,    setMagie]    = useState([]);
  const [cats,     setCats]     = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!uid || !wid) return;
    setLoading(true);
    const unsubEl  = subscribeElements(uid, wid, data => { setElements(data); setLoading(false); });
    const unsubArc = subscribeArcs    (uid, wid, setArcs);
    const unsubFaz = subscribeFazioni (uid, wid, setFazioni);
    const unsubMag = subscribeMagie   (uid, wid, setMagie);
    const unsubCat = subscribeCats    (uid, wid, setCats);
    return () => { unsubEl(); unsubArc(); unsubFaz(); unsubMag(); unsubCat(); };
  }, [uid, wid]);

  // ── Helpers ──
  const allCats = () => {
    return BUILTIN_CATS.map(bc => {
      const override = cats.find(c => c.id === bc.id);
      return override ? { ...bc, subs: override.subs || [] } : bc;
    }).concat(
      // Escludi documenti malformati: devono avere name E non corrispondere a una built-in
      cats.filter(c => c.name && !BUILTIN_CATS.find(bc => bc.id === c.id))
    );
  };

  const catById   = (id) => allCats().find(c => c.id === id);
  const elById    = (id) => elements.find(e => e.id === id);
  const arcById   = (id) => arcs.find(a => a.id === id);
  const fazById   = (id) => fazioni.find(f => f.id === id);
  const magById   = (id) => magie.find(m => m.id === id);

  const backlinks    = (id) => elements.filter(e => e.id !== id && (e.tags || []).some(t => tagId(t) === id));
  const arcsByMember = (id) => arcs.filter(a => (a.members || []).includes(id));
  const fazioniOfEl  = (id) => fazioni.filter(f => (f.members || []).includes(id));
  const magieOfEl    = (id) => magie.filter(m => (m.users || []).includes(id));

  const elColor    = (el) => catById(el?.cat)?.color    || '#888';
  const elColorDim = (el) => catById(el?.cat)?.colorDim || '#333';
  const elIcon     = (el) => catById(el?.cat)?.icon     || '?';
  const elLabel    = (el) => {
    const c = catById(el?.cat);
    if (!c) return '?';
    return el.sub ? `${c.name} › ${el.sub}` : c.name;
  };

  // ── Azioni elementi ──
  const addEl = (data) =>
    addElement(uid, wid, { powers: [], equip: [], changelog: [], tags: [], status: 'draft', ...data });

  const updateEl = async (eid, changes) => {
    if ('tags' in changes) {
      const current = elements.find(e => e.id === eid);
      // Normalizza in array di ID per il confronto
      const oldIds  = (current?.tags || []).map(tagId);
      const newIds  = (changes.tags  || []).map(tagId);
      await updateElement(uid, wid, eid, changes);
      // Passa gli ID semplici a syncBidirectionalTags
      await syncBidirectionalTags(uid, wid, eid, oldIds, newIds);
    } else {
      await updateElement(uid, wid, eid, changes);
    }
  };

  const deleteEl = (eid) => deleteElement(uid, wid, eid);

  // ── Azioni archi ──
  const addArcFn    = (data)         => addArc   (uid, wid, { members: [], phases: [], ...data });
  const updateArcFn = (aid, changes) => updateArc(uid, wid, aid, changes);
  const deleteArcFn = (aid)          => deleteArc(uid, wid, aid);

  // ── Azioni fazioni ──
  const addFazFn    = (data)         => addFazione   (uid, wid, { members: [], rels: [], parentId: null, ...data });
  const updateFazFn = (fid, changes) => updateFazione(uid, wid, fid, changes);
  const deleteFazFn = (fid)          => deleteFazione(uid, wid, fid);

  // ── Azioni magie ──
  const addMagFn    = (data)         => addMagia   (uid, wid, { users: [], rules: [], ...data });
  const updateMagFn = (mid, changes) => updateMagia(uid, wid, mid, changes);
  const deleteMagFn = (mid)          => deleteMagia(uid, wid, mid);

  // ── Azioni categorie ──
  const addCatFn    = (data)         => addCat   (uid, wid, { subs: [], ...data });
  const updateCatFn = (cid, changes) => updateCat(uid, wid, cid, changes);
  const deleteCatFn = (cid)          => deleteCat(uid, wid, cid);

  const upsertBuiltinSubs = async (catId, newSub) => {
    // Usa sempre setDoc con l'ID della built-in — fa upsert automatico.
    // Legge prima le subs esistenti per non sovrascriverle.
    const { setDoc, doc, getDoc } = await import('firebase/firestore');
    const ref  = doc(db, 'users', uid, 'worlds', wid, 'cats', catId);
    const snap = await getDoc(ref);
    const existingSubs = snap.exists() ? (snap.data().subs || []) : [];
    if (existingSubs.includes(newSub)) return; // già presente
    await setDoc(ref, { subs: [...existingSubs, newSub] }, { merge: true });
  };

  const value = {
    elements, arcs, fazioni, magie, cats, loading,
    uid, wid,
    allCats, catById, elById, arcById, fazById, magById,
    tagId, tagObj, sortTags,
    backlinks, arcsByMember, fazioniOfEl, magieOfEl,
    elColor, elColorDim, elIcon, elLabel,
    addEl, updateEl, deleteEl,
    addArc: addArcFn, updateArc: updateArcFn, deleteArc: deleteArcFn,
    addFazione: addFazFn, updateFazione: updateFazFn, deleteFazione: deleteFazFn,
    addMagia: addMagFn, updateMagia: updateMagFn, deleteMagia: deleteMagFn,
    addCat: addCatFn, updateCat: updateCatFn, deleteCat: deleteCatFn,
    upsertBuiltinSubs,
  };

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld deve essere usato dentro WorldProvider');
  return ctx;
}