'use client';

import { useState } from 'react';
import { useMutation } from 'urql';
import AppHeader from '@/components/header';
import { useToast } from '@/hooks/use-toast';
import { DeletePromptMutation } from '@/lib/graphql/mutations';
import { usePrompts } from '@/hooks/use-prompts';
import SearchForm from '@/components/search-form';
import PromptsTable from '@/components/prompts-table';
import DeletePromptDialog from '@/components/delete-prompt-dialog';


export default function DashboardPage() {
  const { 
    searchQuery, 
    setSearchQuery, 
    handleSearchSubmit, 
    handleClearSearch,
    prompts,
    fetching,
    error,
    sortConfig,
    requestSort,
    reexecuteQuery,
  } = usePrompts();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const [_deleteResult, executeDelete] = useMutation(DeletePromptMutation);
  
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPromptToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!promptToDelete) return;

    const result = await executeDelete({ id: promptToDelete });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error deleting prompt",
        description: result.error.message,
      });
    } else {
      toast({
        title: "Prompt deleted",
        description: result.data?.delete?.message || "The prompt has been successfully deleted.",
      });
      reexecuteQuery();
    }
    setShowDeleteDialog(false);
    setPromptToDelete(null);
  };

  const handleDialogChange = (isOpen: boolean) => {
      if (!isOpen) {
          setPromptToDelete(null);
      }
      setShowDeleteDialog(isOpen);
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pb-4 md:px-6 md:pb-6">
        <div className="flex items-center gap-4 my-6">
            <h1 className="text-2xl font-bold">Your Query</h1>
            <SearchForm 
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSubmit={handleSearchSubmit}
              onClear={handleClearSearch}
            />
        </div>
        <PromptsTable
          prompts={prompts}
          fetching={fetching}
          error={error}
          sortConfig={sortConfig}
          requestSort={requestSort}
          onDeleteClick={handleDeleteClick}
        />
      </main>
      <DeletePromptDialog
        isOpen={showDeleteDialog}
        onOpenChange={handleDialogChange}
        onConfirm={confirmDelete}
        promptId={promptToDelete}
      />
    </div>
  );
}
