'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Loader2, Plus, RefreshCcw, ShieldAlert, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIssuedApiKeyDialog } from '@/components/organizations/IssuedApiKeyDialogContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_ORGANIZATION_ID, type OrganizationAccessState } from '@/lib/organization-access';
import {
  CreateOrganizationApiKeyMutation,
  DeleteOrganizationMutation,
  RevokeOrganizationApiKeyMutation,
  RotateOrganizationApiKeyMutation,
  UpdateOrganizationMutation,
} from '@/lib/graphql/mutations';
import { OrganizationsQuery } from '@/lib/graphql/queries';
import {
  type OrganizationApiKeyRecord,
  type OrganizationRecord,
} from '@/components/organizations/types';

type ManagedOrganizationPanelProps = {
  effectiveAccess: OrganizationAccessState;
  authorizationHeaders: Record<string, string>;
  publicAdminHeaders: Record<string, string>;
  managedOrganizationId: string;
  onManagedOrganizationIdChange: (organizationId: string) => void;
  onAuthorizedOrganizationNameChange: (organizationName: string) => void;
  onAuthorizedOrganizationApiKeyIssued: (organizationName: string, rawApiKey: string) => void;
  onAuthorizedOrganizationDeleted: () => void;
  refreshVersion: number;
  onOrganizationsChanged: () => void;
};

