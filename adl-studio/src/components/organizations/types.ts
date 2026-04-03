export type OrganizationApiKeyRecord = {
  id: string;
  label: string;
  maskedKey: string;
  createdAt: string;
  revoked: boolean;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  descriptions: string;
  apiKeys: OrganizationApiKeyRecord[];
};

export type IssuedApiKeyDialogState = {
  title: string;
  description: string;
  rawApiKey: string;
};

export type VisibleIssuedApiKeyRecord = {
  rawApiKey: string;
  showInitialAccessWarning: boolean;
};

export type TransientOrganizations = Record<string, OrganizationRecord>;

export type VisibleIssuedApiKeys = Record<string, Record<string, VisibleIssuedApiKeyRecord>>;

export type RegisterIssuedApiKeyOptions = {
  showInitialAccessWarning?: boolean;
};

export function findIssuedApiKey(
  nextOrganization: OrganizationRecord,
  previousOrganization: OrganizationRecord | null | undefined,
): OrganizationApiKeyRecord | null {
  const previousApiKeyIds = new Set(previousOrganization?.apiKeys.map((apiKey) => apiKey.id) || []);

  return nextOrganization.apiKeys.find((apiKey) => !previousApiKeyIds.has(apiKey.id))
    || nextOrganization.apiKeys[nextOrganization.apiKeys.length - 1]
    || null;
}

