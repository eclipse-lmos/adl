'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/header';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'urql';
import { ListWidgetsQuery } from '@/lib/graphql/queries';
import { DeleteWidgetMutation } from '@/lib/graphql/mutations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from 'next-themes';

export default function WidgetsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [result, reexecuteListQuery] = useQuery({ query: ListWidgetsQuery, requestPolicy: 'cache-and-network' });
  const { data, fetching, error } = result;
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [widgetToDelete, setWidgetToDelete] = useState<{ id: string; name: string; } | null>(null);
  const { toast } = useToast();
  const [deleteResult, executeDelete] = useMutation(DeleteWidgetMutation);

  const widgets = data?.widgets || [];

  const handleDeleteClick = (e: React.MouseEvent, widget: { id: string; name: string; }) => {
    e.stopPropagation();
    setWidgetToDelete(widget);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!widgetToDelete) return;

    const result = await executeDelete({ id: widgetToDelete.id });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error deleting widget",
        description: result.error.message,
      });
    } else {
      toast({
        title: "Widget deleted",
        description: `The widget "${widgetToDelete.name}" has been successfully deleted.`,
      });
      reexecuteListQuery({ requestPolicy: 'network-only' });
    }
    setShowDeleteDialog(false);
    setWidgetToDelete(null);
  };

  const handleDialogChange = (isOpen: boolean) => {
      if (!isOpen) {
          setWidgetToDelete(null);
      }
      setShowDeleteDialog(isOpen);
  }

  const createIframeSrcDoc = (html: string) => `
      <!DOCTYPE html>
      <html class="${isDark ? 'dark' : ''}">
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              darkMode: 'class',
            }
          </script>
          <style>
            body { 
              background-color: transparent;
              height: 100%;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pb-4 md:px-6 md:pb-6">
        <div className="flex items-center justify-between my-6">
              <div className="my-6 px-4">
                                <h1 className="text-2xl font-bold">Widgets</h1>
                                <p className="text-sm text-muted-foreground">
                                    Widgets can be used to decorate Agent responses with HTML templates.
                                </p>
                            </div>
                         
             <Link href="/faces">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Widget
                </Button>
              </Link>
        </div>
        
        <div className="flex-1 rounded-lg bg-muted/50 p-6">
          {fetching ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load widgets: {error.message}
                </AlertDescription>
              </Alert>
          ) : widgets.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {widgets.map((widget: any) => (
                <div key={widget.id} className="w-full sm:max-w-[300px]">
                  <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                      <div className="flex-grow">
                        <CardTitle>{widget.name}</CardTitle>
                        {widget.description && <CardDescription>{widget.description}</CardDescription>}
                      </div>
                      <div className="flex -mr-4">
                        <Link href={`/faces?id=${widget.id}`}>
                            <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit Widget</span>
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, widget)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Widget</span>
                        </Button>
                      </div>
                    </CardHeader>
                    {widget.html && (
                      <CardContent className="h-48 bg-muted/50 rounded-b-lg overflow-hidden">
                        <iframe
                          srcDoc={createIframeSrcDoc(widget.html)}
                          title={`${widget.name} preview`}
                          className="w-full h-full border-0 pointer-events-none"
                          sandbox="allow-scripts"
                        />
                      </CardContent>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              No widgets found.
            </div>
          )}
        </div>
      </main>
      <AlertDialog open={showDeleteDialog} onOpenChange={handleDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the widget
                "{widgetToDelete?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={deleteResult.fetching}>
                {deleteResult.fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
