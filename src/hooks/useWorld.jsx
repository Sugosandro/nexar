import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  subscribeElements, subscribeArcs, subscribeFazioni,
  subscribeMagie, subscribeCats,
  subscribeFili, addFilo, updateFilo, deleteFilo,
  subscribeSessioni, addSessione, updateSessione, deleteSessione,
  subscribeRumors, addRumor, updateRumor, deleteRumor,
  subscribeHandouts, addHandout, updateHandout, deleteHandout,
  subscribeTavole, addTabella, updateTabella, deleteTabella,
  addElement, updateElement, deleteElement, syncBidirectionalTags,
  addArc, updateArc, deleteArc,
  addFazione, updateFazione, deleteFazione,
  addMagia, updateMagia, deleteMagia,
  addCat, updateCat, deleteCat,
} from '../firebase/db';
import { db } from '../firebase/config';

export const BUILTIN_CATS = [
  { id: 'char',   name: 'Personaggi', icon: '👤', color: '#7ab8d4', colorDim: '#2a4a5a', subs: ['NPC'], builtin: true },
  { id: 'place',  name: 'Luoghi',     icon: '📍', color: '#8fbd7c', colorDim: '#2f4a28', subs: [], builtin: true },
  { id: 'object', name: 'Oggetti',    icon: '📦', color: '#d4956a', colorDim: '#4a2e18', subs: [], builtin: true },
  { id: 'event',  name: 'Eventi',     icon: '⚡', color: '#b88fc4', colorDim: '#3a2848', subs: [], builtin: true },
];

// ── Helpers formato tag ──────────────────────────────────────────────────
// I tag possono essere stringhe (vecchio formato) o oggetti { id, rel, importance }
export const TAG_IMPORTANCE = ['Alta', 'Media', 'Bassa', 'Trascurabile'];
export const TAG_IMP_LABEL  = { Alta: '❤❤❤', Media: '❤❤', Bassa: '❤', Trascurabile: '·' };
export const TAG_IMP_COLOR  = { Alta: '#e07070', Media: '#d4a84c', Bassa: '#7ab8d4', Trascurabile: '#555' };

// Estrai l'ID da un tag (stringa o oggetto)
export const tagId  = (t) => (typeof t === 'string' ? t : t?.id);
// Converti tag in oggetto normalizzato
export const tagObj = (t) => typeof t === 'string'
  ? { id: t, rel: '', importance: 'Media' }
  : { ...t, rel: t.rel || '', importance: t.importance || 'Media' };
// Ordina tag per importanza
export const sortTags = (tags) => {
  const order = { Alta: 0, Media: 1, Bassa: 2, Trascurabile: 3 };
  return [...(tags || [])].sort((a, b) => {
    const ia = order[tagObj(a).importance] ?? 1;
    const ib = order[tagObj(b).importance] ?? 1;
    return ia - ib;
  });
};

const WorldContext = createContext(null);

