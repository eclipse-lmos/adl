'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SearchFormProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
};

export default function SearchForm({ searchQuery, onSearchQueryChange, onSubmit, onClear }: SearchFormProps) {
  return (
    <form className="flex items-center gap-2 flex-1" onSubmit={onSubmit}>
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Describe what you are looking for..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
            />
        </div>
        <Button type="submit">Search</Button>
        {searchQuery && (
          <Button type="button" variant="outline" onClick={onClear}>Clear</Button>
        )}
    </form>
  );
}
