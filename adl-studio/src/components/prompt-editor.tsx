import { FileText, Wand2, Info, Loader2, Save, Expand } from 'lucide-react';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useMutation } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CorrectSpellingMutation } from '@/lib/graphql/mutations';
import { useToast } from '@/hooks/use-toast';

type Tool = {
  name: string;
  description: string;
  parameters: string;
};

const PromptHighlighter = {
  rules: {
    VALID_SECTION: {
      test: (line: string) =>
        /^\s*##+\s*(?:Skill|UseCase:|Description|Context|Solution|Alternative Solution|Steps)/.test(
          line
        ),
      className: 'text-green-400',
    },
    INVALID_SECTION: {
      test: (line: string) => /^\s*##+/.test(line),
      className: 'text-red-400',
    },
    PLACEHOLDER: {
      regex: /(<.*?>)/,
      className: 'text-blue-400',
    },
    TOOL: {
        regex: /(@[a-zA-Z0-9\-_]+)/,
        className: 'text-purple-400 font-medium',
    },
    MUST: {
      regex: /\bMUST\b/,
      className: 'text-orange-500 font-bold',
    },
    ASK: {
      regex: /\bASK\b/,
      className: 'text-orange-500 font-bold',
    },
    CODE_BLOCK_DELIMITER: {
      regex: /(```\w*)/,
      className: 'text-cyan-400',
    }
  },

  highlight(line: string, inCodeBlock: boolean, isCursorOnLine?: boolean): (string | JSX.Element)[] | JSX.Element {
    if (inCodeBlock) {
      return <span className="font-code text-slate-400">{line}</span>;
    }

    if (this.rules.VALID_SECTION.test(line)) {
      if (isCursorOnLine) {
        return <strong className={this.rules.VALID_SECTION.className}>{line}</strong>;
      }
      const sectionText = line.replace(/^\s*##+\s*/, '');
      return <strong className={this.rules.VALID_SECTION.className}>{sectionText}</strong>;
    } else if (this.rules.INVALID_SECTION.test(line)) {
      return <span className={this.rules.INVALID_SECTION.className}>{line}</span>;
    } else {
      const parts = line.split(/(<.*?>|@[a-zA-Z0-9\-_]+|```\w*|\bMUST\b|\bASK\b)/g);
      return parts.map((part, i) =>
        {
            if (!part) return null;
            if (this.rules.CODE_BLOCK_DELIMITER.regex.test(part)) {
                return (
                    <span key={i} className={this.rules.CODE_BLOCK_DELIMITER.className}>
                    {part}
                    </span>
                );
            }
            if (this.rules.PLACEHOLDER.regex.test(part)) {
                return (
                    <span key={i} className={this.rules.PLACEHOLDER.className}>
                    {part}
                    </span>
                );
            } else if (this.rules.TOOL.regex.test(part)) {
                return (
                    <span key={i} className={this.rules.TOOL.className}>
                    {part}
                    </span>
                );
            } else if (part === 'MUST' || part === 'ASK') {
                return (
                    <span key={i} className={this.rules.MUST.className}>
                    {part}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        }
      );
    }
  },
};


type PromptEditorProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSave: () => void;
  isDirty: boolean;
  isSaving?: boolean;
  onBlur?: () => void;
  tools?: Tool[];
};