export function WorldProvider({ uid, wid, children }) {
  const { t } = useTranslation();
  const [elements, setElements] = useState([]);
  const [arcs,     setArcs]     = useState([]);
  const [fazioni,  setFazioni]  = useState([]);
  const [magie,    setMagie]    = useState([]);
  const [cats,     setCats]     = useState([]);
  const [filiNarr, setFiliNarr] = useState([]);
  const [sessioni, setSessioni] = useState([]);
  const [rumors,   setRumors]   = useState([]);
  const [handouts, setHandouts] = useState([]);
  const [tavole,   setTavole]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!uid || !wid) return;
    setLoading(true);
    const unsubEl   = subscribeElements(uid, wid, data => { setElements(data); setLoading(false); });
    const unsubArc  = subscribeArcs    (uid, wid, setArcs);
    const unsubFaz  = subscribeFazioni (uid, wid, setFazioni);
    const unsubMag  = subscribeMagie   (uid, wid, setMagie);
    const unsubCat  = subscribeCats    (uid, wid, setCats);
    const unsubFili = subscribeFili    (uid, wid, setFiliNarr);
    const unsubSess = subscribeSessioni(uid, wid, setSessioni);
    const unsubRum  = subscribeRumors  (uid, wid, setRumors);
    const unsubHnd  = subscribeHandouts(uid, wid, setHandouts);
    const unsubTav  = subscribeTavole  (uid, wid, setTavole);
    return () => { unsubEl(); unsubArc(); unsubFaz(); unsubMag(); unsubCat(); unsubFili(); unsubSess(); unsubRum(); unsubHnd(); unsubTav(); };
  }, [uid, wid]);

  // ── Helpers ──
  const allCats = () => {
    return BUILTIN_CATS.map(bc => {
      const override   = cats.find(c => c.id === bc.id);
      const customSubs = override?.subs || [];
      const mergedSubs = [...new Set([...bc.subs, ...customSubs])];
      return { ...bc, name: t('cat.builtin_' + bc.id), subs: mergedSubs };
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
  // Propaga i nuovi membri a tutte le fazioni antenate
  const propagateToAncestors = async (ancestors, newMembers) => {
    for (const ancId of (ancestors || [])) {
      const anc = fazioni.find(f => f.id === ancId);
      if (!anc) continue;
      const merged = [...new Set([...(anc.members || []), ...newMembers])];
      await updateFazione(uid, wid, ancId, { members: merged });
    }
  };

  const addFazFn = async (data) => {
    const { _ancestors, ...fazData } = data;
    const id = await addFazione(uid, wid, { members: [], rels: [], parentId: null, ...fazData });
    if (_ancestors?.length && fazData.members?.length) {
      await propagateToAncestors(_ancestors, fazData.members);
    }
    return id;
  };

  const updateFazFn = async (fid, changes) => {
    const { _ancestors, ...fazChanges } = changes;
    await updateFazione(uid, wid, fid, fazChanges);
    if (_ancestors?.length && fazChanges.members?.length) {
      await propagateToAncestors(_ancestors, fazChanges.members);
    }
  };

  const deleteFazFn = (fid) => deleteFazione(uid, wid, fid);

  // ── Azioni magie ──
  const addMagFn    = (data)         => addMagia   (uid, wid, { users: [], rules: [], ...data });
  const updateMagFn = (mid, changes) => updateMagia(uid, wid, mid, changes);
  const deleteMagFn = (mid)          => deleteMagia(uid, wid, mid);

  // ── Azioni categorie ──
  const addCatFn    = (data)         => addCat   (uid, wid, { subs: [], ...data });
  const updateCatFn = (cid, changes) => updateCat(uid, wid, cid, changes);
  const deleteCatFn = (cid)          => deleteCat(uid, wid, cid);

  // ── Azioni fili narrativi ──
  const addFiloFn    = (data)         => addFilo   (uid, wid, data);
  const updateFiloFn = (fid, changes) => updateFilo(uid, wid, fid, changes);
  const deleteFiloFn = (fid)          => deleteFilo(uid, wid, fid);

  // ── Azioni sessioni ──
  const addSesseFn    = (data)         => addSessione   (uid, wid, data);
  const updateSesseFn = (sid, changes) => updateSessione(uid, wid, sid, changes);
  const deleteSesseFn = (sid)          => deleteSessione(uid, wid, sid);

  // ── Azioni rumors ──
  const addRumorFn    = (data)         => addRumor   (uid, wid, data);
  const updateRumorFn = (rid, changes) => updateRumor(uid, wid, rid, changes);
  const deleteRumorFn = (rid)          => deleteRumor(uid, wid, rid);

  // ── Azioni handouts ──
  const addHandoutFn    = (data)         => addHandout   (uid, wid, data);
  const updateHandoutFn = (hid, changes) => updateHandout(uid, wid, hid, changes);
  const deleteHandoutFn = (hid)          => deleteHandout(uid, wid, hid);

  // ── Azioni tavole ──
  const addTabellaFn    = (data)         => addTabella   (uid, wid, data);
  const updateTabellaFn = (tid, changes) => updateTabella(uid, wid, tid, changes);
  const deleteTabellaFn = (tid)          => deleteTabella(uid, wid, tid);

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
    elements, arcs, fazioni, magie, cats, fili: filiNarr, sessioni, rumors, handouts, tavole, loading,
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
    addFilo: addFiloFn, updateFilo: updateFiloFn, deleteFilo: deleteFiloFn,
    addSessione: addSesseFn, updateSessione: updateSesseFn, deleteSessione: deleteSesseFn,
    addRumor: addRumorFn, updateRumor: updateRumorFn, deleteRumor: deleteRumorFn,
    addHandout: addHandoutFn, updateHandout: updateHandoutFn, deleteHandout: deleteHandoutFn,
    addTabella: addTabellaFn, updateTabella: updateTabellaFn, deleteTabella: deleteTabellaFn,
    upsertBuiltinSubs,
  };

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld deve essere usato dentro WorldProvider');
  return ctx;
}