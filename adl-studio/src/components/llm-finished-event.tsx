'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type LlmFinishedEventProps = {
  event: {
    event: string;
    model: string;
    result: string;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    toolCallCount: number;
  };
};

export default function LlmFinishedEvent({ event }: LlmFinishedEventProps) {
  return (
    <Card className="font-mono text-xs">
      <CardHeader className="p-2">
        <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">{event.event}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        <div>
          <strong>Model:</strong> {event.model}
        </div>
        <Accordion type="single" collapsible className="w-full text-xs">
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="p-0 hover:no-underline font-normal">
                <strong>Result:</strong>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <pre className="p-2 bg-muted rounded whitespace-pre-wrap">
                <code>{event.result}</code>
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="flex justify-between">
            <span>
                <strong>Total Tokens:</strong> {event.totalTokens}
            </span>
            <span>
                <strong>Prompt:</strong> {event.promptTokens}
            </span>
            <span>
                <strong>Completion:</strong> {event.completionTokens}
            </span>
        </div>
        <div>
            <strong>Tool Calls:</strong> {event.toolCallCount}
        </div>
      </CardContent>
    </Card>
  );
}
