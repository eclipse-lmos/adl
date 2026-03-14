'use client';

import { Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIssuedApiKeyDialog } from '@/components/organizations/IssuedApiKeyDialogContext';

export default function IssuedApiKeyDialogHost() {
  const { dialog, open, copyIssuedApiKeyToClipboard } = useIssuedApiKeyDialog();

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        hideCloseButton
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{dialog?.title}</DialogTitle>
          <DialogDescription>{dialog?.description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4" />
            Raw API key (shown once)
          </div>
          <p className="break-all font-mono text-xs text-foreground">{dialog?.rawApiKey}</p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={copyIssuedApiKeyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copy key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

