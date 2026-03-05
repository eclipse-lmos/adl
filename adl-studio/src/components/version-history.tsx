'use client';

import { useState } from 'react';
import { useQuery, useClient } from 'urql';
import { History, Eye, GitCompare, Loader2, X, RotateCcw } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VersionHistoryQuery, DiffVersionsQuery } from '@/lib/graphql/queries';

export type VersionEntry = {
  adlId: string;
  version: number;
  content: string;
  tags: string[];
  examples: string[] | null;
  output: string | null;
  createdAt: string;
};

type DiffResult = {
  adlId: string;
  fromVersion: number;
  toVersion: number;
  contentDiff: string;
};

type VersionHistoryProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  useCaseId: string;
  onRevert: (version: VersionEntry) => void;
};

export default function VersionHistory({ isOpen, onOpenChange, useCaseId, onRevert }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const client = useClient();

  const [historyResult] = useQuery({
    query: VersionHistoryQuery,
    variables: { id: useCaseId },
    pause: !isOpen || !useCaseId,
    requestPolicy: 'cache-and-network',
  });

  const versions: VersionEntry[] = historyResult.data?.versionHistory || [];
  const latestVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0;

  const handleViewVersion = (version: VersionEntry) => {
    setSelectedVersion(version);
    setDiffResult(null);
  };

  const handleDiffWithLatest = async (version: VersionEntry) => {
    if (version.version === latestVersion) return;
    setDiffLoading(true);
    setSelectedVersion(null);
    try {
      const result = await client.query(DiffVersionsQuery, {
        id: useCaseId,
        fromVersion: version.version,
        toVersion: latestVersion,
      }).toPromise();
      if (result.data?.diffVersions) {
        setDiffResult(result.data.diffVersions);
      }
    } finally {
      setDiffLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedVersion(null);
    setDiffResult(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      onOpenChange(open);
    }}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </SheetTitle>
          <SheetDescription>
            Previous versions of <span className="font-mono">{useCaseId}</span>. View snapshots or compare with the latest version.
          </SheetDescription>
        </SheetHeader>

        {selectedVersion ? (
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Version {selectedVersion.version}</Badge>
                <span className="text-sm text-muted-foreground">{formatDate(selectedVersion.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                {selectedVersion.version !== latestVersion && (
                  <Button variant="outline" size="sm" onClick={() => { onRevert(selectedVersion); setSelectedVersion(null); onOpenChange(false); }}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Revert
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setSelectedVersion(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedVersion.tags && selectedVersion.tags.length > 0 && (
              <div className="flex gap-1 mb-2">
                {selectedVersion.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
            <ScrollArea className="flex-1 rounded-lg border bg-muted/50">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap">{selectedVersion.content}</pre>
            </ScrollArea>
          </div>
        ) : diffResult ? (
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">v{diffResult.fromVersion}</Badge>
                <span className="text-sm text-muted-foreground">→</span>
                <Badge variant="secondary">v{diffResult.toVersion}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDiffResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 rounded-lg border bg-muted/50">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                {diffResult.contentDiff.split('\n').map((line, i) => {
                  let className = '';
                  if (line.startsWith('+')) className = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';
                  else if (line.startsWith('-')) className = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30';
                  else if (line.startsWith('@@')) className = 'text-blue-600 dark:text-blue-400';
                  return (
                    <div key={i} className={className}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="flex-1 mt-4">
            {historyResult.fetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No version history available.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.version}>
                      <TableCell>
                        <Badge variant={version.version === latestVersion ? 'default' : 'secondary'}>
                          v{version.version}
                          {version.version === latestVersion && ' (latest)'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {version.tags?.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVersion(version)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {version.version !== latestVersion && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDiffWithLatest(version)}
                                disabled={diffLoading}
                              >
                                {diffLoading ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <GitCompare className="h-4 w-4 mr-1" />
                                )}
                                Diff
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { onRevert(version); onOpenChange(false); }}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Revert
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
