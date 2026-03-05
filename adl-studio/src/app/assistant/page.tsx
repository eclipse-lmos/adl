'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import { useQuery, useMutation } from 'urql';
import { Bot, Loader2, Send, RotateCcw, Trash2, Flag, Plus, X, Settings2 } from 'lucide-react';
import AppHeader from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConversationMessage from '@/components/conversation-message';
import { ListPromptsQuery, RolePromptsQuery, TagsQuery } from '@/lib/graphql/queries';
import { AssistantMutation } from '@/lib/graphql/mutations';
import type { Message, ToolCall } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import TagManager from '@/components/tag-manager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import EventsPanel from '@/components/events-panel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

type Variable = {
  key: string;
  value: string;
};

const ConditionalsManager = ({ 
  conditionals, 
  onConditionalsChange 
}: { 
  conditionals: string[], 
  onConditionalsChange: (c: string[]) => void 
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const name = inputValue.trim().toLowerCase();
    if (name.startsWith('is_')) {
      if (!conditionals.includes(name)) {
        onConditionalsChange([...conditionals, name]);
      }
      setInputValue('');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="mr-2 h-4 w-4" />
          Conditionals ({conditionals.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="grid gap-4">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">System Conditionals</h4>
            <p className="text-xs text-muted-foreground">
              Conditionals must start with is_
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="e.g. is_business"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-8"
            />
            <Button 
              size="sm" 
              onClick={handleAdd} 
              disabled={!inputValue.trim().toLowerCase().startsWith('is_')} 
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {conditionals.map(c => (
              <Badge key={c} variant="secondary" className="flex items-center gap-1 py-0.5 px-2">
                {c}
                <button onClick={() => onConditionalsChange(conditionals.filter(i => i !== c))} className="rounded-full hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {conditionals.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">No conditionals set</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const VariablesManager = ({
  variables,
  onVariablesChange
}: {
  variables: Variable[],
  onVariablesChange: (v: Variable[]) => void
}) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (trimmedKey && trimmedValue) {
      const existing = variables.findIndex(v => v.key === trimmedKey);
      if (existing !== -1) {
        const updated = [...variables];
        updated[existing] = { key: trimmedKey, value: trimmedValue };
        onVariablesChange(updated);
      } else {
        onVariablesChange([...variables, { key: trimmedKey, value: trimmedValue }]);
      }
      setKey('');
      setValue('');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Variables ({variables.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="grid gap-4">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">System Variables</h4>
            <p className="text-xs text-muted-foreground">
              Add key-value pairs to the system context.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="h-8"
            />
            <Input
              placeholder="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-8"
            />
          </div>
          <Button 
            size="sm" 
            onClick={handleAdd} 
            disabled={!key.trim() || !value.trim()}
            className="w-full h-8"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add/Update Variable
          </Button>
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {variables.map(v => (
              <div key={v.key} className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-secondary text-xs">
                <div className="flex flex-col truncate">
                  <span className="font-bold opacity-70">{v.key}</span>
                  <span className="truncate">{v.value}</span>
                </div>
                <button 
                  onClick={() => onVariablesChange(variables.filter(i => i.key !== v.key))} 
                  className="rounded-full hover:bg-muted-foreground/20 p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {variables.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center">No variables set</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ChatPanel = ({
  selectedRole,
  onRoleChange,
  roles,
  messages,
  isThinking,
  scrollAreaRef,
  onFormSubmit,
  input,
  onInputChange,
  selectedTags,
  onTagsChange,
  onClear,
  onReplay,
  availableTags,
  conditionals,
  onConditionalsChange,
  variables,
  onVariablesChange
}: {
  selectedRole: string | null;
  onRoleChange: (value: string | null) => void;
  roles: any[];
  messages: Message[];
  isThinking: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onFormSubmit: (e: React.FormEvent) => void;
  input: string;
  onInputChange: (value: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClear: () => void;
  onReplay: () => void;
  availableTags: string[];
  conditionals: string[];
  onConditionalsChange: (c: string[]) => void;
  variables: Variable[];
  onVariablesChange: (v: Variable[]) => void;
}) => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b p-4 bg-background light:bg-white flex items-center justify-center gap-4">
          <Select
            onValueChange={(value) => onRoleChange(value === 'none' ? null : value)}
            value={selectedRole || 'none'}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Role</SelectItem>
              {roles.map((role: any) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <TagManager tags={selectedTags} onTagsChange={onTagsChange} availableTags={availableTags} />
          
          <ConditionalsManager conditionals={conditionals} onConditionalsChange={onConditionalsChange} />

          <VariablesManager variables={variables} onVariablesChange={onVariablesChange} />

          <div className="flex items-center gap-2 border-l pl-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onReplay} 
                    disabled={isThinking || messages.length === 0}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Replay Conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onClear} 
                    disabled={isThinking || messages.length === 0}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {messages.length === 0 && !isThinking ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4 rounded-lg">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Assistant</h2>
              <p className="mt-1 text-muted-foreground">Start a conversation to begin.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
              {messages.map((message, index) => (
                <ConversationMessage key={index} message={message} />
              ))}
              {isThinking && (
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1 rounded-lg border p-4 text-sm bg-card flex items-center gap-2 light:bg-white shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="border-t bg-background p-4 md:p-6 light:bg-white">
          <form onSubmit={onFormSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type a message..."
              disabled={isThinking}
              className="bg-background"
            />
            <Button type="submit" size="icon" disabled={isThinking || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
    </div>
  );
};


export default function AssistantPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [conditionals, setConditionals] = useState<string[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const conversationIdRef = useRef<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [_isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const [rolesResult] = useQuery({ 
    query: RolePromptsQuery,
    pause: !mounted
  });
  const roles = rolesResult.data?.rolePrompts || [];

  const [tagsResult] = useQuery({
    query: TagsQuery,
    pause: !mounted
  });
  const availableTags = tagsResult.data?.tags || [];

  const [_assistantResult, executeAssistantMutation] = useMutation(AssistantMutation);

  useEffect(() => {
    startTransition(() => {
      conversationIdRef.current = `conv-${Date.now()}`;
      setMessages([]);
    });
  }, [selectedRole]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const sendMessage = useCallback((currentMessages: Message[]) => {
    const systemContext = [];
    if (selectedRole) {
        systemContext.push({ key: 'role', value: selectedRole });
    }
    conditionals.forEach(c => {
        systemContext.push({ key: c, value: 'true' });
    });
    variables.forEach(v => {
        systemContext.push({ key: v.key, value: v.value });
    });
    
    setIsThinking(true);
    const request = {
      messages: currentMessages.map(({ role, content, format }) => ({ role, content, format })),
      userContext: { profile: [] },
      systemContext: systemContext,
      conversationContext: { conversationId: conversationIdRef.current },
    };

    executeAssistantMutation({ 
      input: { 
        tags: selectedTags,
        request 
      } 
    }).then(({ data, error }) => {
      setIsThinking(false);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error getting assistant response',
          description: error.message,
        });
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.', format: 'text' }]);
      } else if (data?.assistant) {
        const newMessages: Message[] = (data.assistant.messages || []).map(
            ({ __typename, ...rest }: any) => rest
        );
        const context = data.assistant.context?.map(
            ({ __typename, ...rest }: any) => rest
        );
        const toolCalls: ToolCall[] | undefined = data.assistant.toolCalls?.map(
            ({ __typename, ...rest }: any) => rest
        );

        if (newMessages.length > 0) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
                if (context && context.length > 0) {
                    lastMessage.context = context;
                }
                if (toolCalls && toolCalls.length > 0) {
                    lastMessage.toolCalls = toolCalls;
                }
            }
            setMessages((prev) => [...prev, ...newMessages]);
        } else if (toolCalls && toolCalls.length > 0) {
            const toolCallMessage: Message = {
                role: 'assistant',
                content: '',
                format: 'text',
                toolCalls: toolCalls,
            };
            if (context && context.length > 0) {
                toolCallMessage.context = toolCallMessage.context || [];
                toolCallMessage.context.push(...context!);
            }
            setMessages((prev) => [...prev, toolCallMessage]);
        }
      }
    });
  }, [executeAssistantMutation, toast, selectedRole, selectedTags, conditionals, variables]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: input, format: 'text' }];
    setMessages(newMessages);
    sendMessage(newMessages);
    setInput('');
  };

  const handleClearConversation = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = `conv-${Date.now()}`;
    setInput('');
    toast({
      title: "Conversation cleared",
      description: "Starting a fresh session.",
    });
  }, [toast]);

  const handleReplayConversation = useCallback(async () => {
    if (messages.length === 0 || isThinking) return;
    
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      handleClearConversation();
      return;
    }

    setMessages([]);
    setIsThinking(true);
    conversationIdRef.current = `conv-${Date.now()}`;
    
    toast({
      title: "Replaying conversation",
      description: "Rebuilding session turn-by-turn.",
    });

    let currentHistory: Message[] = [];

    for (const userMsg of userMessages) {
      const nextTurn = [...currentHistory, { ...userMsg }];
      currentHistory = nextTurn;
      setMessages([...currentHistory]);

      const systemContext = [];
      if (selectedRole) {
          systemContext.push({ key: 'role', value: selectedRole });
      }
      conditionals.forEach(c => {
          systemContext.push({ key: c, value: 'true' });
      });
      variables.forEach(v => {
          systemContext.push({ key: v.key, value: v.value });
      });

      const request = {
        messages: currentHistory.map(({ role, content, format }) => ({ role, content, format })),
        userContext: { profile: [] },
        systemContext: systemContext,
        conversationContext: { conversationId: conversationIdRef.current },
      };

      const { data, error } = await executeAssistantMutation({ 
        input: { 
          tags: selectedTags,
          request 
        } 
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error during replay',
          description: error.message,
        });
        const errorMsg: Message = { role: 'assistant', content: 'Sorry, I encountered an error during replay.', format: 'text' };
        currentHistory = [...currentHistory, errorMsg];
        setMessages([...currentHistory]);
        break; 
      }

      if (data?.assistant) {
        const newAssistantMessages: Message[] = (data.assistant.messages || []).map(
            ({ __typename, ...rest }: any) => rest
        );
        const context = data.assistant.context?.map(
            ({ __typename, ...rest }: any) => rest
        );
        const toolCalls: ToolCall[] | undefined = data.assistant.toolCalls?.map(
            ({ __typename, ...rest }: any) => rest
        );

        if (newAssistantMessages.length > 0) {
            const lastMessage = newAssistantMessages[newAssistantMessages.length - 1];
            if (lastMessage.role === 'assistant') {
                if (context && context.length > 0) lastMessage.context = context;
                if (toolCalls && toolCalls.length > 0) lastMessage.toolCalls = toolCalls;
            }
            currentHistory = [...currentHistory, ...newAssistantMessages];
        } else if (toolCalls && toolCalls.length > 0) {
            const toolCallMessage: Message = {
                role: 'assistant',
                content: '',
                format: 'text',
                toolCalls: toolCalls,
            };
            if (context && context.length > 0) {
              toolCallMessage.context = context;
            }
            currentHistory = [...currentHistory, toolCallMessage];
        }
        setMessages([...currentHistory]);
      }
    }
    
    setIsThinking(false);
  }, [messages, isThinking, handleClearConversation, selectedRole, selectedTags, conditionals, variables, executeAssistantMutation, toast]);
  

  return (
    <div className="flex h-screen w-full flex-col bg-background light:bg-muted/30">
      <AppHeader />
      <main className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={75}>
            <ChatPanel 
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              roles={roles}
              messages={messages}
              isThinking={isThinking}
              scrollAreaRef={scrollAreaRef}
              onFormSubmit={handleFormSubmit}
              input={input}
              onInputChange={setInput}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              onClear={handleClearConversation}
              onReplay={handleReplayConversation}
              availableTags={availableTags}
              conditionals={conditionals}
              onConditionalsChange={setConditionals}
              variables={variables}
              onVariablesChange={setVariables}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25}>
            <div className="h-full p-4">
              <EventsPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
