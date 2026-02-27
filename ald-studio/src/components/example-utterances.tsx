'use client';

import { useState } from 'react';
import { List, Minus, Plus, RefreshCcw, Loader2, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ExampleUtterancesProps = {
  utterances: string[] | null;
  onRemoveUtterance: (index: number) => void;
  onAddUtterance: (utterance: string) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  onPlayUtterance: (utterance: string) => void;
};

export default function ExampleUtterances({ utterances, onRemoveUtterance, onAddUtterance, onRegenerate, isGenerating, disabled, onPlayUtterance }: ExampleUtterancesProps) {
  const [newUtterance, setNewUtterance] = useState('');

  const handleAdd = () => {
    if (newUtterance.trim()) {
      onAddUtterance(newUtterance.trim());
      setNewUtterance('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <Card className="border-0 bg-transparent shadow-none h-full flex flex-col">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Example Utterances</CardTitle>
            {utterances && <Badge variant="secondary">{utterances.length}</Badge>}
          </div>
          <Button onClick={onRegenerate} disabled={isGenerating || disabled} size="icon" variant="outline" className="h-8 w-8">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span className="sr-only">Regenerate examples</span>
          </Button>
        </div>
        <CardDescription className="text-xs">
          A list of example user inputs.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-4 min-h-0">
        <ScrollArea className="rounded-lg border flex-1">
          {utterances === null ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Click regenerate to load examples.</p>
          ) : utterances.length > 0 ? (
            <ul className="space-y-2 p-4">
              {utterances.map((utterance, index) => (
                <li key={index} className="group flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex-1">{utterance}</span>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onPlayUtterance(utterance)}
                      disabled={disabled}
                    >
                      <Play className="h-4 w-4" />
                      <span className="sr-only">Play</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onRemoveUtterance(index)}
                    >
                      <Minus className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground text-center">No example utterances.</p>
          )}
        </ScrollArea>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add an utterance..."
            value={newUtterance}
            onChange={(e) => setNewUtterance(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <Button onClick={handleAdd} variant="secondary" size="icon" className="shrink-0" disabled={!newUtterance.trim() || disabled}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
