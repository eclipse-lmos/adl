'use client';

import { BarChart as BarChartIcon, AlertTriangle, XCircle, User, Bot, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GaugeChart from './gauge-chart';
import VerdictIndicator from './verdict-indicator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';


type PerformanceChartsProps = {
  accuracy: number | null;
  results: any[] | null;
  verdict: string | null;
  reasons: string[] | null;
  missingRequirements: string[] | null;
  violations: string[] | null;
  onViewTestCase: (testCaseId: string) => void;
  isTesting: boolean;
};

function ConversationMessage({ message }: { message: { role: 'user' | 'assistant'; content: string } }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-4`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
        }`}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className="rounded-lg border p-3 text-sm bg-card">
          <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceCharts({ accuracy, results, verdict, reasons, missingRequirements, violations, onViewTestCase, isTesting }: PerformanceChartsProps) {
  const hasAccuracyData = accuracy !== null;
  const hasResultsData = results && results.length > 0;
  const hasLegacyEvalData = verdict !== null || (reasons !== null && reasons.length > 0) || (missingRequirements && missingRequirements.length > 0) || (violations && violations.length > 0);
  const noData = !hasAccuracyData && !hasResultsData && !hasLegacyEvalData;
  

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="p-4">
        <div className="flex items-center gap-2">
          <BarChartIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Performance</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Results from test executions.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isTesting ? (
            <div className="flex h-48 items-center justify-center rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : noData ? (
          <div className="flex h-48 items-center justify-center rounded-lg border text-center">
            <p className="text-sm text-muted-foreground px-4">
              Run Tests to see performance results.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {hasAccuracyData && (
              <div className="rounded-lg border p-4 flex justify-center items-center">
                <GaugeChart value={(accuracy || 0)} label="Overall Score" />
              </div>
            )}

            {hasResultsData && (
              <div className="space-y-2">
                <h4 className="font-semibold px-1 text-sm">Individual Test Results</h4>
                 <Accordion type="single" collapsible className="w-full space-y-2">
                  {results.map((result, index) => (
                    <AccordionItem value={`item-${index}`} key={index} className="border-b-0">
                      <div className="rounded-lg border">
                        <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                           <div className="flex items-center gap-2 w-full">
                            <VerdictIndicator verdict={result.details?.verdict} />
                            <span className="flex-1 text-left font-medium" title={result.testCaseName}>{result.testCaseName}</span>
                            {result.score !== null && result.score !== undefined &&
                              <Badge variant="outline" className="font-mono">{(result.score).toFixed(0)}</Badge>
                            }
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="flex flex-col gap-4 mt-2 border-t pt-4">
                          {result.details?.reasons && result.details.reasons.length > 0 && (
                               <div>
                                <h4 className="font-semibold">Reasons</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {result.details.reasons.map((reason: string, i: number) => (
                                    <li key={i}>{reason}</li>
                                    ))}
                                </ul>
                                </div>
                            )}
                            {result.details?.evidence && result.details.evidence.length > 0 && (
                                <div>
                                <h4 className="font-semibold">Evidence</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {result.details.evidence.map((ev: any, i: number) => (
                                    <li key={i}>
                                      <span className="font-semibold text-foreground">Expected:</span> {ev.mapsTo} <br />
                                      <span className="font-semibold text-foreground"> Actual: </span> {ev.quote}
                                    </li>
                                    ))}
                                </ul>
                                </div>
                            )}
                            {result.details?.missingRequirements && result.details.missingRequirements.length > 0 && (
                                <div>
                                <h4 className="font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Missing Requirements
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {result.details.missingRequirements.map((req: string, i: number) => (
                                    <li key={i}>{req}</li>
                                    ))}
                                </ul>
                                </div>
                            )}
                            {result.details?.violations && result.details.violations.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-red-600 dark:text-red-500 flex items-center gap-2">
                                        <XCircle className="h-4 w-4" />
                                        Violations
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {result.details.violations.map((violation: string, i: number) => (
                                        <li key={i}>{violation}</li>
                                    ))}
                                    </ul>
                                </div>
                            )}
                            {result.useCases && result.useCases.length > 0 && (
                                <div>
                                <h4 className="font-semibold">Use Cases Applied</h4>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {result.useCases.map((useCase: string, i: number) => (
                                    <Badge key={i} variant="secondary">{useCase}</Badge>
                                    ))}
                                </div>
                                </div>
                            )}
                            {result.actualConversation && result.actualConversation.length > 0 && (
                                <div>
                                <h4 className="font-semibold">Actual Conversation</h4>
                                <div className="mt-2 space-y-4">
                                    {result.actualConversation.map((msg: any, i: number) => (
                                    <ConversationMessage key={i} message={msg} />
                                    ))}
                                </div>
                                </div>
                            )}
                             <div className="flex justify-end pt-4">
                                <Button variant="link" size="sm" onClick={() => onViewTestCase(result.testCaseId)}>
                                    View Test Case
                                </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  ))}
                 </Accordion>
              </div>
            )}
            
            {/* Legacy data display - only if no results */}
            {!hasResultsData && (
              <>
                {verdict && (
                  <div className="rounded-lg border p-2 flex justify-center items-center">
                    <VerdictIndicator verdict={verdict} />
                  </div>
                )}
                 {hasAccuracyData && !hasResultsData && (
                    <div className="rounded-lg border p-4 flex justify-center items-center">
                        <GaugeChart value={accuracy as number} label="Score" />
                    </div>
                )}
                {reasons && reasons.length > 0 && (
                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <div>
                      <h4 className="font-semibold">Reasons</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {missingRequirements && missingRequirements.length > 0 && (
                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <div>
                      <h4 className="font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Missing Requirements
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {missingRequirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {violations && violations.length > 0 && (
                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <div>
                        <h4 className="font-semibold text-red-600 dark:text-red-500 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Violations
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {violations.map((violation, index) => (
                            <li key={index}>{violation}</li>
                        ))}
                        </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
