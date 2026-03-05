'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

type FilterExecutedEventProps = {
  event: {
    event: string;
    filterName: string;
    input?: string;
    output?: string;
    status?: string;
    latency?: number;
  };
};

export default function FilterExecutedEvent({ event }: FilterExecutedEventProps) {
  const isSuccess = !event.status || ['success', 'passed', 'pass', 'ok'].includes(event.status.toLowerCase());
  
  return (
    <Card className="font-mono text-xs border-blue-500/20 bg-blue-50/5 dark:bg-blue-950/5">
      <CardHeader className="p-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold">{event.filterName || 'Filter'}</CardTitle>
            </div>
            {event.status && (
              <Badge variant={isSuccess ? "default" : "destructive"} className="text-[10px] px-1 h-4">
                  {event.status}
              </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        
        <Accordion type="single" collapsible className="w-full text-xs">
          {event.input && (
            <AccordionItem value="input" className="border-b-0">
                <AccordionTrigger className="p-0 hover:no-underline font-normal py-1">
                    <strong>Input</strong>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                <pre className="p-2 bg-muted rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                    <code>{event.input}</code>
                </pre>
                </AccordionContent>
            </AccordionItem>
          )}
          {event.output && (
            <AccordionItem value="output" className="border-b-0">
                <AccordionTrigger className="p-0 hover:no-underline font-normal py-1">
                    <strong>Output</strong>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                <pre className="p-2 bg-muted rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                    <code>{event.output}</code>
                </pre>
                </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
