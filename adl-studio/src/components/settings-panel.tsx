'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'urql';
import { Settings, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ToolsList from '@/components/tools-list';
import { GetMcpServerUrlsQuery, GetMcpToolsQuery, GetUserSettingsQuery } from '@/lib/graphql/queries';
import { SetMcpServerUrlsMutation, SetUserSettingsMutation } from '@/lib/graphql/mutations';
import { useToast } from '@/hooks/use-toast';


type SettingsPanelProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

type McpServer = {
  url: string;
  reachable: boolean;
  toolCount: number;
};

export default function SettingsPanel({ isOpen, onOpenChange }: SettingsPanelProps) {
  const [newServerUrl, setNewServerUrl] = useState('');
  const [serverUrls, setServerUrls] = useState<McpServer[]>([]);
  const [activeTab, setActiveTab] = useState('servers');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const { toast } = useToast();

  const [serverUrlsResult, reexecuteServers] = useQuery({ query: GetMcpServerUrlsQuery, pause: !isOpen });
  const { data, fetching, error } = serverUrlsResult;

  const [toolsResult, reexecuteTools] = useQuery({
    query: GetMcpToolsQuery,
    pause: !isOpen || activeTab !== 'tools',
  });

  const [userSettingsResult, reexecuteUserSettings] = useQuery({
    query: GetUserSettingsQuery,
    pause: !isOpen || activeTab !== 'llm',
  });
  
  const [setSettingsResult, executeSetSettings] = useMutation(SetUserSettingsMutation);

  const [_mutationResult, executeMutation] = useMutation(SetMcpServerUrlsMutation);

  useEffect(() => {
    if (data?.mcpServerUrls) {
      setServerUrls(data.mcpServerUrls);
    }
  }, [data]);
  
  useEffect(() => {
    if (userSettingsResult.data?.userSettings) {
      setApiKey(userSettingsResult.data.userSettings.apiKey || '');
      setModelName(userSettingsResult.data.userSettings.modelName || '');
    }
  }, [userSettingsResult.data]);


  const updateServers = useCallback((urls: string[]) => {
    executeMutation({ urls }).then((result) => {
        if (!result.error) {
            reexecuteServers({ requestPolicy: 'network-only' });
            reexecuteTools({ requestPolicy: 'network-only' });
        }
    });
  }, [executeMutation, reexecuteServers, reexecuteTools]);


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
    executeSetSettings({ apiKey, modelName }).then(result => {
        if (result.error) {
            toast({
                title: "Error saving settings",
                description: result.error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "LLM Settings Saved",
                description: "Your API Key and model name have been updated.",
            });
            reexecuteUserSettings({ requestPolicy: 'network-only' });
        }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Manage your application settings.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="servers" className="py-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="servers">Servers</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="llm">LLM</TabsTrigger>
          </TabsList>
          <TabsContent value="servers">
            <div className="py-4 flex flex-col gap-6">
                <div>
                    <h3 className="text-lg font-medium">MCP Servers</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure the GraphQL endpoints for your MCP servers.
                    </p>
                    <div className="mt-4 space-y-2">
                        {fetching && <Loader2 className="h-6 w-6 animate-spin" />}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    Failed to load server list: {error.message}
                                </AlertDescription>
                            </Alert>
                        )}
                        {!fetching && !error && serverUrls.map((server, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 shrink-0">
                                    {server.reachable ? <div className="h-2 w-2 rounded-full bg-green-500" /> : <div className="h-2 w-2 rounded-full bg-red-500" />}
                                </div>
                                <Input value={server.url} readOnly className="flex-1 bg-muted" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveServer(server)}
                                    disabled={_mutationResult.fetching}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Server</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                     <div className="mt-6 flex items-center gap-2">
                        <Input
                            placeholder="e.g. http://localhost:8081"
                            value={newServerUrl}
                            onChange={(e) => setNewServerUrl(e.target.value)}
                        />
                        <Button onClick={handleAddServer} size="icon" variant="outline" disabled={!newServerUrl.trim() || _mutationResult.fetching}>
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Add Server</span>
                        </Button>
                    </div>
                </div>
            </div>
          </TabsContent>
          <TabsContent value="tools">
            <div className="py-4">
              <h3 className="text-lg font-medium">Available Tools</h3>
              <p className="text-sm text-muted-foreground mb-4">
                  List of tools available from the connected MCP server.
              </p>
              {isOpen && <ToolsList toolsResult={toolsResult} />}
            </div>
          </TabsContent>
          <TabsContent value="llm">
            <div className="py-4 flex flex-col gap-6">
                <div>
                    <h3 className="text-lg font-medium">LLM Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        Set the API Key and model for the Language Model.
                    </p>
                    <div className="mt-4 space-y-4">
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
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleLlmSettingsSave} disabled={setSettingsResult.fetching}>
                                {setSettingsResult.fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
          </TabsContent>
        </Tabs>
        <SheetFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
