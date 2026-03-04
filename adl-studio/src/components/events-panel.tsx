'use client';

import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, X, BarChart as BarChartIcon } from 'lucide-react';
import { eventService } from '@/lib/events';
import { Button } from '@/components/ui/button';
import LlmFinishedEvent from './llm-finished-event';
import FilterExecutedEvent from './filter-executed-event';
import TokenUsageGraph from './token-usage-graph';

type EventData = {
  id: number;
  time: string;
  message: string;
  event: string;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  [key: string]: any;
};

export default function EventsPanel() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [showGraph, setShowGraph] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleNewEvent = (newEvent: EventData) => {
      setEvents((prevEvents) => [newEvent, ...prevEvents].slice(0, 100));
    };

    eventService.subscribe(handleNewEvent);

    return () => {
      eventService.unsubscribe(handleNewEvent);
    };
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = 0;
        }
    }
  }, [events]);

  const handleClearEvents = () => {
    setEvents([]);
  };

  const llmFinishedEvents = events.filter(event => event.event === 'LLMFinishedEvent');

  return (
    <Card className="h-full flex flex-col light:bg-transparent light:border-0">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Agent Events</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowGraph(!showGraph)} className="h-6 w-6">
            <BarChartIcon className="h-4 w-4" />
            <span className="sr-only">Toggle graph</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClearEvents} className="h-6 w-6">
            <X className="h-4 w-4" />
            <span className="sr-only">Clear events</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {showGraph ? (
          <div className="p-4">
            <TokenUsageGraph events={llmFinishedEvents as any} />
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-4 text-sm">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center pt-8">Waiting for events...</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event, index) => (
                    <li key={index}>
                      {event.event === 'LLMFinishedEvent' ? (
                        <LlmFinishedEvent event={event as any} />
                      ) : event.event === 'FilterExecutedEvent' ? (
                        <FilterExecutedEvent event={event as any} />
                      ) : (
                        <div className="font-mono bg-muted/50 p-2 rounded-lg text-xs border">
                          <pre><code>{JSON.stringify(event, null, 2)}</code></pre>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
