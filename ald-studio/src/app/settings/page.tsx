'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'urql';
import { Settings, Plus, Trash2, Loader2, AlertCircle, Save, Palette } from 'lucide-react';
import AppHeader from '@/components/header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ToolsList from '@/components/tools-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GetMcpServerUrlsQuery, GetMcpToolsQuery, GetUserSettingsQuery } from '@/lib/graphql/queries';
import { SetMcpServerUrlsMutation, SetUserSettingsMutation } from '@/lib/graphql/mutations';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';

type McpServer = {
  url: string;
  reachable: boolean;
  toolCount: number;
};

export default function SettingsPage() {
  const [newServerUrl, setNewServerUrl] = useState('');
  const [serverUrls, setServerUrls] = useState<McpServer[]>([]);
  const [activeTab, setActiveTab] = useState('servers');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const { toast } = useToast();

  const [serverUrlsResult, reexecuteServers] = useQuery({ query: GetMcpServerUrlsQuery });
  const { data, fetching: serversFetching, error: serversError } = serverUrlsResult;

  const [toolsResult, reexecuteTools] = useQuery({
    query: GetMcpToolsQuery,
    pause: activeTab !== 'tools',
  });

  const [userSettingsResult, reexecuteUserSettings] = useQuery({
    query: GetUserSettingsQuery,
    pause: activeTab !== 'llm',
  });
  
  const [setSettingsResult, executeSetSettings] = useMutation(SetUserSettingsMutation);
  const [_serversMutationResult, executeServersMutation] = useMutation(SetMcpServerUrlsMutation);

  useEffect(() => {
    if (data?.mcpServerUrls) {
      setServerUrls(data.mcpServerUrls);
    }
  }, [data]);
  
  useEffect(() => {
    if (userSettingsResult.data?.userSettings) {
      setApiKey(userSettingsResult.data.userSettings.apiKey || '');
      setModelName(userSettingsResult.data.userSettings.modelName || '');
      setModelUrl(userSettingsResult.data.userSettings.modelUrl || '');
    }
  }, [userSettingsResult.data]);

  const updateServers = useCallback((urls: string[]) => {
    executeServersMutation({ urls }).then((result) => {
        if (!result.error) {
            reexecuteServers({ requestPolicy: 'network-only' });
            reexecuteTools({ requestPolicy: 'network-only' });
            toast({
              title: "Servers Updated",
              description: "The MCP server list has been refreshed.",
            });
        }
    });
  }, [executeServersMutation, reexecuteServers, reexecuteTools, toast]);

  const handleAddServer = () => {
    if (newServerUrl.trim() && !serverUrls.some(s => s.url === newServerUrl.trim())) {
      const newUrls = [...serverUrls.map(s => s.url), newServerUrl.trim()];
      updateServers(newUrls);
      setNewServerUrl('');
    }
  };

  const handleRemoveServer = (serverToRemove: McpServer) => {
    const newUrls = serverUrls.filter(server => server.url !== serverToRemove.url).map(s => s.url);
    updateServers(newUrls);
  };
  
  const handleLlmSettingsSave = () => {
    executeSetSettings({ apiKey, modelName, modelUrl }).then(result => {
        if (result.error) {
            toast({
                title: "Error saving settings",
                description: result.error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "LLM Settings Saved",
                description: "Your configuration has been updated.",
            });
            reexecuteUserSettings({ requestPolicy: 'network-only' });
        }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your models, MCP servers, and API keys.
          </p>
        </div>

        <Tabs defaultValue="servers" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="servers">Servers</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="llm">LLM</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="servers">
            <Card>
              <CardHeader>
                <CardTitle>MCP Servers</CardTitle>
                <CardDescription>
                  Configure the GraphQL endpoints for your Model Context Protocol servers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {serversFetching && <Loader2 className="h-6 w-6 animate-spin" />}
                  {serversError && (
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>
                              Failed to load server list: {serversError.message}
                          </AlertDescription>
                      </Alert>
                  )}
                  {!serversFetching && !serversError && serverUrls.length > 0 ? (
                    <div className="space-y-2">
                        {serverUrls.map((server, index) => (
                            <div key={index} className="flex items-center gap-3 bg-muted/50 p-2 rounded-md border">
                                <div className="w-2 h-2 shrink-0">
                                    {server.reachable ? <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> : <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                                </div>
                                <span className="flex-1 font-mono text-sm truncate">{server.url}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveServer(server)}
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Server</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                  ) : !serversFetching && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground">No servers configured.</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Input
                      placeholder="e.g. http://localhost:8081"
                      value={newServerUrl}
                      onChange={(e) => setNewServerUrl(e.target.value)}
                      className="flex-1"
                  />
                  <Button onClick={handleAddServer} disabled={!newServerUrl.trim() || _serversMutationResult.fetching}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Server
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>
                    Review the tools exposed by your connected MCP servers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ToolsList toolsResult={toolsResult} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="llm">
            <Card>
              <CardHeader>
                <CardTitle>LLM Configuration</CardTitle>
                <CardDescription>
                    Set your preferred model, provider URL, and API key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input 
                            id="api-key"
                            type="password"
                            placeholder="Enter your API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="model-name">Model Name</Label>
                        <Input 
                            id="model-name"
                            placeholder="e.g. googleai/gemini-2.5-flash"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="model-url">Model URL (Optional)</Label>
                        <Input 
                            id="model-url"
                            placeholder="e.g. https://api.openai.com/v1"
                            value={modelUrl}
                            onChange={(e) => setModelUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Custom endpoint for model inference.</p>
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleLlmSettingsSave} disabled={setSettingsResult.fetching}>
                        {setSettingsResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Configuration
                    </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of your ADL Studio environment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light, dark, and system themes.
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
