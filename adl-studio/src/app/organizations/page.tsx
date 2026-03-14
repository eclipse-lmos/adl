'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from 'urql';
import AppHeader from '@/components/header';
import CreateOrganizationPanel from '@/components/organizations/CreateOrganizationPanel';
import { IssuedApiKeyDialogProvider } from '@/components/organizations/IssuedApiKeyDialogContext';
import IssuedApiKeyDialogHost from '@/components/organizations/IssuedApiKeyDialogHost';
import ManagedOrganizationPanel from '@/components/organizations/ManagedOrganizationPanel';
import OrganizationAccessPanel from '@/components/organizations/OrganizationAccessPanel';
import type { OrganizationRecord } from '@/components/organizations/types';
import { useToast } from '@/hooks/use-toast';
import {
  buildOrganizationAuthorizationHeaders,
  buildOrganizationHeaders,
  DEFAULT_ORGANIZATION_ID,
  readOrganizationAccess,
  subscribeToOrganizationAccess,
  writeOrganizationAccess,
} from '@/lib/organization-access';
import { OrganizationsQuery } from '@/lib/graphql/queries';

export default function OrganizationsPage() {
  const initialAccess = readOrganizationAccess();
  const graphqlClient = useClient();
  const { toast } = useToast();
  const [effectiveAccess, setEffectiveAccess] = useState(initialAccess);
  const [draftOrganizationApiKey, setDraftOrganizationApiKey] = useState(initialAccess.apiKey);
  const [isResolvingOrganizationAccess, setIsResolvingOrganizationAccess] = useState(false);
  const [managedOrganizationId, setManagedOrganizationId] = useState(initialAccess.authorizedOrganizationId);
  const [organizationsRefreshVersion, setOrganizationsRefreshVersion] = useState(0);

  useEffect(() => {
    setEffectiveAccess(readOrganizationAccess());
    return subscribeToOrganizationAccess((nextStoredAccess) => {
      setEffectiveAccess(nextStoredAccess);
      setDraftOrganizationApiKey(nextStoredAccess.apiKey);
    });
  }, []);

  const authorizationHeaders = useMemo(() => buildOrganizationAuthorizationHeaders(effectiveAccess), [effectiveAccess]);

  const publicAdminHeaders = useMemo(() => buildOrganizationHeaders({
    activeOrganizationId: DEFAULT_ORGANIZATION_ID,
    authorizedOrganizationId: '',
    authorizedOrganizationName: '',
    apiKey: '',
  }), []);

  const persistOrganizationAccess = useCallback((value: Parameters<typeof writeOrganizationAccess>[0]) => {
    const nextState = writeOrganizationAccess(value);
    setEffectiveAccess(nextState);
    setDraftOrganizationApiKey(nextState.apiKey);
    return nextState;
  }, []);

  const resetToPublicAccess = useCallback(() => {
    persistOrganizationAccess({
      activeOrganizationId: DEFAULT_ORGANIZATION_ID,
      authorizedOrganizationId: '',
      authorizedOrganizationName: '',
      apiKey: '',
    });
    setDraftOrganizationApiKey('');
  }, [persistOrganizationAccess]);

  const requestOrganizationsRefresh = useCallback(() => {
    setOrganizationsRefreshVersion((currentVersion) => currentVersion + 1);
  }, []);

  const handleActivatePublicOrganization = useCallback(() => {
    persistOrganizationAccess({ activeOrganizationId: DEFAULT_ORGANIZATION_ID });
    toast({
      title: 'Public mode activated',
      description: 'Requests now target the public organization.',
    });
  }, [persistOrganizationAccess, toast]);

  const handleActivateAuthorizedOrganization = useCallback(() => {
    if (!effectiveAccess.authorizedOrganizationId) {
      return;
    }

    persistOrganizationAccess({ activeOrganizationId: effectiveAccess.authorizedOrganizationId });
    toast({
      title: 'Organization activated',
      description: `Requests now target ${effectiveAccess.authorizedOrganizationId}.`,
    });
  }, [effectiveAccess.authorizedOrganizationId, persistOrganizationAccess, toast]);

  const handleResolveOrganizationAccess = useCallback(async () => {
    const trimmedApiKey = draftOrganizationApiKey.trim();
    if (!trimmedApiKey) {
      toast({
        title: 'API key required',
        description: 'Enter a valid organization API key or switch to public mode.',
        variant: 'destructive',
      });
      return;
    }

    setIsResolvingOrganizationAccess(true);
    const result = await graphqlClient.query(
      OrganizationsQuery,
      {},
      {
        requestPolicy: 'network-only',
        fetchOptions: {
          headers: buildOrganizationAuthorizationHeaders({
            activeOrganizationId: DEFAULT_ORGANIZATION_ID,
            authorizedOrganizationId: '',
            authorizedOrganizationName: '',
            apiKey: trimmedApiKey,
          }),
        },
      },
    ).toPromise();
    setIsResolvingOrganizationAccess(false);

    if (result.error) {
      toast({
        title: 'Organization activation failed',
        description: result.error.message,
        variant: 'destructive',
      });
      return;
    }

    const resolvedOrganization = (result.data?.organizations || []).find(
      (organization: OrganizationRecord) => organization.id !== DEFAULT_ORGANIZATION_ID,
    );

    if (!resolvedOrganization) {
      toast({
        title: 'No organization resolved',
        description: 'The API key did not authorize any non-public organization.',
        variant: 'destructive',
      });
      return;
    }

    persistOrganizationAccess({
      activeOrganizationId: resolvedOrganization.id,
      authorizedOrganizationId: resolvedOrganization.id,
      authorizedOrganizationName: resolvedOrganization.name,
      apiKey: trimmedApiKey,
    });
    setManagedOrganizationId(resolvedOrganization.id);
    requestOrganizationsRefresh();
    toast({
      title: 'Organization activated',
      description: `${resolvedOrganization.name} (${resolvedOrganization.id}) is now active.`,
    });
  }, [draftOrganizationApiKey, graphqlClient, persistOrganizationAccess, requestOrganizationsRefresh, toast]);

  const handleOrganizationCreated = useCallback((organizationId: string, organizationName: string, rawApiKey: string) => {
    persistOrganizationAccess({
      activeOrganizationId: organizationId,
      authorizedOrganizationId: organizationId,
      authorizedOrganizationName: organizationName,
      apiKey: rawApiKey,
    });
    setManagedOrganizationId(organizationId);
  }, [persistOrganizationAccess]);

  const handleAuthorizedOrganizationNameChange = useCallback((organizationName: string) => {
    persistOrganizationAccess({
      authorizedOrganizationName: organizationName,
    });
  }, [persistOrganizationAccess]);

  const handleAuthorizedOrganizationApiKeyIssued = useCallback((organizationName: string, rawApiKey: string) => {
    if (!rawApiKey) {
      return;
    }

    persistOrganizationAccess({
      activeOrganizationId: effectiveAccess.activeOrganizationId,
      authorizedOrganizationName: organizationName || effectiveAccess.authorizedOrganizationName,
      apiKey: rawApiKey,
    });
    setDraftOrganizationApiKey(rawApiKey);
  }, [effectiveAccess.activeOrganizationId, effectiveAccess.authorizedOrganizationName, persistOrganizationAccess]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto flex-1 max-w-5xl px-4 py-8">
        <IssuedApiKeyDialogProvider>
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground">
              Activate organizations for this browser, rotate API keys safely, and manage the full lifecycle of non-public organizations.
            </p>
          </div>

          <div className="space-y-6">
            <OrganizationAccessPanel
              effectiveAccess={effectiveAccess}
              authorizationHeaders={authorizationHeaders}
              draftOrganizationApiKey={draftOrganizationApiKey}
              onDraftOrganizationApiKeyChange={setDraftOrganizationApiKey}
              isResolvingOrganizationAccess={isResolvingOrganizationAccess}
              onResolveOrganizationAccess={handleResolveOrganizationAccess}
              onActivatePublicOrganization={handleActivatePublicOrganization}
              onActivateAuthorizedOrganization={handleActivateAuthorizedOrganization}
              refreshVersion={organizationsRefreshVersion}
            />

            <ManagedOrganizationPanel
              effectiveAccess={effectiveAccess}
              authorizationHeaders={authorizationHeaders}
              publicAdminHeaders={publicAdminHeaders}
              managedOrganizationId={managedOrganizationId}
              onManagedOrganizationIdChange={setManagedOrganizationId}
              onAuthorizedOrganizationNameChange={handleAuthorizedOrganizationNameChange}
              onAuthorizedOrganizationApiKeyIssued={handleAuthorizedOrganizationApiKeyIssued}
              onAuthorizedOrganizationDeleted={resetToPublicAccess}
              refreshVersion={organizationsRefreshVersion}
              onOrganizationsChanged={requestOrganizationsRefresh}
            />

            <CreateOrganizationPanel
              publicAdminHeaders={publicAdminHeaders}
              onOrganizationCreated={handleOrganizationCreated}
              onOrganizationsChanged={requestOrganizationsRefresh}
            />
          </div>

          <IssuedApiKeyDialogHost />
        </IssuedApiKeyDialogProvider>
      </main>
    </div>
  );
}

