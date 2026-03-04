'use client';

import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type Tool = {
  name: string;
  description: string;
  parameters: any;
};

type ToolsListProps = {
    toolsResult: {
        data: any;
        fetching: boolean;
        error?: any;
    }
};

type Parameter = {
  name: string;
  type: string;
  description: string;
};


export default function ToolsList({ toolsResult }: ToolsListProps) {
  const { data, fetching: isLoading, error } = toolsResult;

  const tools: Tool[] = data?.getMcpTools || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error fetching tools</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!tools || tools.length === 0) {
    return <p className="text-sm text-muted-foreground text-center">No tools available.</p>;
  }
  
  const parseParameters = (params: any): { structured: Parameter[] | null; raw: string } => {
    let raw = '';
    if (typeof params === 'object' && params !== null) {
        try {
            raw = JSON.stringify(params, null, 2);
        } catch {
            raw = String(params);
        }
    } else {
        raw = String(params);
    }

    // Try parsing as JSON first
    try {
        const paramsObj = typeof params === 'string' ? JSON.parse(params) : params;
        if (paramsObj && paramsObj.properties && typeof paramsObj.properties === 'object') {
            const structured = Object.entries(paramsObj.properties).map(([name, schema]: [string, any]) => ({
                name,
                type: schema.type || 'any',
                description: schema.description || 'No description available.',
            }));
            if (structured.length > 0) {
              return { structured, raw };
            }
        }
    } catch (e) {
        // Not a valid JSON, fall through to custom parser
    }

    // Custom parser for the string format like "ParametersSchema(...)"
    if (typeof raw === 'string') {
      const propertiesRegex = /properties=\{([^\}]+)\}/s;
      const propertiesMatch = raw.match(propertiesRegex);
  
      if (propertiesMatch && propertiesMatch[1]) {
        const propertiesString = propertiesMatch[1];
        const paramRegex = /(\w+)=ParameterSchema\((.*?)\)/g;
        const parameters: Parameter[] = [];
        let match;
  
        while ((match = paramRegex.exec(propertiesString)) !== null) {
          const name = match[1];
          const schemaContent = match[2];
          
          const typeRegex = /type=([^,]+)/;
          const descriptionMatch = schemaContent.match(/description=(.*?)(?:, \w+=|$)/s);

          parameters.push({
            name: name,
            type: typeRegex.exec(schemaContent)?.[1].trim() || 'any',
            description: descriptionMatch?.[1].trim() || 'No description available.',
          });
        }
  
        if (parameters.length > 0) {
          return { structured: parameters, raw };
        }
      }
    }

    return { structured: null, raw };
  };


  return (
    <Accordion type="single" collapsible className="w-full">
      {tools.map((tool: Tool) => {
        const { structured: parameters, raw: rawParameters } = parseParameters(tool.parameters);
        return (
            <AccordionItem value={tool.name} key={tool.name}>
            <AccordionTrigger>{tool.name}</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{tool.description}</p>
                {tool.parameters && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Parameters</h4>
                        {parameters ? (
                        <div className="space-y-2">
                            {parameters.map((param) => (
                            <div key={param.name} className="rounded-md border bg-muted/50 p-3">
                                <p className="text-sm font-medium">{param.name}</p>
                                <p className="text-xs text-muted-foreground mt-1 italic">{param.description}</p>
                                <p className="text-xs text-muted-foreground">Type: {param.type}</p>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap font-mono">
                            {rawParameters}
                        </pre>
                        )}
                    </div>
                )}
                </div>
            </AccordionContent>
            </AccordionItem>
        )
      })}
    </Accordion>
  );
}
