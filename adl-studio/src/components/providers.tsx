'use client';

import * as React from 'react';
import { createClient, Provider as UrqlProvider, cacheExchange, fetchExchange } from 'urql';
import { ThemeProvider } from '@/components/theme-provider';
import { initializeFirebase, FirebaseClientProvider } from '@/firebase';
import {
  buildOrganizationHeaders,
  getGraphqlUrl,
  isOrganizationAccessErrorMessage,
  ORGANIZATION_API_KEY_HEADER,
  readOrganizationAccess,
  resetOrganizationAccess,
  subscribeToOrganizationAccess,
} from '@/lib/organization-access';

const { firebaseApp, firestore, auth } = initializeFirebase();

function readHeaderValue(headers: HeadersInit | undefined, headerName: string): string {
  if (!headers) {
    return '';
  }

  if (headers instanceof Headers) {
    return headers.get(headerName) || '';
  }

  if (Array.isArray(headers)) {
    const headerEntry = headers.find(([name]) => name.toLowerCase() === headerName.toLowerCase());
    return headerEntry?.[1] || '';
  }

  const matchingHeader = Object.entries(headers).find(([name]) => name.toLowerCase() === headerName.toLowerCase());
  return typeof matchingHeader?.[1] === 'string' ? matchingHeader[1] : '';
}

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
      const response = await fetch(input, init);

      try {
        const payload = await response.clone().json() as { errors?: Array<{ message?: string }> };
        const requestApiKey = readHeaderValue(init?.headers, ORGANIZATION_API_KEY_HEADER);
        const hasOrganizationAccessError = payload.errors?.some(({ message }) => isOrganizationAccessErrorMessage(message));

        if (hasOrganizationAccessError && requestApiKey && requestApiKey === organizationAccess.apiKey) {
          resetOrganizationAccess();
        }
      } catch {
        // Ignore non-JSON responses and let urql handle the original response.
      }

      return response;
    },
    fetchOptions: () => ({
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
