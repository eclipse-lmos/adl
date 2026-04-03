'use client';

import { memo, useMemo, useState } from 'react';
import { useMutation } from 'urql';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIssuedApiKeyDialog } from '@/components/organizations/IssuedApiKeyDialogContext';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/organization-access';
import { CreateOrganizationMutation } from '@/lib/graphql/mutations';

type CreateOrganizationPanelProps = {
  publicAdminHeaders: Record<string, string>;
  onOrganizationCreated: (organizationId: string, organizationName: string, rawApiKey: string) => void;
  onOrganizationsChanged: () => void;
};

function CreateOrganizationPanel({
  publicAdminHeaders,
  onOrganizationCreated,
  onOrganizationsChanged,
}: CreateOrganizationPanelProps) {
  const { toast } = useToast();
  const { openIssuedApiKeyDialog, registerIssuedApiKey } = useIssuedApiKeyDialog();
  const [newOrganizationId, setNewOrganizationId] = useState('');
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [newOrganizationDescriptions, setNewOrganizationDescriptions] = useState('');

  const publicAdminContext = useMemo(() => ({
    fetchOptions: {
      headers: publicAdminHeaders,
    },
  }), [publicAdminHeaders]);

  const [createOrganizationResult, executeCreateOrganization] = useMutation(CreateOrganizationMutation);

  const handleCreateOrganization = () => {
    executeCreateOrganization({
      id: newOrganizationId,
      name: newOrganizationName,
      descriptions: newOrganizationDescriptions,
    }, publicAdminContext).then((result) => {
      if (result.error) {
        toast({
          title: 'Error creating organization',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      const payload = result.data?.createOrganization;
      if (!payload?.createdApiKey) {
        toast({
          title: 'Initial API key missing',
          description: 'The organization was created, but no raw API key was returned to display in the popup.',
          variant: 'destructive',
        });
      }

      registerIssuedApiKey(payload?.organization, null, payload?.createdApiKey || '', {
        showInitialAccessWarning: true,
      });

      openIssuedApiKeyDialog(
        'Initial API key created',
        'Copy this initial API key now. It is shown in full only once, remains visible in the API key list only until this page reloads, and losing it can lock you out of this organization.',
        payload?.createdApiKey || '',
      );

      if (payload?.organization?.id) {
        onOrganizationCreated(payload.organization.id, payload.organization.name, payload.createdApiKey || '');
        setNewOrganizationId('');
        setNewOrganizationName('');
        setNewOrganizationDescriptions('');
      }

      onOrganizationsChanged();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Organization</CardTitle>
        <CardDescription>
          Bootstrap a new organization in public administration mode. This panel never offers `public` as a creatable organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-organization-id">Organization ID</Label>
            <Input
              id="new-organization-id"
              value={newOrganizationId}
              onChange={(event) => setNewOrganizationId(event.target.value)}
              placeholder="telekom-demo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-organization-name">Display Name</Label>
            <Input
              id="new-organization-name"
              value={newOrganizationName}
              onChange={(event) => setNewOrganizationName(event.target.value)}
              placeholder="Telekom Demo Org"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-organization-descriptions">Description</Label>
          <Textarea
            id="new-organization-descriptions"
            value={newOrganizationDescriptions}
            onChange={(event) => setNewOrganizationDescriptions(event.target.value)}
            placeholder="Internal sandbox organization for support flows."
          />
          <p className="text-xs text-muted-foreground">
            The initial API key is created automatically with the fixed name <span className="font-mono">master</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 border-t pt-4">
          <Button
            type="button"
            onClick={handleCreateOrganization}
            disabled={
              !newOrganizationId.trim()
              || newOrganizationId.trim() === DEFAULT_ORGANIZATION_ID
              || !newOrganizationName.trim()
              || createOrganizationResult.fetching
            }
          >
            {createOrganizationResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Organization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(CreateOrganizationPanel);

