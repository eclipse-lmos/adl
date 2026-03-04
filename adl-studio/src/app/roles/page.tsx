
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from 'urql';
import { RolePromptsQuery } from '@/lib/graphql/queries';
import { DeleteRolePromptMutation, UpdateRolePromptMutation } from '@/lib/graphql/mutations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Pencil, Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


type RolePrompt = {
  id: string;
  name: string;
  tags: string[];
  role: string;
  tone: string;
};


function EditRoleSheetContent({ role: passedRole, onSave, onCancel }: { role: RolePrompt; onSave: () => void; onCancel: () => void; }) {
  const [name, setName] = useState('');
  const [roleText, setRoleText] = useState('');
  const [tone, setTone] = useState('');
  const { toast } = useToast();

  const [saveResult, executeSave] = useMutation(UpdateRolePromptMutation);

  useEffect(() => {
    if (passedRole) {
      setName(passedRole.name);
      setRoleText(passedRole.role || '');
      setTone(passedRole.tone || '');
    }
  }, [passedRole]);

  const handleSave = async () => {
    const result = await executeSave({
      id: passedRole.id,
      name: name,
      tags: passedRole.tags || [],
      role: roleText,
      tone: tone,
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error saving role",
        description: result.error.message,
      });
    } else {
      toast({
        title: "Role Saved",
        description: `The role "${name}" has been successfully saved.`,
      });
      onSave();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <SheetTitle>Edit Role</SheetTitle>
        <SheetDescription>
          Make changes to the role's properties below.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1 -mr-6 pr-6">
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-role">Role</Label>
            <Textarea
              id="role-role"
              value={roleText}
              onChange={(e) => setRoleText(e.target.value)}
              className="resize-y"
              placeholder="Describe the role of the assistant..."
              rows={Math.max(6, roleText.split('\n').length)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-tone">Tone</Label>
            <Textarea
              id="role-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="resize-y"
              placeholder="Describe the tone of the assistant..."
              rows={Math.max(4, tone.split('\n').length)}
            />
          </div>
        </div>
      </ScrollArea>
      <SheetFooter className="mt-auto pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saveResult.fetching}>
          {saveResult.fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </SheetFooter>
    </div>
  );
}


export default function RolesPage() {
  const [result, reexecuteListQuery] = useQuery({ query: RolePromptsQuery, requestPolicy: 'cache-and-network' });
  const { data, fetching, error } = result;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string; } | null>(null);

  const [isNewRoleDialogOpen, setIsNewRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleRole, setNewRoleRole] = useState('');
  const [newRoleTone, setNewRoleTone] = useState('');
  
  const [editingRole, setEditingRole] = useState<RolePrompt | null>(null);

  const { toast } = useToast();
  const [deleteResult, executeDelete] = useMutation(DeleteRolePromptMutation);
  const [saveResult, executeSave] = useMutation(UpdateRolePromptMutation);

  const roles: RolePrompt[] = data?.rolePrompts || [];

  const handleEditClick = (e: React.MouseEvent, role: RolePrompt) => {
    e.stopPropagation();
    setEditingRole(role);
  };
  
  const handleEditSheetClose = (saved: boolean) => {
    setEditingRole(null);
    if (saved) {
      reexecuteListQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, role: { id: string; name: string; }) => {
    e.stopPropagation();
    setRoleToDelete(role);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    const result = await executeDelete({ id: roleToDelete.id });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error deleting role",
        description: result.error.message,
      });
    } else {
      toast({
        title: "Role deleted",
        description: `The role \"${roleToDelete.name}\" has been successfully deleted.`,
      });
      reexecuteListQuery({ requestPolicy: 'network-only' });
    }
    setShowDeleteDialog(false);
    setRoleToDelete(null);
  };

  const handleDialogChange = (isOpen: boolean) => {
      if (!isOpen) {
          setRoleToDelete(null);
      }
      setShowDeleteDialog(isOpen);
  }

  const handleCreateNewRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name is required',
        description: 'Please provide a name for the new role.',
      });
      return;
    }

    if (!newRoleRole.trim()) {
        toast({
            variant: 'destructive',
            title: 'Role is required',
            description: 'Please provide a role prompt.',
        });
        return;
    }

    const roleId = newRoleName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await executeSave({
      id: roleId,
      name: newRoleName.trim(),
      tags: [],
      role: newRoleRole.trim(),
      tone: newRoleTone.trim(),
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error creating role',
        description: result.error.message,
      });
    } else {
      toast({
        title: 'Role Created',
        description: `The role \"${newRoleName.trim()}\" has been successfully created.`,
      });
      setIsNewRoleDialogOpen(false);
      reexecuteListQuery({ requestPolicy: 'network-only' });
    }
  };
  
  const handleNewRoleDialogChange = (isOpen: boolean) => {
    setIsNewRoleDialogOpen(isOpen);
    if (!isOpen) {
        setNewRoleName('');
        setNewRoleRole('');
        setNewRoleTone('');
    }
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pb-4 md:px-6 md:pb-6">
        <div className="my-6 flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold">Roles</h1>
                <p className="text-sm text-muted-foreground">
                    The roles define the persona and the tone of the agents.
                </p>
            </div>
            <Button onClick={() => handleNewRoleDialogChange(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
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
                        Failed to load roles: {error.message}
                    </AlertDescription>
                </Alert>
            ) : roles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roles.map((role: RolePrompt) => (
                      <Card key={role.id} className="flex flex-col">
                          <CardHeader className="flex flex-row justify-between items-start pb-2">
                              <div className="flex-grow space-y-1">
                                  <CardTitle className="text-lg">{role.name}</CardTitle>
                              </div>
                              <div className="flex -mr-2 -mt-2">
                                  <Button asChild variant="ghost" size="icon" onClick={(e) => handleEditClick(e, role)}>
                                      <span className="cursor-pointer">
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </span>
                                  </Button>
                                  <Button asChild variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, role)}>
                                      <span className="cursor-pointer">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                      </span>
                                  </Button>
                              </div>
                          </CardHeader>
                          <CardContent className="flex-1 pt-0">
                              <p className="text-sm text-muted-foreground line-clamp-4 mt-2">{role.role}</p>
                          </CardContent>
                      </Card>
                  ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No roles found. Click 'New Role' to create one.
              </div>
            )}
        </div>
      </main>

      <Sheet open={!!editingRole} onOpenChange={(open) => !open && handleEditSheetClose(false)}>
        <SheetContent className="sm:max-w-2xl flex flex-col">
          {editingRole && (
            <EditRoleSheetContent 
              role={editingRole} 
              onSave={() => handleEditSheetClose(true)}
              onCancel={() => handleEditSheetClose(false)}
            />
          )}
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={handleDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the role
                "{roleToDelete?.name}".
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

      <Dialog open={isNewRoleDialogOpen} onOpenChange={handleNewRoleDialogChange}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>New Role</DialogTitle>
                <DialogDescription>
                    Create a new role by providing the details below.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="new-role-name">Name</Label>
                    <Input
                        id="new-role-name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g. helpful-assistant"
                        autoFocus
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="new-role-role">Role</Label>
                    <Textarea
                        id="new-role-role"
                        value={newRoleRole}
                        onChange={(e) => setNewRoleRole(e.target.value)}
                        placeholder="Describe the role of the assistant..."
                        className="resize-y"
                        rows={Math.max(6, newRoleRole.split('\n').length)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="new-role-tone">Tone</Label>
                    <Textarea
                        id="new-role-tone"
                        value={newRoleTone}
                        onChange={(e) => setNewRoleTone(e.target.value)}
                        placeholder="Describe the tone of the assistant..."
                        className="resize-y"
                        rows={Math.max(4, newRoleTone.split('\n').length)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => handleNewRoleDialogChange(false)}>Cancel</Button>
                <Button onClick={handleCreateNewRole} disabled={!newRoleName.trim() || !newRoleRole.trim() || saveResult.fetching}>
                    {saveResult.fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Role
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
