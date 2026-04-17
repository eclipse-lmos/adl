export const ORGANIZATION_ID_HEADER = 'X-Organization-Id';

const STORAGE_KEY = 'adl.organization-access';
export const DEFAULT_ORGANIZATION_ID = 'public';
const ORGANIZATION_ACCESS_ERROR_MESSAGES = [
  'Invalid or revoked organization API key.',
  'Organization API key does not match the requested organization.',
  'Missing organization API key.',
] as const;

export type OrganizationAccessState = {
  activeOrganizationId: string;
  authorizedOrganizationId: string;
  authorizedOrganizationName: string;
};

type PersistedOrganizationAccessState = Partial<OrganizationAccessState> & {
  apiKey?: string;
  selectedOrganizationId?: string;
};

type OrganizationSessionExchangeResponse = {
  organizationId: string;
  organizationName: string;
};

type OrganizationSessionErrorResponse = {
  message?: string;
};

export type KnownOrganizationOption = {
  id: string;
  name: string;
};

type Listener = (state: OrganizationAccessState) => void;

const listeners = new Set<Listener>();

const defaultState = (): OrganizationAccessState => ({
  activeOrganizationId: DEFAULT_ORGANIZATION_ID,
  authorizedOrganizationId: '',
  authorizedOrganizationName: '',
});

const sanitizeState = (value: PersistedOrganizationAccessState | null | undefined): OrganizationAccessState => {
  const legacySelectedOrganizationId = value?.selectedOrganizationId?.trim() || '';
  const authorizedOrganizationId = value?.authorizedOrganizationId?.trim() || (legacySelectedOrganizationId !== DEFAULT_ORGANIZATION_ID ? legacySelectedOrganizationId : '');
  const authorizedOrganizationName = authorizedOrganizationId ? value?.authorizedOrganizationName?.trim() || '' : '';
  const preferredActiveOrganizationId = value?.activeOrganizationId?.trim() || legacySelectedOrganizationId || DEFAULT_ORGANIZATION_ID;
  const activeOrganizationId = preferredActiveOrganizationId === DEFAULT_ORGANIZATION_ID
    ? DEFAULT_ORGANIZATION_ID
    : preferredActiveOrganizationId === authorizedOrganizationId
      ? preferredActiveOrganizationId
      : authorizedOrganizationId || DEFAULT_ORGANIZATION_ID;

  return {
    activeOrganizationId,
    authorizedOrganizationId,
    authorizedOrganizationName,
  };
};

const persistState = (state: OrganizationAccessState) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};

export function readOrganizationAccess(): OrganizationAccessState {
  if (typeof window === 'undefined') {
    return defaultState();
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return defaultState();
  }

  try {
    const parsedValue = JSON.parse(storedValue) as PersistedOrganizationAccessState;
    const sanitizedState = sanitizeState(parsedValue);
    if (Object.prototype.hasOwnProperty.call(parsedValue, 'apiKey') || storedValue !== JSON.stringify(sanitizedState)) {
      persistState(sanitizedState);
    }
    return sanitizedState;
  } catch {
    return defaultState();
  }
}

export function writeOrganizationAccess(value: PersistedOrganizationAccessState): OrganizationAccessState {
  const nextState = sanitizeState({
    ...readOrganizationAccess(),
    ...value,
  });

  persistState(nextState);

  listeners.forEach(listener => listener(nextState));
  return nextState;
}

export function resetOrganizationAccess(): OrganizationAccessState {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const nextState = defaultState();
  listeners.forEach(listener => listener(nextState));
  return nextState;
}

export function subscribeToOrganizationAccess(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function buildOrganizationHeaders(state: OrganizationAccessState = readOrganizationAccess()): Record<string, string> {
  return {
    [ORGANIZATION_ID_HEADER]: state.activeOrganizationId || DEFAULT_ORGANIZATION_ID,
  };
}

export function buildOrganizationAuthorizationHeaders(state: OrganizationAccessState = readOrganizationAccess()): Record<string, string> {
  if (state.authorizedOrganizationId) {
    return {
      [ORGANIZATION_ID_HEADER]: state.authorizedOrganizationId,
    };
  }

  return {
    [ORGANIZATION_ID_HEADER]: DEFAULT_ORGANIZATION_ID,
  };
}

export function getKnownOrganizations(state: OrganizationAccessState = readOrganizationAccess()): KnownOrganizationOption[] {
  const organizations: KnownOrganizationOption[] = [
    {
      id: DEFAULT_ORGANIZATION_ID,
      name: 'Public',
    },
  ];

  if (state.authorizedOrganizationId) {
    organizations.push({
      id: state.authorizedOrganizationId,
      name: state.authorizedOrganizationName || state.authorizedOrganizationId,
    });
  }

  return organizations;
}

export function isOrganizationAccessErrorMessage(message: string | undefined | null): boolean {
  if (!message) {
    return false;
  }

  return ORGANIZATION_ACCESS_ERROR_MESSAGES.some(errorMessage => message.includes(errorMessage));
}

export function getGraphqlUrl(): string {
  return process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql';
}

export function getServerBaseUrl(): string {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  return new URL(getGraphqlUrl(), fallbackOrigin).origin;
}

export function getEventsUrl(): string {
  return process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8080/events';
}

export function getOrganizationSessionUrl(): string {
  return new URL('/api/organization-access/session', `${getServerBaseUrl()}/`).toString();
}

async function parseSessionError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as OrganizationSessionErrorResponse;
    return payload.message || `Organization session request failed with ${response.status}.`;
  } catch {
    return `Organization session request failed with ${response.status}.`;
  }
}

export async function exchangeOrganizationApiKeyForSession(apiKey: string): Promise<OrganizationSessionExchangeResponse> {
  const response = await fetch(getOrganizationSessionUrl(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey: apiKey.trim() }),
  });

  if (!response.ok) {
    throw new Error(await parseSessionError(response));
  }

  return response.json() as Promise<OrganizationSessionExchangeResponse>;
}

export async function clearOrganizationAccessSession(): Promise<void> {
  await fetch(getOrganizationSessionUrl(), {
    method: 'DELETE',
    credentials: 'include',
  });
}

