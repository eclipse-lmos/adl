'use client';

import { memo, useEffect, useMemo } from 'react';
import { useQuery } from 'urql';
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_ORGANIZATION_ID,
  getKnownOrganizations,
  isOrganizationAccessErrorMessage,
  type OrganizationAccessState,
} from '@/lib/organization-access';
import { OrganizationsQuery } from '@/lib/graphql/queries';
import type { OrganizationRecord } from '@/components/organizations/types';

const PUBLIC_ORGANIZATION: OrganizationRecord = {
  id: DEFAULT_ORGANIZATION_ID,
  name: 'Public',
  descriptions: 'Default public owner used for backwards-compatible development mode.',
  apiKeys: [],
};

type OrganizationAccessPanelProps = {
  effectiveAccess: OrganizationAccessState;
  authorizationHeaders: Record<string, string>;
  draftOrganizationApiKey: string;
  onDraftOrganizationApiKeyChange: (value: string) => void;
  isResolvingOrganizationAccess: boolean;
  onResolveOrganizationAccess: () => void;
  onActivatePublicOrganization: () => void;
  onActivateAuthorizedOrganization: () => void;
  refreshVersion: number;
};

function OrganizationAccessPanel({
  effectiveAccess,
  authorizationHeaders,
  draftOrganizationApiKey,
  onDraftOrganizationApiKeyChange,
  isResolvingOrganizationAccess,
  onResolveOrganizationAccess,
  onActivatePublicOrganization,
  onActivateAuthorizedOrganization,
  refreshVersion,
}: OrganizationAccessPanelProps) {
  const authorizationContext = useMemo(() => ({
    fetchOptions: {
      headers: authorizationHeaders,
    },
  }), [authorizationHeaders]);

  const [organizationsResult, reexecuteOrganizations] = useQuery({
    query: OrganizationsQuery,
    context: authorizationContext,
  });

  useEffect(() => {
    if (refreshVersion > 0) {
      reexecuteOrganizations({ requestPolicy: 'network-only' });
    }
  }, [refreshVersion, reexecuteOrganizations]);

  const organizations: OrganizationRecord[] = organizationsResult.data?.organizations || [];
  const shouldSuppressOrganizationAccessError = isOrganizationAccessErrorMessage(organizationsResult.error?.message);
  const accessibleOrganizations = useMemo(() => {
    const organizationsById = new Map<string, OrganizationRecord>([[DEFAULT_ORGANIZATION_ID, PUBLIC_ORGANIZATION]]);

    getKnownOrganizations(effectiveAccess).forEach((organization) => {
      organizationsById.set(organization.id, {
        id: organization.id,
        name: organization.name,
        descriptions: organization.id === DEFAULT_ORGANIZATION_ID ? PUBLIC_ORGANIZATION.descriptions : '',
        apiKeys: [],
      });
    });

    organizations.forEach((organization) => {
      organizationsById.set(organization.id, organization);
    });

    const visibleOrganizationIds = new Set<string>([DEFAULT_ORGANIZATION_ID]);
    if (effectiveAccess.authorizedOrganizationId) {
      visibleOrganizationIds.add(effectiveAccess.authorizedOrganizationId);
    }

    return Array.from(visibleOrganizationIds)
      .map((organizationId) => organizationsById.get(organizationId))
      .filter((organization): organization is OrganizationRecord => Boolean(organization));
  }, [effectiveAccess, organizations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Organization Access</CardTitle>
        <CardDescription>
          Activate `public` directly or enter a valid organization API key to resolve and activate the matching organization automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {organizationsResult.error && !shouldSuppressOrganizationAccessError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authorization error</AlertTitle>
            <AlertDescription>{organizationsResult.error.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <div>
            <p className="text-sm font-medium">Available organizations</p>
            <p className="text-xs text-muted-foreground">
              These are the organizations you can switch to from the header on every page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {accessibleOrganizations.map((organization) => (
              <Button
                key={organization.id}
                type="button"
                variant={organization.id === effectiveAccess.activeOrganizationId ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (organization.id === DEFAULT_ORGANIZATION_ID) {
                    onActivatePublicOrganization();
                  } else {
                    onActivateAuthorizedOrganization();
                  }
                }}
              >
                {organization.name}
                <span className="ml-2 font-mono text-[11px] opacity-80">{organization.id}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="organization-api-key">Organization API Key</Label>
            <Input
              id="organization-api-key"
              type="password"
              placeholder="Enter a valid organization API key"
              value={draftOrganizationApiKey}
              onChange={(event) => onDraftOrganizationApiKeyChange(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The organization is derived automatically from the API key; you do not need to type an organization id manually.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={onActivatePublicOrganization}>
            Use Public
          </Button>

          <Button
            type="button"
            onClick={onResolveOrganizationAccess}
            disabled={!draftOrganizationApiKey.trim() || isResolvingOrganizationAccess}
          >
            {isResolvingOrganizationAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Resolve &amp; Activate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(OrganizationAccessPanel);

