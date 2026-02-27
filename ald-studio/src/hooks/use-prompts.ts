'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from 'urql';
import { ListPromptsQuery } from '@/lib/graphql/queries';

export function usePrompts() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  const [listResult, reexecuteListQuery] = useQuery({ 
    query: ListPromptsQuery,
    variables: { term: submittedQuery },
    requestPolicy: 'cache-and-network',
    pause: !mounted,
  });
  const { data: listData, fetching, error } = listResult;

  const sortedPrompts = useMemo(() => {
    if (!listData?.list) return [];
    
    // The list from urql is read-only, so we create a mutable copy.
    const prompts = [...listData.list];

    if (sortConfig !== null) {
      prompts.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];

        // Handle cases where relevance might be null
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return prompts;
  }, [listData, sortConfig]);

  const requestSort = useCallback((key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    // For relevance, default to descending on first click
    if (key === 'relevance' && (!sortConfig || sortConfig.key !== 'relevance' || sortConfig.direction === 'ascending')) {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);
  
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery);
    if(searchQuery){
      // Default to sorting by relevance when a search is performed
      setSortConfig({ key: 'relevance', direction: 'descending' });
    } else {
      setSortConfig(null);
    }
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSubmittedQuery('');
    setSortConfig(null);
  }, []);

  const reexecuteQuery = useCallback(() => {
    reexecuteListQuery({ requestPolicy: 'network-only' });
  }, [reexecuteListQuery]);

  return {
    searchQuery,
    setSearchQuery,
    submittedQuery,
    handleSearchSubmit,
    handleClearSearch,
    prompts: sortedPrompts,
    fetching,
    error,
    sortConfig,
    requestSort,
    reexecuteQuery,
  };
}
