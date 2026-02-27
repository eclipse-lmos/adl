'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import { useQuery, useMutation } from 'urql';
import { Bot, Loader2, Send } from 'lucide-react';
import AppHeader from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConversationMessage from '@/components/conversation-message';
import { ListPromptsQuery, RolePromptsQuery } from '@/lib/graphql/queries';
import { AssistantMutation } from '@/lib/graphql/mutations';
import type { Message, ToolCall } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
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
  selectedPrompt
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
  selectedPrompt: string | null;
}) => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b p-4 light:bg-white">
          <Select
            onValueChange={(value) => onRoleChange(value === 'none' ? null : value)}
            value={selectedRole || 'none'}
          >
            <SelectTrigger className="w-full max-w-sm mx-auto">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Role</SelectItem>
              {roles.map((role: any) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  <div className="flex-1 rounded-lg border p-4 text-sm bg-card flex items-center gap-2 light:bg-white">
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
              disabled={isThinking || !selectedPrompt}
            />
            <Button type="submit" size="icon" disabled={isThinking || !input.trim() || !selectedPrompt}>
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
  const conversationIdRef = useRef<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [_isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const [listResult] = useQuery({ 
    query: ListPromptsQuery, 
    variables: { term: '' },
    pause: !mounted 
  });
  const prompts = listResult.data?.list || [];
  
  const [rolesResult] = useQuery({ 
    query: RolePromptsQuery,
    pause: !mounted
  });
  const roles = rolesResult.data?.rolePrompts || [];

  const [_assistantResult, executeAssistantMutation] = useMutation(AssistantMutation);

  const selectedPrompt = useMemo(() => {
    if (prompts.length > 0) return prompts[0].id;
    return null;
  }, [prompts]);

  useEffect(() => {
    startTransition(() => {
      conversationIdRef.current = `conv-${Date.now()}`;
      setMessages([]);
    });
  }, [selectedPrompt, selectedRole]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        // A bit of a hack to get the viewport. The component is a div wrapping the viewport.
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const sendMessage = useCallback((currentMessages: Message[]) => {
    if (!selectedPrompt) {
      toast({
        variant: 'destructive',
        title: 'No prompt available',
        description: 'Please create a prompt to start the conversation.',
      });
      return;
    }

    const systemContext = [];
    if (selectedRole) {
        systemContext.push({ key: 'role', value: selectedRole });
    }
    
    setIsThinking(true);
    const request = {
      messages: currentMessages.map(({ role, content, format }) => ({ role, content, format })),
      userContext: { profile: [] },
      systemContext: systemContext,
      conversationContext: { conversationId: conversationIdRef.current },
    };

    executeAssistantMutation({ input: { useCasesId: selectedPrompt, request } }).then(({ data, error }) => {
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
                toolCallMessage.context = context;
            }
            setMessages((prev) => [...prev, toolCallMessage]);
        }
      }
    });
  }, [executeAssistantMutation, selectedPrompt, toast, selectedRole]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: input, format: 'text' }];
    setMessages(newMessages);
    sendMessage(newMessages);
    setInput('');
  };
  

  return (
    <div className="flex h-screen w-full flex-col bg-background light:bg-gray-100">
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
              selectedPrompt={selectedPrompt}
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
