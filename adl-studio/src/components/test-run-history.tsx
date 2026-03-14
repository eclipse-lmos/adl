// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

'use client';

import { History, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TestRunResult } from '@/lib/data';

type TestRunHistoryProps = {
  runs: TestRunResult[];
  selectedRunId: string | null;
  isLoading: boolean;
  onSelectRunAction: (runId: string) => void;
  onDeleteRunAction: (run: TestRunResult) => void;
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString();
}

export default function TestRunHistory({ runs, selectedRunId, isLoading, onSelectRunAction, onDeleteRunAction }: TestRunHistoryProps) {
  return (
    <Card className="border-0 bg-transparent shadow-none flex flex-col h-full">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Test Runs</CardTitle>
          <Badge variant="secondary">{runs.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full min-h-24 items-center justify-center rounded-lg border">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex h-full min-h-24 items-center justify-center rounded-lg border text-center px-4">
            <p className="text-sm text-muted-foreground">No persisted test runs yet. Run tests to build history.</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {runs.map((run) => {
                const singleTestName = run.results.length === 1 ? run.results[0]?.testCaseName : null;
                return (
                  <div
                    key={run.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors hover:bg-accent/60',
                      selectedRunId === run.id && 'border-primary bg-accent'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectRunAction(run.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="font-mono">{run.overallScore.toFixed(0)}</Badge>
                          {run.requestedTestCaseId ? (
                            <Badge variant="secondary">Single test</Badge>
                          ) : (
                            <Badge variant="secondary">Suite</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{formatTimestamp(run.createdAt)}</span>
                        </div>
                        <p className="text-sm font-medium">
                          {singleTestName || `${run.results.length} test result${run.results.length === 1 ? '' : 's'}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {run.requestedTestCaseId ? `Requested test case: ${run.requestedTestCaseId}` : `Executed ADL: ${run.adlId}`}
                        </p>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onDeleteRunAction(run)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete test run</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

