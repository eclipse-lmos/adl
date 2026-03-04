
'use client';

import { MessagesSquare, RefreshCcw, Loader2, Play, Zap, Trash2, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TestCase } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TestCasesProps = {
  testCases: TestCase[];
  isTesting: boolean;
  onGenerateTestCases: () => void;
  isGeneratingTests: boolean;
  onPlayTestCase: (testCase: TestCase) => void;
  onRunTests: () => void;
  useCaseId: string;
  onTestCaseSelect: (testCaseId: string) => void;
  onDeleteTestCase: (e: React.MouseEvent, testCaseId: string) => void;
  onToggleContract: (testCaseId: string) => void;
};

export default function TestCases({ testCases, isTesting, onGenerateTestCases, isGeneratingTests, onPlayTestCase, onRunTests, useCaseId, onTestCaseSelect, onDeleteTestCase, onToggleContract }: TestCasesProps) {

  return (
    <Card className="h-full border-0 bg-transparent shadow-none flex flex-col">
      <CardHeader className="p-4 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Test Cases</CardTitle>
          <Badge variant="secondary">{testCases.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onRunTests}
            disabled={isTesting || !useCaseId}
            size="sm"
            variant="outline"
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Run Tests
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onGenerateTestCases} disabled={isGeneratingTests || !useCaseId}>
            {isGeneratingTests ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            <span className="sr-only">Generate TestCases</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {testCases.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground text-center px-4">No test cases found. Generate them with AI.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {testCases.map((testCase) => (
                <div key={testCase.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent group">
                  <div
                    className="w-full text-left h-auto flex flex-row items-center cursor-pointer"
                    onClick={() => onTestCaseSelect(testCase.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleContract(testCase.id);
                      }}
                    >
                      <FileSignature className={cn('h-4 w-4', testCase.contract ? 'text-blue-500' : 'text-gray-400')} />
                      <span className="sr-only">Toggle contract</span>
                    </Button>
                    <div className="flex flex-col">
                      <p className="font-medium text-sm">{testCase.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{testCase.description}</p>
                    </div>
                  </div>
                   <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTestCase(testCase)
                      }}
                    >
                      <Play className="h-4 w-4" />
                      <span className="sr-only">Play test case</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => onDeleteTestCase(e, testCase.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete test case</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
