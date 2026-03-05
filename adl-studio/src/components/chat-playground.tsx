
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from 'urql';
import { Bot, User, Loader2, Send, Save, Pencil, Trash2, Plus, RefreshCcw, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Message, ChatHistoryItem, TestCase, ToolCall } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AssistantMutation } from '@/lib/graphql/mutations';
import ConversationMessage from '@/components/conversation-message';

type ChatPlaygroundProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  useCaseId: string;
  prompt: string;
  utterance: string | null;
  historyItem: ChatHistoryItem | null;
  onSaveHistory: (item: Omit<ChatHistoryItem, 'id' | 'timestamp' | 'messages' | 'prompt'>, messages: Message[], prompt: string) => void;
  onSaveAsTest: (testCase: Pick<TestCase, 'name' | 'description' | 'expectedConversation'>) => void;
};


function SaveTestDialog({
  isOpen,
  onOpenChange,
  onSaveTest,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveTest: (name: string, description: string) => void;
}) {
  const [testCaseName, setTestCaseName] = useState('');
  const [testCaseDescription, setTestCaseDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setTestCaseName('');
      setTestCaseDescription('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!testCaseName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name is required',
        description: 'Please provide a name for the test case.',
      });
      return;
    }
    onSaveTest(testCaseName, testCaseDescription);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Test Case</DialogTitle>
          <DialogDescription>
            This will save the current conversation as a new test case.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={testCaseName}
              onChange={(e) => setTestCaseName(e.target.value)}
              placeholder="e.g. Successful password reset"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={testCaseDescription}
              onChange={(e) => setTestCaseDescription(e.target.value)}
              placeholder="e.g. Test for when user provides correct info"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!testCaseName.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChatMessagesList({
  messages,
  isThinking,
  isEditing,
  onMessageChange,
  onRemoveMessage,
  onRoleChange,
}: {
  messages: Message[];
  isThinking: boolean;
  isEditing: boolean;
  onMessageChange: (index: number, content: string) => void;
  onRemoveMessage: (index: number) => void;
  onRoleChange: (index: number, role: 'user' | 'assistant') => void;
}) {
  return (
    <ScrollArea className="flex-1 pr-4 -mr-4">
      <div className="space-y-6 pr-4">
        {messages.map((message, index) => (
          <ConversationMessage
            key={index}
            message={message}
            isEditing={isEditing}
            onContentChange={(content) => onMessageChange(index, content)}
            onRemove={() => onRemoveMessage(index)}
            onRoleChange={(role) => onRoleChange(index, role)}
          />
        ))}
        {isThinking && !isEditing && (
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 rounded-lg border p-4 text-sm bg-card flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ChatMessageInput({
  onSubmit,
  isThinking,
  onRegenerate,
  canRegenerate,
}: {
  onSubmit: (message: string) => void;
  isThinking: boolean;
  onRegenerate: () => void;
  canRegenerate: boolean;
}) {
  const [input, setInput] = useState('');
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input);
    setInput('');
  };

  const handleRegenerateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onRegenerate();
  }

  return (
    <div className="border-t pt-4 mt-4">
      <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isThinking}
        />
        <Button type="submit" size="icon" disabled={isThinking || !input.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRegenerateClick} disabled={!canRegenerate || isThinking}>
            <RefreshCcw className="h-4 w-4" />
            <span className="sr-only">Regenerate response</span>
        </Button>
      </form>
    </div>
  );
}

