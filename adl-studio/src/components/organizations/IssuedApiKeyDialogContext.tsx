'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  findIssuedApiKey,
  type IssuedApiKeyDialogState,
  type OrganizationRecord,
  type RegisterIssuedApiKeyOptions,
  type TransientOrganizations,
  type VisibleIssuedApiKeys,
} from '@/components/organizations/types';

type IssuedApiKeyDialogContextValue = {
  dialog: IssuedApiKeyDialogState | null;
  open: boolean;
  transientOrganizations: TransientOrganizations;
  visibleIssuedApiKeys: VisibleIssuedApiKeys;
  openIssuedApiKeyDialog: (title: string, description: string, rawApiKey: string) => void;
  dismissIssuedApiKeyDialog: () => void;
  copyIssuedApiKeyToClipboard: () => Promise<boolean>;
  registerIssuedApiKey: (
    organization: OrganizationRecord | null | undefined,
    previousOrganization: OrganizationRecord | null | undefined,
    rawApiKey: string,
    options?: RegisterIssuedApiKeyOptions,
  ) => void;
  upsertTransientOrganization: (organization: OrganizationRecord | null | undefined) => void;
  clearTransientOrganization: (organizationId: string) => void;
};

const IssuedApiKeyDialogContext = createContext<IssuedApiKeyDialogContextValue | null>(null);

type IssuedApiKeyDialogProviderProps = {
  children: ReactNode;
};

export function IssuedApiKeyDialogProvider({ children }: IssuedApiKeyDialogProviderProps) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<IssuedApiKeyDialogState | null>(null);
  const [open, setOpen] = useState(false);
  const [transientOrganizations, setTransientOrganizations] = useState<TransientOrganizations>({});
  const [visibleIssuedApiKeys, setVisibleIssuedApiKeys] = useState<VisibleIssuedApiKeys>({});

  const openIssuedApiKeyDialog = useCallback((title: string, description: string, rawApiKey: string) => {
    if (!rawApiKey) {
      return;
    }

    setDialog({
      title,
      description,
      rawApiKey,
    });
    setOpen(true);
  }, []);

  const dismissIssuedApiKeyDialog = useCallback(() => {
    setOpen(false);
    setDialog(null);
  }, []);

  const upsertTransientOrganization = useCallback((organization: OrganizationRecord | null | undefined) => {
    if (!organization?.id) {
      return;
    }

    setTransientOrganizations((currentOrganizations) => ({
      ...currentOrganizations,
      [organization.id]: organization,
    }));
  }, []);

  const clearTransientOrganization = useCallback((organizationId: string) => {
    setTransientOrganizations((currentOrganizations) => {
      if (!currentOrganizations[organizationId]) {
        return currentOrganizations;
      }

      const nextOrganizations = { ...currentOrganizations };
      delete nextOrganizations[organizationId];
      return nextOrganizations;
    });

    setVisibleIssuedApiKeys((currentIssuedApiKeys) => {
      if (!currentIssuedApiKeys[organizationId]) {
        return currentIssuedApiKeys;
      }

      const nextIssuedApiKeys = { ...currentIssuedApiKeys };
      delete nextIssuedApiKeys[organizationId];
      return nextIssuedApiKeys;
    });
  }, []);

  const registerIssuedApiKey = useCallback((
    organization: OrganizationRecord | null | undefined,
    previousOrganization: OrganizationRecord | null | undefined,
    rawApiKey: string,
    options?: RegisterIssuedApiKeyOptions,
  ) => {
    if (!organization?.id || !rawApiKey) {
      return;
    }

    const issuedApiKey = findIssuedApiKey(organization, previousOrganization);

    upsertTransientOrganization(organization);

    if (!issuedApiKey) {
      return;
    }

    setVisibleIssuedApiKeys((currentIssuedApiKeys) => ({
      ...currentIssuedApiKeys,
      [organization.id]: {
        ...(currentIssuedApiKeys[organization.id] || {}),
        [issuedApiKey.id]: {
          rawApiKey,
          showInitialAccessWarning: options?.showInitialAccessWarning ?? false,
        },
      },
    }));
  }, [upsertTransientOrganization]);

  const copyIssuedApiKeyToClipboard = useCallback(async () => {
    if (!dialog?.rawApiKey) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(dialog.rawApiKey);
      toast({
        title: 'API key copied',
        description: 'The raw API key has been copied to your clipboard.',
      });
      dismissIssuedApiKeyDialog();
      return true;
    } catch {
      toast({
        title: 'Copy failed',
        description: 'The browser could not copy the API key automatically. Copy it manually before closing the dialog.',
        variant: 'destructive',
      });
      return false;
    }
  }, [dialog?.rawApiKey, dismissIssuedApiKeyDialog, toast]);

  const value = useMemo<IssuedApiKeyDialogContextValue>(() => ({
    dialog,
    open,
    transientOrganizations,
    visibleIssuedApiKeys,
    openIssuedApiKeyDialog,
    dismissIssuedApiKeyDialog,
    copyIssuedApiKeyToClipboard,
    registerIssuedApiKey,
    upsertTransientOrganization,
    clearTransientOrganization,
  }), [
    clearTransientOrganization,
    copyIssuedApiKeyToClipboard,
    dialog,
    dismissIssuedApiKeyDialog,
    open,
    openIssuedApiKeyDialog,
    registerIssuedApiKey,
    transientOrganizations,
    upsertTransientOrganization,
    visibleIssuedApiKeys,
  ]);

  return (
    <IssuedApiKeyDialogContext.Provider value={value}>
      {children}
    </IssuedApiKeyDialogContext.Provider>
  );
}

export function useIssuedApiKeyDialog() {
  const context = useContext(IssuedApiKeyDialogContext);

  if (!context) {
    throw new Error('useIssuedApiKeyDialog must be used within an IssuedApiKeyDialogProvider.');
  }

  return context;
}

