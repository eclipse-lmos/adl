'use client';

import { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TagManagerProps = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
};

export default function TagManager({ tags, onTagsChange, availableTags = [] }: TagManagerProps) {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const filteredAvailableTags = availableTags.filter(
    (tag) => !tags.includes(tag)
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="mr-2 h-4 w-4" />
          Tags ({tags.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="grid gap-4">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">Tags</h4>
            <p className="text-xs text-muted-foreground">
              Manage tags to categorize your prompt.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Add custom tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag(newTag);
                  setNewTag('');
                }
              }}
              className="h-8"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                handleAddTag(newTag);
                setNewTag('');
              }}
              disabled={!newTag.trim()}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 py-0.5 px-2">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="rounded-full hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {tag}</span>
                </button>
              </Badge>
            ))}
            {tags.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">No tags selected</p>
            )}
          </div>

          {availableTags.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available Tags</p>
              <ScrollArea className="h-48">
                <div className="grid gap-1">
                  {filteredAvailableTags.length > 0 ? (
                    filteredAvailableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className={cn(
                          "flex items-center justify-between px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors",
                          "focus:outline-none focus:ring-1 focus:ring-ring"
                        )}
                      >
                        {tag}
                        <Plus className="h-3 w-3 opacity-50" />
                      </button>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-4">
                      All tags selected
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