export default function PromptEditor({ prompt, onPromptChange, onSave, isDirty, isSaving, onBlur, tools = [] }: PromptEditorProps) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullScreenHighlighterRef = useRef<HTMLDivElement>(null);
  const fullScreenTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionType, setSuggestionType] = useState<'section' | 'tool' | null>(null);
  const [cursorLine, setCursorLine] = useState<number | null>(null);
  const [fullScreenCursorLine, setFullScreenCursorLine] = useState<number | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { toast } = useToast();
  const [correctionResult, executeCorrection] = useMutation(CorrectSpellingMutation);

  const updateCursorLine = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const textUpToCursor = textarea.value.substring(0, textarea.selectionStart);
      const currentLine = textUpToCursor.split('\n').length - 1;
      setCursorLine(currentLine);
    }
  }, []);

  const updateFullScreenCursorLine = useCallback(() => {
    const textarea = fullScreenTextareaRef.current;
    if (textarea) {
      const textUpToCursor = textarea.value.substring(0, textarea.selectionStart);
      const currentLine = textUpToCursor.split('\n').length - 1;
      setFullScreenCursorLine(currentLine);
    }
  }, []);

  const handleCorrectSpelling = async () => {
    if (!prompt.trim()) {
        toast({
            variant: "destructive",
            title: "Cannot correct spelling",
            description: "Prompt content cannot be empty.",
        });
        return;
    }

    const result = await executeCorrection({ text: prompt });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error correcting spelling",
        description: result.error.message,
      });
    } else if (result.data?.correctSpelling) {
      onPromptChange(result.data.correctSpelling);
      toast({
        title: "Prompt corrected",
        description: "The prompt has been updated with spelling corrections.",
      });
    }
  };

  const handleScroll = () => {
    if (highlighterRef.current && textareaRef.current) {
      highlighterRef.current.scrollTop = textareaRef.current.scrollTop;
      highlighterRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (showAutocomplete) {
      setShowAutocomplete(false);
    }
  };

  const handleFullScreenScroll = () => {
    if (fullScreenHighlighterRef.current && fullScreenTextareaRef.current) {
      fullScreenHighlighterRef.current.scrollTop = fullScreenTextareaRef.current.scrollTop;
      fullScreenHighlighterRef.current.scrollLeft = fullScreenTextareaRef.current.scrollLeft;
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const currentPrompt = prompt;
    let newPrompt = '';
    let newCursorPosition = 0;

    if (suggestionType === 'section') {
        const textBeforeTrigger = currentPrompt.substring(0, cursorPosition - 2);
        const textAfterCursor = currentPrompt.substring(cursorPosition);
        newPrompt = `${textBeforeTrigger}## ${suggestion} ${textAfterCursor}`;
        newCursorPosition = `${textBeforeTrigger}## ${suggestion} `.length;
    } else if (suggestionType === 'tool') {
        const textBeforeCursor = currentPrompt.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/@(\w*)$/);
        if (match) {
            const atIndex = match.index as number;
            const textBeforeTrigger = currentPrompt.substring(0, atIndex);
            const textAfterCursor = currentPrompt.substring(cursorPosition);
            newPrompt = `${textBeforeTrigger}@${suggestion}()${textAfterCursor}`;
            newCursorPosition = `${textBeforeTrigger}@${suggestion}(`.length;
        } else {
            newPrompt = currentPrompt;
            newCursorPosition = cursorPosition;
        }
    }
    
    onPromptChange(newPrompt);
    setShowAutocomplete(false);
    setSuggestionType(null);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions[activeIndex]) {
          handleSuggestionSelect(suggestions[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        setSuggestionType(null);
      }
    }
    setTimeout(updateCursorLine, 0);
  };
  
  const handleFullScreenKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setTimeout(updateFullScreenCursorLine, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onPromptChange(value);
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);

    const calculatePositionAndShow = (suggestions: string[], type: 'section' | 'tool') => {
        if (suggestions.length > 0) {
            setSuggestions(suggestions);
            setSuggestionType(type);
            const textarea = textareaRef.current;
            if (textarea) {
              const mirrorDiv = document.createElement('div');
              const computedStyle = window.getComputedStyle(textarea);

              mirrorDiv.style.position = 'absolute';
              mirrorDiv.style.visibility = 'hidden';
              mirrorDiv.style.whiteSpace = 'pre-wrap';
              mirrorDiv.style.wordWrap = 'break-word';
              mirrorDiv.style.width = computedStyle.width;
              mirrorDiv.style.padding = computedStyle.padding;
              mirrorDiv.style.font = computedStyle.font;
              mirrorDiv.style.lineHeight = computedStyle.lineHeight;

              const container = textarea.parentElement;
              if (container) {
                container.appendChild(mirrorDiv);
                mirrorDiv.textContent = textarea.value.substring(0, cursorPosition);
                const span = document.createElement('span');
                span.textContent = '.';
                mirrorDiv.appendChild(span);

                const top = span.offsetTop - textarea.scrollTop;
                const left = span.offsetLeft - textarea.scrollLeft;
                const lineHeight = span.offsetHeight;

                setAutocompletePosition({ top: top + lineHeight + 8, left: left });
                container.removeChild(mirrorDiv);
              }
            }
            setShowAutocomplete(true);
            setActiveIndex(0);
        } else {
            setShowAutocomplete(false);
            setSuggestionType(null);
        }
    };
    
    if (textBeforeCursor.endsWith('##')) {
      const allSuggestions = ["Skill", "UseCase", "Description", "Context", "Solution", "Alternative Solution", "Steps"];
      const availableSuggestions = allSuggestions.filter(
        (suggestion) => !value.includes(`## ${suggestion}`)
      );
      calculatePositionAndShow(availableSuggestions, 'section');
    } else if (/@(\w*)$/.test(textBeforeCursor)) {
        const match = textBeforeCursor.match(/@(\w*)$/);
        if (match) {
            const query = match[1];
            const toolSuggestions = tools
                .map(t => t.name)
                .filter(name => name.toLowerCase().startsWith(query.toLowerCase()));
            
            calculatePositionAndShow(toolSuggestions, 'tool');
        }
    } else {
      setShowAutocomplete(false);
      setSuggestionType(null);
    }
    updateCursorLine();
  };

  const handleFullScreenTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(e.target.value);
    updateFullScreenCursorLine();
  };


  const handleFocus = () => {
    updateCursorLine();
  };
  
  const handleFullScreenFocus = () => {
    updateFullScreenCursorLine();
  };

  const handleBlur = () => {
    setCursorLine(null);
    onBlur?.();
  };
  
  const handleFullScreenBlur = () => {
    setFullScreenCursorLine(null);
  };

  const highlightedPrompt = useMemo(() => {
    const lines = prompt.split('\n');
    let inCodeBlock = false;
    return lines.map((line, index) => {
      const isDelimiter = line.trim().startsWith('```');
      const isCursorOnThisLine = index === cursorLine;
      const content = PromptHighlighter.highlight(line, inCodeBlock && !isDelimiter, isCursorOnThisLine);
      if (isDelimiter) {
        inCodeBlock = !inCodeBlock;
      }
      return (
        <React.Fragment key={index}>
          {content}
          {index < lines.length - 1 ? '\n' : ''}
        </React.Fragment>
      );
    });
  }, [prompt, cursorLine]);

  const highlightedFullScreenPrompt = useMemo(() => {
    const lines = prompt.split('\n');
    let inCodeBlock = false;
    return lines.map((line, index) => {
      const isDelimiter = line.trim().startsWith('```');
      const isCursorOnThisLine = index === fullScreenCursorLine;
      const content = PromptHighlighter.highlight(line, inCodeBlock && !isDelimiter, isCursorOnThisLine);
      if (isDelimiter) {
        inCodeBlock = !inCodeBlock;
      }
      return (
        <React.Fragment key={index}>
          {content}
          {index < lines.length - 1 ? '\n' : ''}
        </React.Fragment>
      );
    });
  }, [prompt, fullScreenCursorLine]);

  return (
    <>
      <Card className="h-full w-full flex flex-col border-0 bg-transparent shadow-none">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Skill Prompt</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Info className="h-4 w-4" />
                      <span className="sr-only">Prompt Info</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="grid gap-2 text-sm max-w-xs">
                      <p className="font-semibold">Prompt Structure Guide</p>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">## Skill</code>
                        <p className="text-muted-foreground">The name of the skill being defined.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">## UseCase</code>
                        <p className="text-muted-foreground">The unique identifier for the use case.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">## Description</code>
                        <p className="text-muted-foreground">The description of the use case, i.e. problem the user is facing.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">## Context</code>
                        <p className="text-muted-foreground">Additional context or background information for the use case.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">## Solution</code>
                        <p className="text-muted-foreground">How the assistant should behave and respond to the user.</p>
                      </div>
                       <div>
                        <code className="font-mono bg-muted px-1 rounded">## Alternative Solution</code>
                        <p className="text-muted-foreground">An alternative way the assistant can respond.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">## Steps</code>
                        <p className="text-muted-foreground">A list of steps to perform. Each step should define a turn in the conversation.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded">@tool-name</code>
                        <p className="text-muted-foreground">Mention a tool to make it available to the assistant.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded text-orange-500 font-bold">MUST</code>
                        <p className="text-muted-foreground">The MUST keyword can be used to re-enforce important instructions.</p>
                      </div>
                      <div>
                        <code className="font-mono bg-muted px-1 rounded text-orange-500 font-bold">ASK</code>
                        <p className="text-muted-foreground">The ASK keyword can be used to emphasize crucial clarifying questions.</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={handleCorrectSpelling}
                              disabled={correctionResult.fetching}
                          >
                              {correctionResult.fetching ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                  <Wand2 className="h-4 w-4" />
                              )}
                              <span className="sr-only">Correct Spelling</span>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                          <p>Correct Spelling</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setIsFullScreen(true)}
                        >
                            <Expand className="h-4 w-4" />
                            <span className="sr-only">Full Screen</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>Full Screen</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="sr-only">Save</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Save</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1">
          <div className="relative h-full bg-slate-950 text-slate-50 rounded-lg overflow-hidden border">
            <div
              ref={highlighterRef}
              className="absolute inset-0 z-10 px-3 py-2 font-mono text-sm rounded-lg whitespace-pre-wrap pointer-events-none overflow-auto no-scrollbar"
              aria-hidden="true"
            >
              {highlightedPrompt}
              {' '}
            </div>
            <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onClick={updateCursorLine}
                placeholder="Enter your prompt here..."
                className="relative w-full h-full resize-none font-mono text-sm rounded-lg bg-transparent text-transparent caret-white"
              />
              <PopoverTrigger asChild>
                <div
                  style={{
                    position: 'absolute',
                    ...autocompletePosition,
                    width: 0,
                    height: 0,
                  }}
                />
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-1"
                onOpenAutoFocus={(e) => e.preventDefault()}
                sideOffset={5}
                align="start"
              >
                <ul className="p-1">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={`${suggestion}-${index}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionSelect(suggestion);
                      }}
                      className={cn(
                        'p-2 text-sm rounded-sm cursor-pointer hover:bg-accent',
                        index === activeIndex && 'bg-accent'
                      )}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0 bg-slate-900 text-slate-50">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Skill Prompt</DialogTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                        variant="ghost"
                        size="icon"
                    >
                        {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                        <Save className="h-4 w-4" />
                        )}
                        <span className="sr-only">Save Changes</span>
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Save Changes</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogHeader>
          <div className="relative flex-1 overflow-hidden">
            <div
                ref={fullScreenHighlighterRef}
                className="absolute inset-0 z-10 px-6 py-4 font-mono text-sm whitespace-pre-wrap pointer-events-none overflow-auto no-scrollbar"
                aria-hidden="true"
            >
                {highlightedFullScreenPrompt}
                {' '}
            </div>
            <Textarea
                ref={fullScreenTextareaRef}
                value={prompt}
                onChange={handleFullScreenTextChange}
                onScroll={handleFullScreenScroll}
                onKeyDown={handleFullScreenKeyDown}
                onBlur={handleFullScreenBlur}
                onFocus={handleFullScreenFocus}
                onClick={updateFullScreenCursorLine}
                placeholder="Enter your prompt here..."
                className="relative w-full h-full resize-none font-mono text-sm bg-transparent text-transparent caret-white p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-6 py-4"
                spellCheck="false"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
