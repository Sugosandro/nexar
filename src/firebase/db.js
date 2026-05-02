// src/firebase/db.js
// ─────────────────────────────────────────────
// Tutte le operazioni Firestore dell'app.
// Questo file è il "ponte" tra React e Firebase.
// ─────────────────────────────────────────────

import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from './config';

// ── Helpers per costruire i path Firestore ──
const worldRef  = (uid, wid)           => doc(db, 'users', uid, 'worlds', wid);
const colRef    = (uid, wid, col)      => collection(db, 'users', uid, 'worlds', wid, col);
const docRef    = (uid, wid, col, id)  => doc(db, 'users', uid, 'worlds', wid, col, id);


// ══════════════════════════════════════════════
// MONDI
// ══════════════════════════════════════════════

/** Ritorna tutti i mondi dell'utente (una volta sola) */
export async function getWorlds(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'worlds'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Crea un nuovo mondo vuoto */
export async function createWorld(uid, name) {
  const ref = await addDoc(collection(db, 'users', uid, 'worlds'), {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Aggiorna il nome di un mondo */
export async function updateWorldName(uid, wid, name) {
  await updateDoc(worldRef(uid, wid), { name, updatedAt: serverTimestamp() });
}

/** Elimina un mondo e tutto il suo contenuto */
export async function deleteWorld(uid, wid) {
  // Nota: Firestore non cancella le sottocollezioni automaticamente.
  // Per ora eliminiamo il documento padre; in produzione usa una Cloud Function.
  await deleteDoc(worldRef(uid, wid));
}


// ══════════════════════════════════════════════
// ELEMENTI (personaggi, luoghi, oggetti, eventi, ecc.)
// ══════════════════════════════════════════════

/**
 * Sottoscrizione real-time agli elementi.
 * Chiama onData ogni volta che i dati cambiano.
 * Ritorna la funzione di unsubscribe (da chiamare in useEffect cleanup).
 *
 * Esempio:
 *   useEffect(() => {
 *     const unsub = subscribeElements(uid, wid, setElements);
 *     return unsub;
 *   }, [uid, wid]);
 */
export function subscribeElements(uid, wid, onData) {
  const q = query(colRef(uid, wid, 'elements'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/** Aggiunge un nuovo elemento */
export async function addElement(uid, wid, element) {
  const ref = await addDoc(colRef(uid, wid, 'elements'), {
    ...element,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Aggiorna un elemento esistente */
export async function updateElement(uid, wid, eid, changes) {
  await updateDoc(docRef(uid, wid, 'elements', eid), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/** Elimina un elemento */
export async function deleteElement(uid, wid, eid) {
  await deleteDoc(docRef(uid, wid, 'elements', eid));
}


// ══════════════════════════════════════════════
// ARCHI NARRATIVI
// ══════════════════════════════════════════════

export function subscribeArcs(uid, wid, onData) {
  return onSnapshot(colRef(uid, wid, 'arcs'), snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addArc(uid, wid, arc) {
  const ref = await addDoc(colRef(uid, wid, 'arcs'), {
    ...arc,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateArc(uid, wid, aid, changes) {
  await updateDoc(docRef(uid, wid, 'arcs', aid), changes);
}

export async function deleteArc(uid, wid, aid) {
  await deleteDoc(docRef(uid, wid, 'arcs', aid));
}


// ══════════════════════════════════════════════
// FAZIONI
// ══════════════════════════════════════════════

export function subscribeFazioni(uid, wid, onData) {
  return onSnapshot(colRef(uid, wid, 'fazioni'), snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addFazione(uid, wid, fazione) {
  const ref = await addDoc(colRef(uid, wid, 'fazioni'), {
    ...fazione,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFazione(uid, wid, fid, changes) {
  await updateDoc(docRef(uid, wid, 'fazioni', fid), changes);
}

export async function deleteFazione(uid, wid, fid) {
  await deleteDoc(docRef(uid, wid, 'fazioni', fid));
}


// ══════════════════════════════════════════════
// SISTEMI DI MAGIA
// ══════════════════════════════════════════════

export function subscribeMagie(uid, wid, onData) {
  return onSnapshot(colRef(uid, wid, 'magie'), snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addMagia(uid, wid, magia) {
  const ref = await addDoc(colRef(uid, wid, 'magie'), {
    ...magia,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMagia(uid, wid, mid, changes) {
  await updateDoc(docRef(uid, wid, 'magie', mid), changes);
}

export async function deleteMagia(uid, wid, mid) {
  await deleteDoc(docRef(uid, wid, 'magie', mid));
}


// ══════════════════════════════════════════════
// CATEGORIE PERSONALIZZATE
// ══════════════════════════════════════════════

export function subscribeCats(uid, wid, onData) {
  return onSnapshot(colRef(uid, wid, 'cats'), snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addCat(uid, wid, cat) {
  const ref = await addDoc(colRef(uid, wid, 'cats'), cat);
  return ref.id;
}

export async function updateCat(uid, wid, cid, changes) {
  await updateDoc(docRef(uid, wid, 'cats', cid), changes);
}

export async function deleteCat(uid, wid, cid) {
  await deleteDoc(docRef(uid, wid, 'cats', cid));
}


// ══════════════════════════════════════════════
// MAPPA
// ══════════════════════════════════════════════

/** Legge i dati della mappa (una volta sola) */
export async function getMap(uid, wid) {
  try {
    const [dataSnap, imgSnap] = await Promise.all([
      getDoc(docRef(uid, wid, 'map', 'data')),
      getDoc(docRef(uid, wid, 'map', 'image')),
    ]);
    const data  = dataSnap.exists() ? dataSnap.data()  : { pois: [] };
    const image = imgSnap.exists()  ? imgSnap.data().base64 : '';
    return { ...data, image };
  } catch { return { image: '', pois: [] }; }
}

export async function saveMap(uid, wid, mapData) {
  const { image, ...rest } = mapData;
  await Promise.all([
    setDoc(docRef(uid, wid, 'map', 'data'),  { ...rest }),
    setDoc(docRef(uid, wid, 'map', 'image'), { base64: image || '' }),
  ]);
}


// ══════════════════════════════════════════════
// PROFILO UTENTE
// ══════════════════════════════════════════════

/** Crea o aggiorna il profilo utente al primo login */
export async function upsertUserProfile(user) {
  const ref = doc(db, 'users', user.uid, 'profile', 'data');
  await setDoc(ref, {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    lastLogin: serverTimestamp(),
  }, { merge: true });
}
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/** Carica un'immagine base64 su Storage e ritorna l'URL */
export async function uploadMapImage(uid, wid, base64) {
  const storageRef = ref(storage, `maps/${uid}/${wid}/map.jpg`);
  await uploadString(storageRef, base64, 'data_url');
  return getDownloadURL(storageRef);
}
/** Salva le posizioni dei nodi del grafo connessioni */
export async function saveGraphPositions(uid, wid, positions) {
  await setDoc(doc(db, 'users', uid, 'worlds', wid, 'graph', 'positions'), { positions });
}

/** Legge le posizioni dei nodi */
export async function getGraphPositions(uid, wid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'worlds', wid, 'graph', 'positions'));
    return snap.exists() ? snap.data().positions : {};
  } catch { return {}; }
}