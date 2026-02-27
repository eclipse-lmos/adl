'use client';

import * as React from 'react';
import { createClient, Provider as UrqlProvider, cacheExchange, fetchExchange } from 'urql';
import { ThemeProvider } from '@/components/theme-provider';
import { initializeFirebase, FirebaseClientProvider } from '@/firebase';

const client = createClient({
  url: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql',
  exchanges: [cacheExchange, fetchExchange],
});

const { firebaseApp, firestore, auth } = initializeFirebase();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <UrqlProvider value={client}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </UrqlProvider>
    </FirebaseClientProvider>
  );
}
