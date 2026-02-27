'use client';

import { BookText } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatHistoryItem } from '@/lib/data';
import { Badge } from '@/components/ui/badge';

type ChatHistoryProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  history: ChatHistoryItem[];
  onHistoryItemClick: (item: ChatHistoryItem) => void;
};

export default function ChatHistory({ isOpen, onOpenChange, history, onHistoryItemClick }: ChatHistoryProps) {

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookText className="h-5 w-5" />
            Chat History
          </SheetTitle>
          <SheetDescription>
            A log of previous interactions with the assistant. Click a row to view the conversation.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utterance</TableHead>
                <TableHead>UseCase ID</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} onClick={() => onHistoryItemClick(item)} className="cursor-pointer">
                  <TableCell className="max-w-[200px] truncate">
                    {item.utterance}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{item.useCaseId}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.modelResponse}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
