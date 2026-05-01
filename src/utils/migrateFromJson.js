// src/utils/migrateFromJson.js
// ─────────────────────────────────────────────
// Utility per importare i dati dall'app HTML originale in Firestore.
//
// COME USARLO:
// 1. Nell'app HTML originale, clicca "⬇ Esporta" e salva il JSON
// 2. In questa app React, aggiungi un pulsante temporaneo che chiama migrateFromJson()
// 3. Incolla il contenuto del JSON quando richiesto
// 4. Rimuovi il pulsante dopo la migrazione
// ─────────────────────────────────────────────

import { addDoc, setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Importa tutti i dati da un JSON esportato dall'app originale.
 *
 * @param {string} uid - ID dell'utente corrente
 * @param {string} wid - ID del mondo in cui importare
 * @param {object} jsonData - oggetto JSON parsato dall'export originale
 * @param {function} onProgress - callback(msg) per aggiornamenti UI
 */
export async function migrateFromJson(uid, wid, jsonData, onProgress = console.log) {
  const base = (col) => collection(db, 'users', uid, 'worlds', wid, col);
  const docAt = (col, id) => doc(db, 'users', uid, 'worlds', wid, col, id);

  // ── Elementi ──
  onProgress('Importo elementi…');
  for (const el of (jsonData.elements || [])) {
    const { id, ...data } = el;
    await addDoc(base('elements'), {
      ...data,
      legacyId: id, // mantieni l'id originale per riferimento
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  onProgress(`✓ ${jsonData.elements?.length || 0} elementi importati`);

  // ── Archi ──
  onProgress('Importo archi narrativi…');
  for (const arc of (jsonData.arcs || [])) {
    const { id, ...data } = arc;
    await addDoc(base('arcs'), { ...data, legacyId: id, createdAt: serverTimestamp() });
  }
  onProgress(`✓ ${jsonData.arcs?.length || 0} archi importati`);

  // ── Fazioni ──
  onProgress('Importo fazioni…');
  for (const faz of (jsonData.fazioni || [])) {
    const { id, ...data } = faz;
    await addDoc(base('fazioni'), { ...data, legacyId: id, createdAt: serverTimestamp() });
  }
  onProgress(`✓ ${jsonData.fazioni?.length || 0} fazioni importate`);

  // ── Magie ──
  onProgress('Importo sistemi di magia…');
  for (const mag of (jsonData.magie || [])) {
    const { id, ...data } = mag;
    await addDoc(base('magie'), { ...data, legacyId: id, createdAt: serverTimestamp() });
  }
  onProgress(`✓ ${jsonData.magie?.length || 0} sistemi di magia importati`);

  // ── Categorie personalizzate ──
  onProgress('Importo categorie personalizzate…');
  for (const cat of (jsonData.cats || [])) {
    const { id, ...data } = cat;
    await addDoc(base('cats'), data);
  }
  onProgress(`✓ ${jsonData.cats?.length || 0} categorie importate`);

  // ── Mappa ──
  if (jsonData.map) {
    onProgress('Importo mappa…');
    await setDoc(docAt('map', 'data'), jsonData.map);
    onProgress('✓ Mappa importata');
  }

  onProgress('🎉 Migrazione completata!');
}

/**
 * Helper: apre un file picker e ritorna il JSON parsato.
 * Usalo in un onClick per caricare il file esportato.
 */
export function pickAndParseJson() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return reject(new Error('Nessun file selezionato'));
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          resolve(JSON.parse(ev.target.result));
        } catch {
          reject(new Error('File JSON non valido'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
