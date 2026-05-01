// src/hooks/useAuth.js
// ─────────────────────────────────────────────
// Hook per gestire l'autenticazione Google.
// Usalo in qualsiasi componente per sapere se l'utente è loggato.
//
// Esempio:
//   const { user, loading, signIn, signOut } = useAuth();
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { upsertUserProfile } from '../firebase/db';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged rimane in ascolto: se l'utente riapre l'app
    // mentre è già loggato, viene riconosciuto automaticamente.
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await upsertUserProfile(firebaseUser);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub; // cleanup
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged gestirà il resto
    } catch (err) {
      console.error('Errore login:', err);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return { user, loading, signIn, signOut };
}
