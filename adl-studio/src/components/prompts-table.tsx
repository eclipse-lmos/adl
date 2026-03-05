'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, AlertCircle, Trash2, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function RelevanceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;

  const getRelevanceColor = (value: number) => {
    if (value > 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-500/30';
    if (value > 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-500/30';
    return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-500/30';
  };

  return (
    <Badge variant="outline" className={cn("font-mono", getRelevanceColor(score))}>
      {(score * 100).toFixed(0)}%
    </Badge>
  );
}


type PromptsTableProps = {
  prompts: any[];
  fetching: boolean;
  error?: any;
  sortConfig: { key: string; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: string) => void;
  onDeleteClick: (e: React.MouseEvent, id: string) => void;
};

export default function PromptsTable({ prompts, fetching, error, sortConfig, requestSort, onDeleteClick }: PromptsTableProps) {
  const [layout, setLayout] = useState<number[]>([25, 15, 25, 20, 15]);
  const router = useRouter();
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');

  const handleCreateNewPrompt = () => {
    if (!newPromptName.trim()) return;
    router.push(`/prompts?new_id=${encodeURIComponent(newPromptName.trim())}`);
    setIsNewPromptDialogOpen(false);
    setNewPromptName('');
  };

  const handleNewPromptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateNewPrompt();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All ADL Files</CardTitle>
              <CardDescription>A list of all saved ADL Files in your project.</CardDescription>
            </div>
            <Button variant="secondary" onClick={() => setIsNewPromptDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New ADL Prompt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetching && !prompts.length ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load Skill Prompts: {error.message}
              </AlertDescription>
            </Alert>
          ) : (
          <div className="border rounded-lg">
            <ResizablePanelGroup
                direction="horizontal"
                onLayout={(sizes: number[]) => { setLayout(sizes); }}
                className="min-w-full font-medium text-muted-foreground text-sm"
            >
                <ResizablePanel defaultSize={layout[0]} minSize={15}>
                    <div className="flex h-12 items-center px-4 cursor-pointer hover:bg-muted/50" onClick={() => requestSort('id')}>
                        <div className="flex items-center gap-2">
                        ID
                        {sortConfig?.key === 'id' ? (sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={layout[1]} minSize={15}>
                    <div className="flex h-12 items-center px-4 cursor-pointer hover:bg-muted/50" onClick={() => requestSort('createdAt')}>
                        <div className="flex items-center gap-2">
                        Created At
                        {sortConfig?.key === 'createdAt' ? (sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={layout[2]} minSize={15}>
                    <div className="flex h-12 items-center px-4">
                        Tags
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={layout[3]} minSize={10}>
                    <div className="flex h-12 items-center px-4 cursor-pointer hover:bg-muted/50" onClick={() => requestSort('relevance')}>
                        <div className="flex items-center gap-2">
                        Relevance
                        {sortConfig?.key === 'relevance' ? (sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={layout[4]} minSize={10}>
                    <div className="flex h-12 items-center justify-end px-4">
                        Actions
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
            
            <div className="border-t">
            {fetching && prompts.length > 0 ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : prompts.length > 0 ? (
                prompts.map((useCasePrompt: any) => (
                <div 
                    key={useCasePrompt.id}
                    onClick={() => router.push(`/prompts?id=${useCasePrompt.id}`)}
                    className="flex items-center min-w-full cursor-pointer hover:bg-muted/50 border-b last:border-b-0 text-sm"
                >
                    <div style={{ flexBasis: `${layout[0]}%` }} className="px-4 py-4 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                        {useCasePrompt.id}
                    </div>
                    <div style={{ flexBasis: `${layout[1]}%` }} className="px-4 py-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {useCasePrompt.createdAt}
                    </div>
                    <div style={{ flexBasis: `${layout[2]}%` }} className="px-4 py-1">
                        <div className="flex gap-2 flex-wrap">
                            {(useCasePrompt.tags || []).map((tag: string) => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                        </div>
                    </div>
                    <div style={{ flexBasis: `${layout[3]}%` }} className="px-4 py-1">
                      <RelevanceBadge score={useCasePrompt.relevance} />
                    </div>
                    <div style={{ flexBasis: `${layout[4]}%` }} className="px-4 py-1 flex justify-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => onDeleteClick(e, useCasePrompt.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                </div>
                ))
            ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                    No prompts found.
                </div>
            )}
            </div>
        </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isNewPromptDialogOpen} onOpenChange={setIsNewPromptDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>New Skill Prompt</DialogTitle>
                <DialogDescription>
                    Enter a name for your new prompt. This will be used as its unique ID.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={newPromptName}
                        onChange={(e) => setNewPromptName(e.target.value)}
                        onKeyDown={handleNewPromptKeyDown}
                        placeholder="e.g. my-new-prompt"
                        autoFocus
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleCreateNewPrompt} disabled={!newPromptName.trim()}>
                    Create Prompt
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
