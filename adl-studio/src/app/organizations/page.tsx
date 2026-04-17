'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/header';
import CreateOrganizationPanel from '@/components/organizations/CreateOrganizationPanel';
import { IssuedApiKeyDialogProvider } from '@/components/organizations/IssuedApiKeyDialogContext';
import IssuedApiKeyDialogHost from '@/components/organizations/IssuedApiKeyDialogHost';
import ManagedOrganizationPanel from '@/components/organizations/ManagedOrganizationPanel';
import OrganizationAccessPanel from '@/components/organizations/OrganizationAccessPanel';
import { useToast } from '@/hooks/use-toast';
import {
  buildOrganizationAuthorizationHeaders,
  buildOrganizationHeaders,
  clearOrganizationAccessSession,
  DEFAULT_ORGANIZATION_ID,
  exchangeOrganizationApiKeyForSession,
  readOrganizationAccess,
  subscribeToOrganizationAccess,
  writeOrganizationAccess,
} from '@/lib/organization-access';

export default function OrganizationsPage() {
  const initialAccess = readOrganizationAccess();
  const { toast } = useToast();
  const [effectiveAccess, setEffectiveAccess] = useState(initialAccess);
  const [draftOrganizationApiKey, setDraftOrganizationApiKey] = useState('');
  const [isResolvingOrganizationAccess, setIsResolvingOrganizationAccess] = useState(false);
  const [managedOrganizationId, setManagedOrganizationId] = useState(initialAccess.authorizedOrganizationId);
  const [organizationsRefreshVersion, setOrganizationsRefreshVersion] = useState(0);

  useEffect(() => {
    setEffectiveAccess(readOrganizationAccess());
    return subscribeToOrganizationAccess((nextStoredAccess) => {
      setEffectiveAccess(nextStoredAccess);
    });
  }, []);

  const authorizationHeaders = useMemo(() => buildOrganizationAuthorizationHeaders(effectiveAccess), [effectiveAccess]);

  const publicAdminHeaders = useMemo(() => buildOrganizationHeaders({
    activeOrganizationId: DEFAULT_ORGANIZATION_ID,
    authorizedOrganizationId: '',
    authorizedOrganizationName: '',
  }), []);

  const persistOrganizationAccess = useCallback((value: Parameters<typeof writeOrganizationAccess>[0]) => {
    const nextState = writeOrganizationAccess(value);
    setEffectiveAccess(nextState);
    return nextState;
  }, []);

  const requestOrganizationsRefresh = useCallback(() => {
    setOrganizationsRefreshVersion((currentVersion) => currentVersion + 1);
  }, []);

  const activateAuthorizedOrganizationSession = useCallback(async (
    rawApiKey: string,
    options?: {
      activeOrganizationId?: string;
      fallbackOrganizationId?: string;
      fallbackOrganizationName?: string;
    },
  ) => {
    const resolvedOrganization = await exchangeOrganizationApiKeyForSession(rawApiKey);
    const resolvedOrganizationId = resolvedOrganization.organizationId || options?.fallbackOrganizationId || '';
    const resolvedOrganizationName = resolvedOrganization.organizationName || options?.fallbackOrganizationName || resolvedOrganizationId;
    const activeOrganizationId = options?.activeOrganizationId || resolvedOrganizationId || DEFAULT_ORGANIZATION_ID;

    persistOrganizationAccess({
      activeOrganizationId,
      authorizedOrganizationId: resolvedOrganizationId,
      authorizedOrganizationName: resolvedOrganizationName,
    });
    setManagedOrganizationId(resolvedOrganizationId);
    requestOrganizationsRefresh();

    return {
      organizationId: resolvedOrganizationId,
      organizationName: resolvedOrganizationName,
    };
  }, [persistOrganizationAccess, requestOrganizationsRefresh]);

  const resetToPublicAccess = useCallback(() => {
    void clearOrganizationAccessSession();
    persistOrganizationAccess({
      activeOrganizationId: DEFAULT_ORGANIZATION_ID,
      authorizedOrganizationId: '',
      authorizedOrganizationName: '',
    });
    setDraftOrganizationApiKey('');
  }, [persistOrganizationAccess]);

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
    try {
      const resolvedOrganization = await activateAuthorizedOrganizationSession(trimmedApiKey);
      setDraftOrganizationApiKey('');
      toast({
        title: 'Organization activated',
        description: `${resolvedOrganization.organizationName} (${resolvedOrganization.organizationId}) is now active.`,
      });
    } catch (error) {
      toast({
        title: 'Organization activation failed',
        description: error instanceof Error ? error.message : 'The organization API key could not be exchanged for a session.',
        variant: 'destructive',
      });
    } finally {
      setIsResolvingOrganizationAccess(false);
    }
  }, [activateAuthorizedOrganizationSession, draftOrganizationApiKey, toast]);

  const handleOrganizationCreated = useCallback((organizationId: string, organizationName: string, rawApiKey: string) => {
    void activateAuthorizedOrganizationSession(rawApiKey, {
      activeOrganizationId: organizationId,
      fallbackOrganizationId: organizationId,
      fallbackOrganizationName: organizationName,
    }).catch((error) => {
      toast({
        title: 'Organization session update failed',
        description: error instanceof Error ? error.message : 'The initial API key could not be exchanged for a session.',
        variant: 'destructive',
      });
    });
  }, [activateAuthorizedOrganizationSession, toast]);

  const handleAuthorizedOrganizationNameChange = useCallback((organizationName: string) => {
    persistOrganizationAccess({
      authorizedOrganizationName: organizationName,
    });
  }, [persistOrganizationAccess]);

  const handleAuthorizedOrganizationApiKeyIssued = useCallback((organizationName: string, rawApiKey: string) => {
    if (!rawApiKey) {
      return;
    }

    void activateAuthorizedOrganizationSession(rawApiKey, {
      activeOrganizationId: effectiveAccess.activeOrganizationId,
      fallbackOrganizationId: effectiveAccess.authorizedOrganizationId,
      fallbackOrganizationName: organizationName || effectiveAccess.authorizedOrganizationName,
    }).catch((error) => {
      toast({
        title: 'Organization session update failed',
        description: error instanceof Error ? error.message : 'The new API key could not be exchanged for a session.',
        variant: 'destructive',
      });
    });
  }, [activateAuthorizedOrganizationSession, effectiveAccess.activeOrganizationId, effectiveAccess.authorizedOrganizationId, effectiveAccess.authorizedOrganizationName, toast]);

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

