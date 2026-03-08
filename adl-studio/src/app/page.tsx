'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Pencil, Trash2, Bot, Server, Cpu } from 'lucide-react';
import AppHeader from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ListAgentsQuery } from '@/lib/graphql/queries';
import { DeleteAgentMutation } from '@/lib/graphql/mutations';
import type { Agent } from '@/lib/data';
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
import { cn } from '@/lib/utils';

export default function AgentManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const [agentsResult, reexecuteAgents] = useQuery({ 
    query: ListAgentsQuery,
    requestPolicy: 'cache-and-network' 
  });
  const { data, fetching, error } = agentsResult;

  const [deleteAgentResult, executeDeleteAgent] = useMutation(DeleteAgentMutation);

  const agents: Agent[] = data?.agents || [];

  const handleOpenNew = () => {
    router.push('/agents/edit');
  };

  const handleEdit = (agent: Agent) => {
    router.push(`/agents/edit?id=${agent.id}`);
  };

  const handleDeleteClick = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;
    const result = await executeDeleteAgent({ id: agentToDelete.id });
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting agent',
        description: result.error.message,
      });
    } else {
      toast({ title: 'Agent deleted' });
      reexecuteAgents({ requestPolicy: 'network-only' });
    }
    setIsDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
            <p className="text-muted-foreground mt-1">Configure and manage your AI agent fleet.</p>
          </div>
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>

        {fetching && agents.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-6 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive">
            <h2 className="font-bold">Error loading agents</h2>
            <p>{error.message}</p>
          </div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="flex flex-col group transition-all hover:shadow-xl">
                <CardHeader className="relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <div 
                          className={cn(
                            "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
                            agent.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                          )} 
                        />
                      </div>
                      <CardTitle className="text-xl">{agent.name}</CardTitle>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(agent)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="mt-2 line-clamp-2 min-h-[2.5rem]">
                    {agent.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {agent.tags && agent.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="px-2 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3 w-3" />
                      <span>{agent.models?.length || 0} Models</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Server className="h-3 w-3" />
                      <span>{agent.mcpServers?.length || 0} MCP Servers</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 bg-muted/30">
                  <Button variant="outline" className="w-full text-xs" onClick={() => handleEdit(agent)}>
                    Configure Settings
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/20">
            <Bot className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">No agents found. Create your first one to get started.</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenNew}>Create Agent</Button>
          </div>
        )}
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the agent "<strong>{agentToDelete?.name}</strong>". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteAgentResult.fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