export default function ChatPlayground({
  isOpen,
  onOpenChange,
  useCaseId,
  prompt,
  utterance,
  historyItem,
  onSaveHistory,
  onSaveAsTest,
}: ChatPlaygroundProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const { toast } = useToast();
  const [isSaveTestDialogOpen, setIsSaveTestDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const conversationIdRef = useRef<string>('');

  const [_assistantResult, executeAssistantMutation] = useMutation(AssistantMutation);

  const sendMessage = useCallback((currentMessages: Message[]) => {
      setIsThinking(true);
      const request = {
        messages: currentMessages.map(({ role, content, format }) => ({ role, content, format })),
        userContext: { profile: [] },
        systemContext: [],
        conversationContext: { conversationId: conversationIdRef.current },
      };

      executeAssistantMutation({ input: { useCasesId: useCaseId, request } }).then(({ data, error }) => {
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
    }, [executeAssistantMutation, useCaseId, toast]
  );

  const handleUserSubmit = useCallback((messageContent: string) => {
      const newMessages: Message[] = [...messages, { role: 'user', content: messageContent, format: 'text' }];
      setMessages(newMessages);
      sendMessage(newMessages);
    }, [messages, sendMessage]
  );
  
  useEffect(() => {
    if (isOpen) {
      conversationIdRef.current = `conv-${Date.now()}`;
      if (historyItem) {
        setMessages(historyItem.messages);
        setIsThinking(false);
      } else if (utterance) {
        const initialMessages: Message[] = [{ role: 'user', content: utterance, format: 'text' }];
        setMessages(initialMessages);
        sendMessage(initialMessages);
      } else {
        setMessages([]);
        setIsThinking(false);
      }
      setIsEditing(false); // Reset edit mode on open
    }
  }, [isOpen, utterance, historyItem, sendMessage]);

  const handleOpenChange = (open: boolean) => {
    if (!open && messages.length > 0 && !historyItem && !isEditing) {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const firstAssistantMessage = messages.find((m) => m.role === 'assistant');

      if (firstUserMessage && firstAssistantMessage) {
        onSaveHistory(
          {
            utterance: firstUserMessage.content,
            useCaseId: useCaseId,
            modelResponse: firstAssistantMessage.content,
          },
          messages,
          prompt
        );
      }
    }
    onOpenChange(open);
  };
  
  const handleSaveTest = (name: string, description: string) => {
    onSaveAsTest({
      name,
      description,
      expectedConversation: messages,
    });
    setIsSaveTestDialogOpen(false);
    toast({
      title: 'Test Case Saved',
      description: `"${name}" has been added to your test cases.`,
    });
  };

  const handleMessageChange = (index: number, content: string) => {
    const newMessages = [...messages];
    newMessages[index].content = content;
    setMessages(newMessages);
  };

  const handleRemoveMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddMessage = () => {
    setMessages(prev => [...prev, { role: 'user', content: '', format: 'text' }]);
  };

  const handleRoleChange = (index: number, role: 'user' | 'assistant') => {
    const newMessages = [...messages];
    newMessages[index].role = role;
    setMessages(newMessages);
  };

  const handleRegenerateResponse = useCallback(async () => {
    if (isThinking) return;

    const userMessages = messages.filter((m) => m.role === 'user');

    if (userMessages.length === 0) {
      toast({
        variant: 'default',
        title: 'Nothing to regenerate',
        description: 'No user messages to replay.',
      });
      return;
    }

    setIsThinking(true);
    let conversationHistory: Message[] = [];
    setMessages(conversationHistory); // Clear the board

    const conversationIdForRegen = `conv-${Date.now()}`;

    for (const userMessage of userMessages) {
      conversationHistory = [...conversationHistory, userMessage];
      setMessages([...conversationHistory]); // Show user message

      const request = {
        messages: conversationHistory.map(({ role, content, format }) => ({
          role,
          content,
          format,
        })),
        userContext: { profile: [] },
        systemContext: [],
        conversationContext: { conversationId: conversationIdForRegen },
      };

      // Await the response
      const { data, error } = await executeAssistantMutation({
        input: { useCasesId: useCaseId, request },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error getting assistant response',
          description: error.message,
        });
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Sorry, I encountered an error.',
          format: 'text',
        };
        conversationHistory = [...conversationHistory, errorMessage];
        setMessages([...conversationHistory]);
        break; // Stop regeneration on error
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
        
        let newHistory = [...conversationHistory];
        if (newMessages.length > 0) {
            const lastAssistantMessage = newMessages[newMessages.length - 1];
            if (lastAssistantMessage.role === 'assistant') {
                if (context && context.length > 0) {
                    lastAssistantMessage.context = context;
                }
                if (toolCalls && toolCalls.length > 0) {
                    lastAssistantMessage.toolCalls = toolCalls;
                }
            }
            newHistory.push(...newMessages);
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
            newHistory.push(toolCallMessage);
        }

        conversationHistory = newHistory;
        setMessages([...conversationHistory]); // Show assistant response
      }
    }

    setIsThinking(false);
  }, [isThinking, messages, useCaseId, executeAssistantMutation, toast]);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Chat Playground</SheetTitle>
            <div className="flex items-center gap-2 relative right-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={messages.length === 0 || isEditing}
                onClick={() => setIsSaveTestDialogOpen(true)}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Test Case
              </Button>
            </div>
          </div>
          <SheetDescription>
            {isEditing 
              ? 'Add, edit, or remove messages in the conversation.'
              : 'Test your Skill prompt with a sample utterance.'
            }
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          <ChatMessagesList
            messages={messages}
            isThinking={isThinking}
            isEditing={isEditing}
            onMessageChange={handleMessageChange}
            onRemoveMessage={handleRemoveMessage}
            onRoleChange={handleRoleChange}
          />
          {isEditing ? (
            <div className="border-t pt-4 mt-4 space-y-2">
                <Button onClick={handleAddMessage} className="w-full" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add Message
                </Button>
            </div>
          ) : (
            <ChatMessageInput
              onSubmit={handleUserSubmit}
              isThinking={isThinking}
              onRegenerate={handleRegenerateResponse}
              canRegenerate={!isThinking && messages.some(m => m.role === 'user')}
            />
          )}
        </div>
        <SaveTestDialog
          isOpen={isSaveTestDialogOpen}
          onOpenChange={setIsSaveTestDialogOpen}
          onSaveTest={handleSaveTest}
        />
      </SheetContent>
    </Sheet>
  );
}
