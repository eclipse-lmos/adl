'use client';

import * as React from 'react';
import { createClient, Provider as UrqlProvider, cacheExchange, fetchExchange } from 'urql';
import { ThemeProvider } from '@/components/theme-provider';
import { initializeFirebase, FirebaseClientProvider } from '@/firebase';
import {
  buildOrganizationHeaders,
  clearOrganizationAccessSession,
  getGraphqlUrl,
  isOrganizationAccessErrorMessage,
  readOrganizationAccess,
  resetOrganizationAccess,
  subscribeToOrganizationAccess,
} from '@/lib/organization-access';

const { firebaseApp, firestore, auth } = initializeFirebase();

export function Providers({ children }: { children: React.ReactNode }) {
  const [organizationAccess, setOrganizationAccess] = React.useState(() => readOrganizationAccess());

  React.useEffect(() => {
    setOrganizationAccess(readOrganizationAccess());
    return subscribeToOrganizationAccess((nextAccess) => {
      setOrganizationAccess(nextAccess);
    });
  }, []);

  const client = React.useMemo(() => createClient({
    url: getGraphqlUrl(),
    exchanges: [cacheExchange, fetchExchange],
    fetch: async (input, init) => {
      const response = await fetch(input, {
        ...init,
        credentials: 'include',
      });

      try {
        const payload = await response.clone().json() as { errors?: Array<{ message?: string }> };
        const hasOrganizationAccessError = payload.errors?.some(({ message }) => isOrganizationAccessErrorMessage(message));

        if (hasOrganizationAccessError && organizationAccess.authorizedOrganizationId) {
          resetOrganizationAccess();
          void clearOrganizationAccessSession();
        }
      } catch {
        // Ignore non-JSON responses and let urql handle the original response.
      }

      return response;
    },
    fetchOptions: () => ({
      credentials: 'include',
      headers: buildOrganizationHeaders(organizationAccess),
    }),
  }), [organizationAccess]);

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
