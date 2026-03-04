'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/header';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from 'urql';
import { useToast } from '@/hooks/use-toast';
import { GenerateWidgetMutation, SaveWidgetMutation } from '@/lib/graphql/mutations';
import { GetWidgetQuery } from '@/lib/graphql/queries';
import { Loader2, Save } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import HtmlEditor from '@/components/html-editor';
import JsonEditor from '@/components/json-editor';
import { useTheme } from 'next-themes';

function FacesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const widgetIdFromUrl = searchParams.get('id');

    const [selectedWidgetHtml, setSelectedWidgetHtml] = useState<string>('');
    const [jsonSchema, setJsonSchema] = useState<string>('');
    const [purpose, setPurpose] = useState('');
    const [name, setName] = useState('');
    const [widgetId, setWidgetId] = useState<string | null>(widgetIdFromUrl);
    
    const { toast } = useToast();
    const [generateWidgetResult, executeGenerateWidget] = useMutation(GenerateWidgetMutation);
    const [saveWidgetResult, executeSaveWidget] = useMutation(SaveWidgetMutation);
    
    const [getWidgetResult] = useQuery({
        query: GetWidgetQuery,
        variables: { id: widgetIdFromUrl },
        pause: !widgetIdFromUrl,
    });

    useEffect(() => {
        if (getWidgetResult.data?.widget) {
            const { name, html, jsonSchema } = getWidgetResult.data.widget;
            setName(name);
            setSelectedWidgetHtml(html);
            setJsonSchema(jsonSchema || '');
        } else if (getWidgetResult.error) {
            toast({
                variant: 'destructive',
                title: 'Error loading widget',
                description: getWidgetResult.error.message,
            });
        }
    }, [getWidgetResult.data, getWidgetResult.error, toast]);
    
    useEffect(() => {
        if (widgetIdFromUrl) return;

        const nameFromUrl = searchParams.get('name');
        const purposeFromUrl = searchParams.get('purpose');
        if (nameFromUrl) {
            setName(nameFromUrl);
        }
        if (purposeFromUrl) {
            setPurpose(purposeFromUrl);
        }
    }, [searchParams, widgetIdFromUrl]);

    const handleGenerateWidget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!purpose.trim()) {
            toast({
                variant: 'destructive',
                title: 'Purpose is empty',
                description: 'Please describe the widget you want to generate.',
            });
            return;
        }

        const widgetName = name || purpose.toLowerCase().split(' ').slice(0, 3).join('-').replace(/[^a-z0-9-]/g, '');

        const result = await executeGenerateWidget({
            name: widgetName,
            purpose: purpose,
            interactions: "no interactions",
        });

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error generating widget',
                description: result.error.message,
            });
        } else if (result.data?.generateWidget?.html) {
            setSelectedWidgetHtml(result.data.generateWidget.html);
            setJsonSchema(result.data.generateWidget.jsonSchema || '');
            toast({
                title: 'Widget Generated',
                description: 'The new widget has been generated and is ready for preview.',
            });
        }
    };
    
    const handleSaveWidget = async () => {
        if (!selectedWidgetHtml) {
            toast({
                variant: 'destructive',
                title: 'Nothing to save',
                description: 'Please generate or write some HTML first.',
            });
            return;
        }
        if (!name) {
            toast({
                variant: 'destructive',
                title: 'Widget name is required',
                description: 'Please provide a name for the widget.',
            });
            return;
        }

        // Placeholder for a real preview image generator
        const previewPlaceholder = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        
        const result = await executeSaveWidget({
          id: widgetId,
          name: name,
          html: selectedWidgetHtml,
          jsonSchema: jsonSchema,
          preview: previewPlaceholder,
        });

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error saving widget',
                description: result.error.message,
            });
        } else if (result.data?.saveWidget) {
            toast({
                title: 'Widget Saved',
                description: `The widget "${result.data.saveWidget.name}" has been saved.`,
            });
            if (!widgetId) {
                const newId = result.data.saveWidget.id;
                setWidgetId(newId);
                router.push(`/faces?id=${newId}`, { scroll: false });
            }
        }
    };

    const iframeSrcDoc = `
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
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 1rem;
              margin: 0;
            }
           .dark body {
              background-color: #000;
            }
          </style>
        </head>
        <body>
          ${selectedWidgetHtml}
        </body>
      </html>
    `;


    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <AppHeader />
            <main className="flex flex-1 flex-col overflow-hidden">
                 <Accordion type="single" collapsible defaultValue="item-1" className="border-b">
                  <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-lg font-semibold hover:no-underline">
                        Generate Widget
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <form onSubmit={handleGenerateWidget} className="w-full max-w-4xl mx-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="widget-name">Name</Label>
                                    <Input 
                                        id="widget-name"
                                        placeholder="e.g. weather-widget"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={generateWidgetResult.fetching}
                                    />
                                </div>
                                <div className="space-y-2">
                                     <Label htmlFor="widget-purpose">Purpose</Label>
                                     <Textarea
                                         id="widget-purpose"
                                         placeholder="Describe a widget you want to see..."
                                         value={purpose}
                                         onChange={(e) => setPurpose(e.target.value)}
                                         disabled={generateWidgetResult.fetching}
                                         rows={1}
                                     />
                                 </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={handleSaveWidget} disabled={!selectedWidgetHtml || saveWidgetResult.fetching}>
                                     {saveWidgetResult.fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save
                                </Button>
                                <Button type="submit" disabled={generateWidgetResult.fetching || !purpose.trim()}>
                                     {generateWidgetResult.fetching ? <Loader2 className="animate-spin" /> : 'Generate'}
                                </Button>
                            </div>
                        </form>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={50}>
                        <div className="flex flex-col h-full p-4 gap-4">
                            <h2 className="text-xl font-bold">Preview</h2>
                            <Card className="flex-1 overflow-hidden bg-muted">
                                <CardContent className="p-0 h-full w-full">
                                    { getWidgetResult.fetching ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                        </div>
                                    ) : (
                                        <iframe
                                          srcDoc={iframeSrcDoc}
                                          title="Widget Preview"
                                          className="w-full h-full border-0"
                                          sandbox="allow-scripts"
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={50}>
                        <ResizablePanelGroup direction="vertical">
                            <ResizablePanel defaultSize={50}>
                                <div className="flex flex-col h-full p-4 gap-4">
                                    <h2 className="text-xl font-bold">HTML</h2>
                                    <Card className="flex-1">
                                        <CardContent className="h-full p-0">
                                            <HtmlEditor
                                                html={selectedWidgetHtml}
                                                onHtmlChange={setSelectedWidgetHtml}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={50}>
                               <div className="flex flex-col h-full p-4 gap-4">
                                    <h2 className="text-xl font-bold">JSON Schema</h2>
                                    <Card className="flex-1">
                                        <CardContent className="h-full p-0">
                                            <JsonEditor
                                                value={jsonSchema}
                                                onChange={setJsonSchema}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
        </div>
    );
}

export default function FacesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FacesContent />
        </Suspense>
    );
}
