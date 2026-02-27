
'use client';

import { useState } from 'react';
import { useMutation } from 'urql';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImproveUseCaseMutation } from '@/lib/graphql/mutations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type AiOptimizerProps = {
  prompt: string;
  useCaseId: string;
  onAcceptSuggestion: (improvedUseCase: string) => void;
};

type Improvement = {
  improved_use_case: string;
  issue: string;
  suggestion: string;
};

type OptimizerState = {
  improvements: Improvement[];
  error?: string;
} | null;

export default function AiOptimizer({ prompt, useCaseId, onAcceptSuggestion }: AiOptimizerProps) {
  const [result, setResult] = useState<OptimizerState>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [improveUseCaseResult, executeImproveUseCase] = useMutation(ImproveUseCaseMutation);

  const handleOptimize = async () => {
    setResult(null);
    if (!prompt || !useCaseId) {
      setResult({ improvements: [], error: "A UseCase ID and prompt content are required." });
      setIsDialogOpen(true);
      return;
    }

    const useCaseContent = prompt;
    const response = await executeImproveUseCase({ useCase: useCaseContent });

    if (response.error) {
      setResult({ improvements: [], error: response.error.message });
    } else if (response.data?.improveUseCase?.improvements) {
      setResult({ improvements: response.data.improveUseCase.improvements });
    } else {
      setResult({ improvements: [] });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setResult(null);
  }

  const handleAccept = (improvedUseCase: string) => {
    onAcceptSuggestion(improvedUseCase);
    closeDialog();
  };

  return (
    <>
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI Suggestions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Improve your UseCase prompt based on AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-end">
            <Button onClick={handleOptimize} disabled={improveUseCaseResult.fetching || !useCaseId || !prompt} variant="outline" size="sm">
              {improveUseCaseResult.fetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Get Suggestions'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Suggestions</DialogTitle>
            <DialogDescription>
              Here are some suggestions to improve your UseCase prompt.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="my-4">
              {result && (
                <>
                  {result.error ? (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  ) : result.improvements.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {result.improvements.map((improvement, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                          <AccordionTrigger className="text-left text-sm hover:no-underline">
                            {improvement.issue}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div>
                                <h4 className="font-semibold">Suggestion</h4>
                                <p className="text-sm text-muted-foreground">{improvement.suggestion}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold">Example Improved Use Case</h4>
                                <pre className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap font-mono">
                                  {improvement.improved_use_case}
                                </pre>
                              </div>
                              <div className="flex justify-end pt-2">
                                <Button size="sm" onClick={() => handleAccept(improvement.improved_use_case)}>Accept Suggestion</Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-sm text-muted-foreground">No suggestions available at the moment.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={closeDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
