'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'urql';
import { ArrowLeft, Loader2, Save, Bot } from 'lucide-react';
import AppHeader from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GetAgentQuery, RolePromptsQuery, TagsQuery } from '@/lib/graphql/queries';
import { SaveAgentMutation } from '@/lib/graphql/mutations';
import type { Agent } from '@/lib/data';
import TagManager from '@/components/tag-manager';

function AgentEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id');
  const { toast } = useToast();

  const [editingAgent, setEditingAgent] = useState<Partial<Agent>>({
    name: '',
    description: '',
    models: [],
    tags: [],
    mcpServers: [],
    role: null,
    active: true
  });

  const [agentResult] = useQuery({
    query: GetAgentQuery,
    variables: { id: agentId },
    pause: !agentId,
    requestPolicy: 'network-only'
  });

  const [rolesResult] = useQuery({ query: RolePromptsQuery });
  const roles = rolesResult.data?.rolePrompts || [];

  const [tagsResult] = useQuery({ query: TagsQuery });
  const availableTags = (tagsResult.data?.tags || []) as string[];

  const [saveAgentResult, executeSaveAgent] = useMutation(SaveAgentMutation);

  useEffect(() => {
    if (agentResult.data?.agent) {
      const agent = agentResult.data.agent;
      setEditingAgent({
        ...agent,
        tags: agent.tags || [],
        models: agent.models || [],
        mcpServers: agent.mcpServers || [],
        active: agent.active ?? false
      });
    }
  }, [agentResult.data]);

  const handleSave = async () => {
    if (!editingAgent.name?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Agent name is required.',
      });
      return;
    }

    const input = {
      id: agentId,
      name: editingAgent.name,
      description: editingAgent.description,
      models: editingAgent.models,
      tags: editingAgent.tags,
      mcpServers: editingAgent.mcpServers,
      role: editingAgent.role,
      active: editingAgent.active ?? false,
    };

    const result = await executeSaveAgent({ input });
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error saving agent',
        description: result.error.message,
      });
    } else {
      toast({ title: 'Agent saved successfully' });
      router.push('/');
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (agentId && agentResult.fetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              {agentId ? 'Edit Agent' : 'Create New Agent'}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Agents are a great way to bundle and limit ADL files. The Tags field is used to select the ADL files for that Agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
              <div className="space-y-0.5">
                <Label htmlFor="agent-active" className="text-base font-semibold">Active Status</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this agent in the system.</p>
              </div>
              <Switch 
                id="agent-active" 
                checked={editingAgent.active ?? false} 
                onCheckedChange={checked => setEditingAgent(prev => ({ ...prev, active: checked }))}
              />
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Name</Label>
                <Input 
                  id="agent-name" 
                  value={editingAgent.name || ''} 
                  onChange={e => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Code Review Assistant"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagManager 
                  tags={editingAgent.tags || []} 
                  onTagsChange={(tags) => setEditingAgent(prev => ({ ...prev, tags }))} 
                  availableTags={availableTags} 
                />
                <p className="text-[10px] text-muted-foreground">Select from existing project tags to bundle ADLs.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-desc">Description</Label>
                <Textarea 
                  id="agent-desc" 
                  value={editingAgent.description || ''} 
                  onChange={e => setEditingAgent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Briefly describe what this agent does..."
                  rows={3}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="agent-models">Supported Models</Label>
                  <Input 
                    id="agent-models" 
                    value={editingAgent.models?.join(', ') || ''} 
                    onChange={e => setEditingAgent(prev => ({ ...prev, models: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="model-1, model-2"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated model identifiers.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-role">Role</Label>
                  <Select 
                    value={editingAgent.role || 'none'} 
                    onValueChange={value => setEditingAgent(prev => ({ ...prev, role: value === 'none' ? null : value }))}
                  >
                    <SelectTrigger id="agent-role">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Role</SelectItem>
                      {roles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Choose a predefined persona for this agent.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-mcp">MCP Servers</Label>
                <Input 
                  id="agent-mcp" 
                  value={editingAgent.mcpServers?.join(', ') || ''} 
                  onChange={e => setEditingAgent(prev => ({ ...prev, mcpServers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="https://mcp-server-url"
                />
                <p className="text-[10px] text-muted-foreground">Comma-separated MCP server URLs.</p>
              </div>
            </div>
          </CardContent>
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/10">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveAgentResult.fetching}>
              {saveAgentResult.fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Agent
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function AgentEditorPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AgentEditorContent />
    </Suspense>
  );
}
