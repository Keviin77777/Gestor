'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Auto-login anonymously if no user is authenticated
  useEffect(() => {
    const checkAuthAndLogin = async () => {
      // Wait a bit for auth state to initialize
      setTimeout(() => {
        if (firebaseServices.auth && !firebaseServices.auth.currentUser) {
          console.log('No user authenticated, initiating anonymous login...');
          initiateAnonymousSignIn(firebaseServices.auth);
        }
      }, 1000);
    };

    checkAuthAndLogin();
  }, [firebaseServices.auth]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}