'use client';

import { Bot, User, Trash2, FileText, Wand2, ShieldCheck, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { badgeVariants } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Message } from '@/lib/data';
import { cn } from '@/lib/utils';

type ConversationMessageProps = {
    message: Message;
    isEditing?: boolean;
    onContentChange?: (content: string) => void;
    onRemove?: () => void;
    onRoleChange?: (role: 'user' | 'assistant') => void;
};

export default function ConversationMessage({
  message,
  isEditing = false,
  onContentChange = () => {},
  onRemove = () => {},
  onRoleChange = () => {},
}: ConversationMessageProps) {
  const isUser = message.role === 'user';
  const useCaseContext = message.context?.find(c => c.key === 'useCase');
  const useCaseContentContext = message.context?.find(c => c.key === 'useCaseContent');
  const contextContext = message.context?.find(c => c.key === 'context');
  const complianceContext = message.context?.find(c => c.key === 'compliance');
  
  const excludedKeys = ['useCase', 'useCaseContent', 'compliance', 'context'];
  const otherContext = message.context?.filter(c => !excludedKeys.includes(c.key));
  const toolCalls = message.toolCalls;
  
  const AvatarComponent = () => (
    <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
        }`}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
  );

  return (
    <div className='flex items-start gap-4'>
       {isEditing ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 shrink-0 rounded-full p-0">
              <AvatarComponent />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onRoleChange('user')}>
              <User className="mr-2 h-4 w-4" /> User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange('assistant')}>
              <Bot className="mr-2 h-4 w-4" /> Assistant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <AvatarComponent />
      )}
      <div className="flex-1 space-y-2">
        {message.role === 'assistant' && toolCalls && toolCalls.length > 0 && !isEditing && (
            <div className="flex flex-wrap items-center gap-2">
                {toolCalls.map((toolCall, index) => (
                    <Popover key={index}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 bg-background light:bg-white shadow-sm hover:shadow-md transition-shadow">
                                <Wand2 className="h-4 w-4" />
                                {toolCall.name}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Arguments for {toolCall.name}</h4>
                                    <pre className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap font-mono">
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(toolCall.arguments), null, 2);
                                            } catch (e) {
                                                return toolCall.arguments;
                                            }
                                        })()}
                                    </pre>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                ))}
            </div>
        )}

        <div className="rounded-lg border p-4 text-sm bg-card light:bg-white shadow-sm">
            {isEditing ? (
                <Textarea
                    value={message.content}
                    onChange={(e) => onContentChange(e.target.value)}
                    className="w-full min-h-[60px] font-sans bg-transparent border-0 p-0 focus-visible:ring-0"
                    rows={Math.max(2, message.content.split('\n').length)}
                />
            ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />
            )}
        </div>
        
        {message.role === 'assistant' && !isEditing && (useCaseContentContext || contextContext || complianceContext) && (
            <div className="flex items-start justify-between mt-1 px-1">
                <div className="flex flex-col gap-1">
                {useCaseContentContext && (
                    <Collapsible key="useCaseContent" className="text-left">
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground justify-start cursor-pointer p-1">
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{String(useCaseContext?.value || 'UseCase Context')}</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1">
                            <div className="rounded-md border bg-muted p-2 shadow-sm">
                                <pre className="whitespace-pre-wrap font-sans text-sm"><span>{String(useCaseContentContext.value)}</span></pre>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
                {contextContext && (
                    <Collapsible key="context" className="text-left">
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground justify-start cursor-pointer p-1">
                            <Info className="h-4 w-4" />
                            <span className="truncate">Context</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1">
                            <div className="rounded-md border bg-muted p-2 shadow-sm">
                                <pre className="whitespace-pre-wrap font-sans text-sm"><span>{String(contextContext.value)}</span></pre>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
                </div>

                {complianceContext && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-green-500" />
                        <span>{String(complianceContext.value)}</span>
                    </div>
                )}
            </div>
        )}

        {message.role === 'assistant' && (otherContext && otherContext.length > 0) && !isEditing && (
            <div className="flex flex-col items-start gap-2 pt-2 px-1">
                {otherContext.map((ctx, i) => {
                    const valueStr = String(ctx.value);
                    const isLong = valueStr.length > 50;
                    return (
                       <Collapsible key={i} className="text-left">
                           <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full justify-start cursor-pointer p-1 disabled:cursor-default" disabled={!isLong}>
                                <span className={cn(badgeVariants({ variant: 'secondary' }), "max-w-full shadow-sm")}>
                                    <span className="font-semibold mr-1">{ctx.key}:</span>
                                    <span className="truncate">{isLong ? `${valueStr.substring(0, 50)}...` : valueStr}</span>
                                </span>
                           </CollapsibleTrigger>
                           {isLong && (
                           <CollapsibleContent className="pt-1">
                             <div className="rounded-md border bg-muted p-2 shadow-sm">
                                 <pre className="whitespace-pre-wrap font-sans text-sm"><span>{String(valueStr)}</span></pre>
                             </div>
                           </CollapsibleContent>
                           )}
                       </Collapsible>
                    )
                })}
            </div>
        )}
      </div>
      {isEditing && (
        <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Remove message</span>
        </Button>
      )}
    </div>
  );
}