function ManagedOrganizationPanel({
  effectiveAccess,
  authorizationHeaders,
  publicAdminHeaders,
  managedOrganizationId,
  onManagedOrganizationIdChange,
  onAuthorizedOrganizationNameChange,
  onAuthorizedOrganizationApiKeyIssued,
  onAuthorizedOrganizationDeleted,
  refreshVersion,
  onOrganizationsChanged,
}: ManagedOrganizationPanelProps) {
  const { toast } = useToast();
  const {
    clearTransientOrganization,
    dismissIssuedApiKeyDialog,
    openIssuedApiKeyDialog,
    registerIssuedApiKey,
    transientOrganizations,
    upsertTransientOrganization,
    visibleIssuedApiKeys,
  } = useIssuedApiKeyDialog();
  const [managedOrganizationName, setManagedOrganizationName] = useState('');
  const [managedOrganizationDescriptions, setManagedOrganizationDescriptions] = useState('');
  const [newOrganizationApiKeyName, setNewOrganizationApiKeyName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const authorizationContext = useMemo(() => ({
    fetchOptions: {
      headers: authorizationHeaders,
    },
  }), [authorizationHeaders]);

  const publicAdminContext = useMemo(() => ({
    fetchOptions: {
      headers: publicAdminHeaders,
    },
  }), [publicAdminHeaders]);

  const [organizationsResult, reexecuteOrganizations] = useQuery({
    query: OrganizationsQuery,
    context: authorizationContext,
  });

  const [updateOrganizationResult, executeUpdateOrganization] = useMutation(UpdateOrganizationMutation);
  const [createOrganizationApiKeyResult, executeCreateOrganizationApiKey] = useMutation(CreateOrganizationApiKeyMutation);
  const [rotateOrganizationApiKeyResult, executeRotateOrganizationApiKey] = useMutation(RotateOrganizationApiKeyMutation);
  const [revokeOrganizationApiKeyResult, executeRevokeOrganizationApiKey] = useMutation(RevokeOrganizationApiKeyMutation);
  const [deleteOrganizationResult, executeDeleteOrganization] = useMutation(DeleteOrganizationMutation);

  useEffect(() => {
    if (refreshVersion > 0) {
      reexecuteOrganizations({ requestPolicy: 'network-only' });
    }
  }, [refreshVersion, reexecuteOrganizations]);

  const organizations: OrganizationRecord[] = organizationsResult.data?.organizations || [];
  const organizationsById = useMemo(() => {
    const result = new Map<string, OrganizationRecord>();

    organizations
      .filter((organization) => organization.id !== DEFAULT_ORGANIZATION_ID)
      .forEach((organization) => {
        result.set(organization.id, organization);
      });

    Object.values(transientOrganizations).forEach((organization) => {
      result.set(organization.id, organization);
    });

    return result;
  }, [organizations, transientOrganizations]);

  const manageableOrganizations = useMemo(() => Array.from(organizationsById.values()), [organizationsById]);
  const managedOrganization = manageableOrganizations.find((organization) => organization.id === managedOrganizationId) || null;
  const activeApiKeyCount = managedOrganization?.apiKeys.filter((apiKey) => !apiKey.revoked).length ?? 0;
  const visibleIssuedApiKeysForManagedOrganization = managedOrganization
    ? visibleIssuedApiKeys[managedOrganization.id] || {}
    : {};
  const hasVisibleIssuedApiKeys = Object.keys(visibleIssuedApiKeysForManagedOrganization).length > 0;
  const hasVisibleInitialIssuedApiKey = Object.values(visibleIssuedApiKeysForManagedOrganization)
    .some((apiKey) => apiKey.showInitialAccessWarning);

  useEffect(() => {
    if (!manageableOrganizations.length) {
      if (managedOrganizationId) {
        onManagedOrganizationIdChange('');
      }
      return;
    }

    if (!manageableOrganizations.some((organization) => organization.id === managedOrganizationId)) {
      onManagedOrganizationIdChange(manageableOrganizations[0].id);
    }
  }, [manageableOrganizations, managedOrganizationId, onManagedOrganizationIdChange]);

  useEffect(() => {
    if (!managedOrganization) {
      setManagedOrganizationName('');
      setManagedOrganizationDescriptions('');
      return;
    }

    setManagedOrganizationName(managedOrganization.name);
    setManagedOrganizationDescriptions(managedOrganization.descriptions);
  }, [managedOrganization]);

  const handleUpdateOrganization = () => {
    executeUpdateOrganization({
      id: managedOrganizationId,
      name: managedOrganizationName,
      descriptions: managedOrganizationDescriptions,
    }, publicAdminContext).then((result) => {
      if (result.error) {
        toast({
          title: 'Error updating organization',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      const updatedOrganization = result.data?.updateOrganization;
      upsertTransientOrganization(updatedOrganization);
      if (updatedOrganization?.id === effectiveAccess.authorizedOrganizationId) {
        onAuthorizedOrganizationNameChange(updatedOrganization.name);
      }
      reexecuteOrganizations({ requestPolicy: 'network-only' });
      toast({
        title: 'Organization updated',
        description: 'Metadata has been saved.',
      });
    });
  };

  const handleCreateOrganizationApiKey = () => {
    const trimmedApiKeyName = newOrganizationApiKeyName.trim();
    if (!trimmedApiKeyName) {
      toast({
        title: 'API key name required',
        description: 'Enter a name before issuing a new API key.',
        variant: 'destructive',
      });
      return;
    }

    executeCreateOrganizationApiKey({
      organizationId: managedOrganizationId,
      label: trimmedApiKeyName,
    }, publicAdminContext).then((result) => {
      if (result.error) {
        toast({
          title: 'Error creating API key',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      const payload = result.data?.createOrganizationApiKey;
      const previousOrganization = organizationsById.get(managedOrganizationId) || null;
      if (!payload?.createdApiKey) {
        toast({
          title: 'API key missing',
          description: 'The API key was created, but no raw API key was returned to display in the popup.',
          variant: 'destructive',
        });
      }
      registerIssuedApiKey(payload?.organization, previousOrganization, payload?.createdApiKey || '');
      openIssuedApiKeyDialog(
        'Additional API key created',
        'Copy this API key now. It is shown in full only once, remains visible in the API key list only until this page reloads.',
        payload?.createdApiKey || '',
      );
      if (managedOrganizationId === effectiveAccess.authorizedOrganizationId && payload?.createdApiKey) {
        onAuthorizedOrganizationApiKeyIssued(payload.organization?.name || effectiveAccess.authorizedOrganizationName, payload.createdApiKey);
      }
      setNewOrganizationApiKeyName('');
      reexecuteOrganizations({ requestPolicy: 'network-only' });
    });
  };

  const handleRotateOrganizationApiKey = (apiKeyRecord: OrganizationApiKeyRecord) => {
    executeRotateOrganizationApiKey({
      organizationId: managedOrganizationId,
      apiKeyId: apiKeyRecord.id,
      label: apiKeyRecord.label,
    }, publicAdminContext).then((result) => {
      if (result.error) {
        toast({
          title: 'Error rotating API key',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      const payload = result.data?.rotateOrganizationApiKey;
      const previousOrganization = organizationsById.get(managedOrganizationId) || null;
      if (!payload?.createdApiKey) {
        toast({
          title: 'Replacement API key missing',
          description: 'The API key was rotated, but no raw replacement key was returned to display in the popup.',
          variant: 'destructive',
        });
      }
      registerIssuedApiKey(payload?.organization, previousOrganization, payload?.createdApiKey || '');
      openIssuedApiKeyDialog(
        'Replacement API key created',
        'Copy this replacement API key now. It is shown in full only once and remains visible in the API key list only until this page reloads.',
        payload?.createdApiKey || '',
      );
      if (managedOrganizationId === effectiveAccess.authorizedOrganizationId && payload?.createdApiKey) {
        onAuthorizedOrganizationApiKeyIssued(payload.organization?.name || effectiveAccess.authorizedOrganizationName, payload.createdApiKey);
      }
      reexecuteOrganizations({ requestPolicy: 'network-only' });
    });
  };

  const handleRevokeOrganizationApiKey = (apiKeyId: string) => {
    executeRevokeOrganizationApiKey({
      organizationId: managedOrganizationId,
      apiKeyId,
    }, publicAdminContext).then((result) => {
      if (result.error) {
        toast({
          title: 'Error revoking API key',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      upsertTransientOrganization(result.data?.revokeOrganizationApiKey);
      reexecuteOrganizations({ requestPolicy: 'network-only' });
      toast({
        title: 'API key revoked',
        description: 'The API key can no longer authorize requests.',
      });
    });
  };

  const handleDeleteOrganization = () => {
    executeDeleteOrganization({ id: managedOrganizationId }, publicAdminContext).then((result) => {
      if (result.error) {
        toast({
          title: 'Error deleting organization',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      const deleted = result.data?.deleteOrganization;
      if (!deleted) {
        toast({
          title: 'Organization was not deleted',
          description: 'No organization was removed.',
          variant: 'destructive',
        });
        return;
      }

      if (managedOrganizationId === effectiveAccess.authorizedOrganizationId) {
        onAuthorizedOrganizationDeleted();
      }
      clearTransientOrganization(managedOrganizationId);
      onManagedOrganizationIdChange('');
      dismissIssuedApiKeyDialog();
      setIsDeleteDialogOpen(false);
      reexecuteOrganizations({ requestPolicy: 'network-only' });
      onOrganizationsChanged();
      toast({
        title: 'Organization deleted',
        description: 'The organization and its owner-scoped data have been removed.',
      });
    });
  };

  return (
    <>
      {managedOrganization && activeApiKeyCount <= 1 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Last active API key protection</AlertTitle>
          <AlertDescription>
            `{managedOrganization.id}` currently has only one active API key left. Use rotation to replace it safely before revoking older keys.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Manage Authorized Organization</CardTitle>
          <CardDescription>
            Update metadata, issue additional keys, rotate the last active key safely, or delete the organization completely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {manageableOrganizations.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organization-editor-select">Organization</Label>
                  <div className="flex flex-wrap gap-2">
                    {manageableOrganizations.map((organization) => (
                      <Button
                        key={organization.id}
                        type="button"
                        variant={organization.id === managedOrganizationId ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onManagedOrganizationIdChange(organization.id)}
                      >
                        {organization.name}
                        <span className="ml-2 font-mono text-[11px] opacity-80">{organization.id}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="managed-organization-name">Display Name</Label>
                  <Input
                    id="managed-organization-name"
                    value={managedOrganizationName}
                    onChange={(event) => setManagedOrganizationName(event.target.value)}
                    placeholder="Telekom Demo Org"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="managed-organization-descriptions">Description</Label>
                  <Textarea
                    id="managed-organization-descriptions"
                    value={managedOrganizationDescriptions}
                    onChange={(event) => setManagedOrganizationDescriptions(event.target.value)}
                    placeholder="Internal sandbox organization for support flows."
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={handleUpdateOrganization}
                  disabled={!managedOrganizationId || !managedOrganizationName.trim() || updateOrganizationResult.fetching}
                >
                  {updateOrganizationResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Update Metadata
                </Button>
              </div>

              <div className="grid gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="organization-key-label">New API key name</Label>
                  <Input
                    id="organization-key-label"
                    value={newOrganizationApiKeyName}
                    onChange={(event) => setNewOrganizationApiKeyName(event.target.value)}
                    placeholder="e.g. studio, ci, backend"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a descriptive name before issuing an additional API key.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-fit"
                  onClick={handleCreateOrganizationApiKey}
                  disabled={!managedOrganizationId || !newOrganizationApiKeyName.trim() || createOrganizationApiKeyResult.fetching}
                >
                  {createOrganizationApiKeyResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Issue Additional Key
                </Button>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="text-sm font-medium">Masked API keys</h3>
                  <p className="text-sm text-muted-foreground">
                    Every organization must retain at least one active API key. The final active key can be rotated, but not revoked.
                  </p>
                </div>

                {hasVisibleIssuedApiKeys && (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>New raw API key visible once</AlertTitle>
                    <AlertDescription>
                      Newly issued API keys are shown in full below only in this browser view. Copy them now; after a page refresh or reload, only the masked values remain.
                    </AlertDescription>
                  </Alert>
                )}

                {hasVisibleInitialIssuedApiKey && (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Save the first organization key immediately</AlertTitle>
                    <AlertDescription>
                      This is the first API key for the organization. If you lose it before storing it safely, you can lose access to this organization until the page refreshes or reloads and you authenticate again with a saved key.
                    </AlertDescription>
                  </Alert>
                )}

                {managedOrganization?.apiKeys?.length ? (
                  <div className="space-y-2">
                    {managedOrganization.apiKeys.map((apiKeyRecord) => {
                      const isOnlyActiveKey = !apiKeyRecord.revoked && activeApiKeyCount <= 1;
                      return (
                        <div key={apiKeyRecord.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">{apiKeyRecord.label}</p>
                              <p className="font-mono text-xs text-muted-foreground">{apiKeyRecord.maskedKey}</p>
                              <p className="text-xs text-muted-foreground">Created: {new Date(apiKeyRecord.createdAt).toLocaleString()}</p>
                              {apiKeyRecord.revoked && (
                                <p className="text-xs text-muted-foreground">This key has already been revoked.</p>
                              )}
                              {isOnlyActiveKey && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  This is the final active API key. Rotate it to keep at least one valid key for the organization.
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={apiKeyRecord.revoked || rotateOrganizationApiKeyResult.fetching}
                                onClick={() => handleRotateOrganizationApiKey(apiKeyRecord)}
                              >
                                {rotateOrganizationApiKeyResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                Rotate
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={apiKeyRecord.revoked || isOnlyActiveKey || revokeOrganizationApiKeyResult.fetching}
                                onClick={() => handleRevokeOrganizationApiKey(apiKeyRecord.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Revoke API key</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No organization API keys available for the selected organization.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No authorized non-public organization is available yet. Enter a valid API key above or create a new organization below.
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!managedOrganizationId || deleteOrganizationResult.fetching}
                >
                  {deleteOrganizationResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete Organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete organization permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes `{managedOrganizationId}` and purges its owner-scoped ADLs, widgets, tests, agents, prompts, settings, tags, statistics, and embeddings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOrganization}>Delete permanently</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default memo(ManagedOrganizationPanel);

