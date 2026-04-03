export const ORGANIZATION_ID_HEADER = 'X-Organization-Id';
export const ORGANIZATION_API_KEY_HEADER = 'X-Api-Key';

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
  apiKey: string;
};

type PersistedOrganizationAccessState = Partial<OrganizationAccessState> & {
  selectedOrganizationId?: string;
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
  apiKey: '',
});

const sanitizeState = (value: PersistedOrganizationAccessState | null | undefined): OrganizationAccessState => {
  const apiKey = value?.apiKey?.trim() || '';
  const legacySelectedOrganizationId = value?.selectedOrganizationId?.trim() || '';
  const authorizedOrganizationId = apiKey
    ? value?.authorizedOrganizationId?.trim() || (legacySelectedOrganizationId !== DEFAULT_ORGANIZATION_ID ? legacySelectedOrganizationId : '')
    : '';
  const authorizedOrganizationName = apiKey ? value?.authorizedOrganizationName?.trim() || '' : '';
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
    apiKey,
  };
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
    return sanitizeState(JSON.parse(storedValue));
  } catch {
    return defaultState();
  }
}

export function writeOrganizationAccess(value: PersistedOrganizationAccessState): OrganizationAccessState {
  const nextState = sanitizeState({
    ...readOrganizationAccess(),
    ...value,
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

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
  if (state.activeOrganizationId === DEFAULT_ORGANIZATION_ID) {
    return {
      [ORGANIZATION_ID_HEADER]: DEFAULT_ORGANIZATION_ID,
    };
  }

  const headers: Record<string, string> = {};

  if (state.activeOrganizationId) {
    headers[ORGANIZATION_ID_HEADER] = state.activeOrganizationId;
  }

  if (state.activeOrganizationId === state.authorizedOrganizationId && state.apiKey) {
    headers[ORGANIZATION_API_KEY_HEADER] = state.apiKey;
  }

  return headers;
}

export function buildOrganizationAuthorizationHeaders(state: OrganizationAccessState = readOrganizationAccess()): Record<string, string> {
  if (state.apiKey) {
    return {
      [ORGANIZATION_API_KEY_HEADER]: state.apiKey,
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

export function getEventsUrl(): string {
  return process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8080/events';
}

