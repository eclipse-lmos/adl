
'use client';

import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'urql';
import { useSearchParams, useRouter } from 'next/navigation';
import type { TestCase, PerformanceData, Message, UseCasePrompt as PromptType, ChatHistoryItem } from '@/lib/data';
import { Loader2, Zap, ArrowLeft, BookText, MessageSquare, FileText, Info, User, Bot, Pencil, Plus } from 'lucide-react';

import AppHeader from '@/components/header';
import PromptEditor from '@/components/prompt-editor';
import TestCases from '@/components/test-cases';
import PerformanceCharts from '@/components/performance-charts';
import AiOptimizer from '@/components/ai-optimizer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import ExampleUtterances from '@/components/example-utterances';
import ChatPlayground from '@/components/chat-playground';
import ChatHistory from '@/components/chat-history';
import { TestsQuery, SearchByIdQuery, GetMcpToolsQuery, ListWidgetsQuery } from '@/lib/graphql/queries';
import { NewTestsMutation, StoreADLMutation, ExecuteTestsMutation, DeleteTestCaseMutation, UpdateTestCaseMutation, ExamplesMutation, AddTestCaseMutation, UpdateTagsMutation, UpdateOutputMutation } from '@/lib/graphql/mutations';
import TagManager from '@/components/tag-manager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ConversationMessage from '@/components/conversation-message';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const getNewUseCasePromptTemplate = (id?: string | null): PromptType => {
  const useCaseId = id?.replace(/\s+/g, '-').toLowerCase() || 'my_id';
  return {
    id: useCaseId,
    createdAt: '',
    tags: [],
    content: `## UseCase: ${useCaseId}\n\n## Description\n\n## Solution\n\n`,
    output: null,
  };
};

function PromptEditorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const useCaseIdFromUrl = searchParams.get('id');
  const newIdFromUrl = searchParams.get('new_id');
  const loadedPromptIdRef = useRef<string | null>(null);
  
  const [promptResult, reexecutePromptQuery] = useQuery({
    query: SearchByIdQuery,
    variables: { id: useCaseIdFromUrl },
    pause: !useCaseIdFromUrl,
    requestPolicy: 'cache-and-network',
  });
  const { data: promptData, fetching: promptFetching, error: promptError } = promptResult;

  const newUseCasePromptTemplate = useMemo(() => getNewUseCasePromptTemplate(newIdFromUrl), [newIdFromUrl]);

  const [prompt, setPrompt] = useState(newUseCasePromptTemplate.content);
  const [originalPrompt, setOriginalPrompt] = useState(newUseCasePromptTemplate.content);
  const [chatPrompt, setChatPrompt] = useState('');
  const [useCaseId, setUseCaseId] = useState('');
  const [createdAt, setCreatedAt] = useState(newUseCasePromptTemplate.createdAt);
  const [tags, setTags] = useState<string[]>(newUseCasePromptTemplate.tags);
  const [originalTags, setOriginalTags] = useState<string[]>(newUseCasePromptTemplate.tags);
  const [testCases, setTestCases] = useState<TestCase[] | null>([]);
  const [performanceScore, setPerformanceScore] = useState<number | null>(null);
  const [performanceVerdict, setPerformanceVerdict] = useState<string | null>(null);
  const [performanceReasons, setPerformanceReasons] = useState<string[] | null>(null);
  const [performanceMissingRequirements, setPerformanceMissingRequirements] = useState<string[] | null>(null);
  const [performanceViolations, setPerformanceViolations] = useState<string[] | null>(null);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [utterances, setUtterances] = useState<string[]>([]);
  const [originalUtterances, setOriginalUtterances] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const { toast } = useToast();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedUtterance, setSelectedUtterance] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ChatHistoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [editedTestCase, setEditedTestCase] = useState<TestCase | null>(null);
  const [isTestCaseSheetOpen, setIsTestCaseSheetOpen] = useState(false);
  const [isTestCaseEditing, setIsTestCaseEditing] = useState(false);
  const [isSavingTestCase, setIsSavingTestCase] = useState(false);
  const [showDeleteTestCaseDialog, setShowDeleteTestCaseDialog] = useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = useState<{id: string; name: string} | null>(null);
  const [isGeneratingUtterances, setIsGeneratingUtterances] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);


  const [testCasesResult, reexecuteTestCasesQuery] = useQuery({
    query: TestsQuery,
    variables: { useCaseId },
    pause: !useCaseId,
  });
  const { data: testCasesData, fetching: testCasesFetching, error: testCasesError } = testCasesResult;

  const [_createTestsResult, executeNewTestsMutation] = useMutation(NewTestsMutation);
  const [_storeResult, executeStoreMutation] = useMutation(StoreADLMutation);
  const [_updateTagsResult, executeUpdateTags] = useMutation(UpdateTagsMutation);
  const [_executeTestsResult, executeTestsMutation] = useMutation(ExecuteTestsMutation);
  const [_deleteTestCaseResult, executeDeleteTestCase] = useMutation(DeleteTestCaseMutation);
  const [_updateTestCaseResult, executeUpdateTestCase] = useMutation(UpdateTestCaseMutation);
  const [_getExamplesResult, executeGetExamples] = useMutation(ExamplesMutation);
  const [_addTestCaseResult, executeAddTestCase] = useMutation(AddTestCaseMutation);
  const [_updateOutputResult, executeUpdateOutput] = useMutation(UpdateOutputMutation);

  const [toolsResult] = useQuery({ query: GetMcpToolsQuery });
  useEffect(() => {
    if (toolsResult.data?.getMcpTools) {
        setTools(toolsResult.data.getMcpTools);
    }
  }, [toolsResult.data]);

  const [widgetsResult, reexecuteWidgetsQuery] = useQuery({ query: ListWidgetsQuery, requestPolicy: 'cache-and-network' });
  const widgets = useMemo(() => widgetsResult.data?.widgets || [], [widgetsResult.data]);

  const isPromptContentDirty = prompt !== originalPrompt;
  const areUtterancesDirty = JSON.stringify(utterances) !== JSON.stringify(originalUtterances);
  const areTagsDirty = JSON.stringify(tags) !== JSON.stringify(originalTags);
  const isDirty = isPromptContentDirty || areUtterancesDirty;
  
  // A single effect to synchronize the page state with the URL and fetched data.
  // This handles loading a prompt, switching between prompts, and creating a new one.
  useEffect(() => {
    // Case 1: An existing prompt ID is in the URL.
    if (useCaseIdFromUrl) {
      // If the data for this prompt is available, update the state.
      if (promptData?.searchById) {
        const data = promptData.searchById;
        setPrompt(data.content);
        setOriginalPrompt(data.content);
        setTags(data.tags || []);
        setOriginalTags(data.tags || []);
        setCreatedAt(data.createdAt);
        setSelectedWidget(data.output || null);
        const loadedUtterances = data.examples || [];
        setUtterances(loadedUtterances);
        setOriginalUtterances(loadedUtterances);
      } else if (promptError) {
        toast({
            variant: 'destructive',
            title: 'Error loading prompt',
            description: promptError.message,
        });
      }

      // If we've just navigated to this prompt, reset performance data and tests.
      if (loadedPromptIdRef.current !== useCaseIdFromUrl) {
        setUseCaseId(useCaseIdFromUrl);
        setPerformanceScore(null);
        setPerformanceVerdict(null);
        setPerformanceReasons(null);
        setPerformanceMissingRequirements(null);
        setPerformanceViolations(null);
        setTestResults(null);
        setTestCases([]);
        reexecuteTestCasesQuery({ requestPolicy: 'network-only' });
        loadedPromptIdRef.current = useCaseIdFromUrl;
      }
    } 
    // Case 2: No ID in the URL, so we're on the "new prompt" page.
    else {
      const newTemplate = getNewUseCasePromptTemplate(newIdFromUrl);
      setUseCaseId(newTemplate.id);
      setPrompt(newTemplate.content);
      setOriginalPrompt(newTemplate.content);
      setTags(newTemplate.tags);
      setOriginalTags(newTemplate.tags);
      setCreatedAt(newTemplate.createdAt);
      setSelectedWidget(newTemplate.output || null);
      setUtterances([]);
      setOriginalUtterances([]);
      
      // Reset performance data and tests.
      setPerformanceScore(null);
      setPerformanceVerdict(null);
      setPerformanceReasons(null);
      setPerformanceMissingRequirements(null);
      setPerformanceViolations(null);
      setTestResults(null);
      setTestCases([]);
      loadedPromptIdRef.current = null;
    }
  }, [useCaseIdFromUrl, newIdFromUrl, promptData, promptError, reexecuteTestCasesQuery, toast, getNewUseCasePromptTemplate]);

  const handlePromptSave = useCallback(() => {
    if (isSaving) return;
    setIsSaving(true);
    
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Cannot save prompt',
        description: 'Prompt content cannot be empty.',
      });
      setIsSaving(false);
      return;
    }

    if (!useCaseId) {
      toast({
        variant: 'destructive',
        title: 'UseCase ID is missing',
        description: 'A UseCase ID could not be determined for this prompt.',
      });
      setIsSaving(false);
      return;
    }
    
    const createdAtDate = (createdAt && !isNaN(Date.parse(createdAt)))
      ? new Date(createdAt)
      : new Date();

    executeStoreMutation({
        id: useCaseId,
        createdAt: createdAtDate.toISOString().split('T')[0],
        tags: tags,
        content: prompt,
        examples: utterances || [],
    }).then(({ data, error }) => {
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Error storing UseCase Prompt',
                description: error.message,
            });
        } else if (data?.store) {
            setOriginalPrompt(prompt);
            setOriginalUtterances(utterances || []);
            toast({
                title: 'UseCase Prompt Stored',
                description: data.store.message,
            });
            // If it was a new prompt, we should update the URL without a full page reload
            if (!useCaseIdFromUrl) {
                router.push(`/prompts?id=${useCaseId}`, { scroll: false });
            }
        }
    }).finally(() => {
        setIsSaving(false);
    });
  }, [isSaving, prompt, createdAt, tags, utterances, useCaseIdFromUrl, useCaseId, executeStoreMutation, toast, router]);

  const handleTagsSave = useCallback(() => {
    if (isSavingTags || !useCaseId) return;

    setIsSavingTags(true);
    executeUpdateTags({
        id: useCaseId,
        tags: tags,
    }).then(({ data, error }) => {
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Error updating tags',
                description: error.message,
            });
        } else if (data?.updateTags) {
            setOriginalTags(tags);
            toast({
                title: 'Tags Updated',
                description: data.updateTags.message || 'Tags saved successfully.',
            });
        }
    }).finally(() => {
        setIsSavingTags(false);
    });
  }, [isSavingTags, useCaseId, tags, executeUpdateTags, toast]);
  
  useEffect(() => {
    if (testCasesFetching) return;
    if (testCasesError) {
        toast({
            variant: "destructive",
            title: "Error loading test cases",
            description: `Could not fetch test cases: ${testCasesError.message}.`,
        });
        setTestCases([]);
    } else if (testCasesData?.testCases) {
        const newTestCases = testCasesData.testCases.map((tc: TestCase) => ({...tc, contract: tc.contract ?? false })) as TestCase[];
        setTestCases(prevTestCases => {
            if (JSON.stringify(prevTestCases) !== JSON.stringify(newTestCases)) {
                return newTestCases;
            }
            return prevTestCases;
        });
    }
  }, [testCasesData, testCasesFetching, testCasesError, toast]);

  const handleBlurSave = useCallback(() => {
    if (isPromptContentDirty) {
      handlePromptSave();
    }
  }, [isPromptContentDirty, handlePromptSave]);
  
  useEffect(() => {
    if (areUtterancesDirty && !isSaving) {
      handlePromptSave();
    }
  }, [utterances, areUtterancesDirty, isSaving, handlePromptSave]);

  useEffect(() => {
    if (areTagsDirty && !isSavingTags) {
      handleTagsSave();
    }
  }, [tags, areTagsDirty, isSavingTags, handleTagsSave]);

  const handleRunTests = () => {
    if (!useCaseId) {
      toast({
        variant: 'destructive',
        title: 'Cannot run tests',
        description: 'A UseCase ID is required.',
      });
      return;
    }

    setIsTesting(true);
    toast({
      title: 'Running tests...',
      description: 'The prompt is being evaluated against the test cases.',
    });

    executeTestsMutation({ id: useCaseId }).then(({ data, error }) => {
      setIsTesting(false);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error running tests',
          description: error.message,
        });
      } else if (data?.executeTests) {
        const { overallScore, results } = data.executeTests;
        setPerformanceScore(overallScore ?? null);
        setTestResults(results ?? []);

        // Clear single-result details that are no longer used
        setPerformanceVerdict(null);
        setPerformanceReasons(null);
        setPerformanceMissingRequirements(null);
        setPerformanceViolations(null);

        toast({
          title: 'Tests complete!',
          description: `Overall score: ${(overallScore ?? 0).toFixed(2)}`,
        });
      }
    });
  };

  const handleRegenerateUtterances = () => {
    if (!prompt) {
      toast({
        variant: 'destructive',
        title: 'Cannot generate utterances',
        description: 'Prompt content is required.',
      });
      return;
    }
    setIsGeneratingUtterances(true);
    toast({
      title: 'Generating example utterances...',
      description: 'AI is creating new examples for you.',
    });

    executeGetExamples({ useCase: prompt }).then(({ data, error }) => {
      setIsGeneratingUtterances(false);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error generating utterances',
          description: error.message,
        });
      } else if (data?.examples?.examples) {
          const newUtterances = data.examples.examples;
          setUtterances(newUtterances);
          toast({
            title: 'Utterances Generated',
            description: `${newUtterances.length} new example utterances were created.`,
          });
      }
    });
  };

  const handleGenerateTestCases = () => {
    if (!useCaseId) {
      toast({
        variant: 'destructive',
        title: 'Cannot generate tests',
        description: 'A UseCase ID is required.',
      });
      return;
    }
    setIsGeneratingTests(true);
    toast({
      title: 'Generating test cases...',
      description: 'AI is creating new test cases for your prompt.',
    });

    executeNewTestsMutation({ id: useCaseId }).then(({ data, error }) => {
      setIsGeneratingTests(false);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error generating test cases',
          description: error.message,
        });
      } else if (data?.newTests) {
          toast({
            title: 'Test Cases Generated',
            description: `${data.newTests.count} new test cases were created.`,
          });
          reexecuteTestCasesQuery({ requestPolicy: 'network-only' });
      }
    });
  };

  const handleDeleteTestCaseClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const testCase = (testCases || []).find(tc => tc.id === id);
    if (testCase) {
        setTestCaseToDelete({ id: testCase.id, name: testCase.name });
        setShowDeleteTestCaseDialog(true);
    }
  };

  const confirmDeleteTestCase = async () => {
    if (!testCaseToDelete) return;

    const result = await executeDeleteTestCase({ id: testCaseToDelete.id });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error deleting test case",
        description: result.error.message,
      });
    } else {
      toast({
        title: "Test case deleted",
        description: `The test case "${testCaseToDelete.name}" has been successfully deleted.`,
      });
      reexecuteTestCasesQuery({ requestPolicy: 'network-only' });
    }
    setShowDeleteTestCaseDialog(false);
    setTestCaseToDelete(null);
  };
  
  const handleToggleContract = async (testCaseId: string) => {
    const testCase = (testCases || []).find(tc => tc.id === testCaseId);
    if (!testCase) {
        toast({
            variant: "destructive",
            title: "Test Case not found",
            description: `Could not find test case with ID: ${testCaseId}`,
        });
        return;
    };

    const updatedTestCase = { ...testCase, contract: !testCase.contract };

    // Optimistically update the list view
    setTestCases((prev) => (prev || []).map((tc) => (tc.id === testCaseId ? updatedTestCase : tc)));

    try {
        const conversation = (updatedTestCase.expectedConversation || updatedTestCase.messages || []).map(
            ({ role, content }) => ({ role, content })
        );

        const result = await executeUpdateTestCase({
            input: {
                id: updatedTestCase.id,
                name: updatedTestCase.name,
                description: updatedTestCase.description,
                expectedConversation: conversation,
                contract: updatedTestCase.contract,
            },
        });

        if (result.error) {
            // Revert on error
            setTestCases((prev) => (prev || []).map((tc) => (tc.id === testCaseId ? testCase : tc)));
            toast({
                variant: 'destructive',
                title: 'Error updating test case contract',
                description: result.error.message,
            });
        } else {
            toast({
                title: 'Test Case Updated',
                description: `Contract status for "${updatedTestCase.name}" has been updated.`,
            });
            // If the detail sheet is open for this test case, update its state as well
            if (selectedTestCase?.id === testCaseId) {
                setSelectedTestCase(prev => prev ? { ...prev, contract: updatedTestCase.contract } : null);
            }
            if (editedTestCase?.id === testCaseId) {
                setEditedTestCase(prev => prev ? { ...prev, contract: updatedTestCase.contract } : null);
            }
        }
    } catch (e: any) {
        // Revert on any unexpected error during mutation
        setTestCases((prev) => (prev || []).map((tc) => (tc.id === testCaseId ? testCase : tc)));
        toast({
            variant: 'destructive',
            title: 'Error updating test case contract',
            description: e.message || 'An unexpected error occurred.',
        });
    }
  };

  const handleDeleteTestCaseDialogChange = (isOpen: boolean) => {
      if (!isOpen) {
          setTestCaseToDelete(null);
      }
      setShowDeleteTestCaseDialog(isOpen);
  }

  const handleRemoveUtterance = (indexToRemove: number) => {
    setUtterances((utterances || []).filter((_, index) => index !== indexToRemove));
  };

  const handleAddUtterance = (utterance: string) => {
    setUtterances((prev) => [...(prev || []), utterance]);
  };

  const handlePlayUtterance = (utterance: string) => {
    setChatPrompt(prompt);
    setSelectedHistoryItem(null);
    setSelectedUtterance(utterance);
    setIsChatOpen(true);
  };

  const handleHistoryItemClick = (item: ChatHistoryItem) => {
    setSelectedUtterance(null);
    setSelectedHistoryItem(item);
    setIsHistoryOpen(false);
    setTimeout(() => {
      setIsChatOpen(true);
    }, 500);
  };

  const handlePlayTestCase = (testCase: TestCase) => {
    if (!useCaseId) {
      toast({
        variant: 'destructive',
        title: 'Cannot run test',
        description: 'A UseCase ID is required.',
      });
      return;
    }

    setIsTesting(true);
    toast({
      title: `Running test: ${testCase.name}`,
      description: 'The prompt is being evaluated against the selected test case.',
    });

    executeTestsMutation({ id: useCaseId, testCaseId: testCase.id }).then(({ data, error }) => {
      setIsTesting(false);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error running test',
          description: error.message,
        });
      } else if (data?.executeTests) {
        const { overallScore, results } = data.executeTests;
        setPerformanceScore(overallScore ?? null);
        setTestResults(results ?? []);

        setPerformanceVerdict(null);
        setPerformanceReasons(null);
        setPerformanceMissingRequirements(null);
        setPerformanceViolations(null);

        toast({
          title: 'Test complete!',
          description: `Score for "${testCase.name}": ${((results?.[0]?.score ?? 0)).toFixed(0)}`,
        });
      }
    });
  };

  const handleOpenChat = () => {
    setChatPrompt(prompt);
    setSelectedHistoryItem(null);
    setSelectedUtterance(null);
    setIsChatOpen(true);
  };

  const handleSaveChatHistory = (item: Omit<ChatHistoryItem, 'id' | 'timestamp' | 'messages' | 'prompt'>, messages: Message[], prompt: string) => {
    const newHistoryItem: ChatHistoryItem = {
      ...item,
      id: `chat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      messages,
      prompt,
    };
    setChatHistory(prev => [newHistoryItem, ...prev]);
  };

  const handleSaveAsTest = async (newTestCaseData: Pick<TestCase, 'name' | 'description' | 'expectedConversation'>) => {
    if (!useCaseId) {
        toast({
            variant: "destructive",
            title: "Cannot save test case",
            description: "A UseCase ID is required.",
        });
        return;
    }

    const conversation = (newTestCaseData.expectedConversation || []).map(
        ({ role, content }) => ({ role, content })
    );
    
    const result = await executeAddTestCase({
        input: {
            useCaseId: useCaseId,
            name: newTestCaseData.name,
            description: newTestCaseData.description,
            expectedConversation: conversation,
            contract: false,
        }
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error adding test case",
        description: result.error.message,
      });
    } else {
      toast({
        title: "Test Case Added",
        description: `"${newTestCaseData.name}" has been successfully added.`,
      });
      reexecuteTestCasesQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleAcceptSuggestion = (improvedUseCase: string) => {
    setPrompt(improvedUseCase);
    toast({
        title: "Prompt Updated",
        description: "The AI suggestion has been applied.",
    });
  };

  const handleViewTestCase = (testCaseId: string) => {
    const testCase = (testCases || []).find(tc => tc.id === testCaseId);
    if (testCase) {
        setSelectedTestCase(JSON.parse(JSON.stringify(testCase)));
        setEditedTestCase(JSON.parse(JSON.stringify(testCase)));
        setIsTestCaseSheetOpen(true);
    } else {
        toast({
            variant: "destructive",
            title: "Test Case not found",
            description: `Could not find details for test case with ID: ${testCaseId}`,
        });
    }
  };

  const handleTestCaseSheetOpenChange = (isOpen: boolean) => {
      setIsTestCaseSheetOpen(isOpen);
      if (!isOpen) {
          setSelectedTestCase(null);
          setEditedTestCase(null);
          setIsTestCaseEditing(false);
      }
  };

  const handleContractChange = async (isChecked: boolean) => {
    if (!editedTestCase) return;

    const updatedTestCase = { ...editedTestCase, contract: isChecked };
    setEditedTestCase(updatedTestCase);

    setIsSavingTestCase(true);
    try {
      const conversation = (updatedTestCase.expectedConversation || updatedTestCase.messages || []).map(
        ({ role, content }) => ({ role, content })
      );

      const result = await executeUpdateTestCase({
        input: {
          id: updatedTestCase.id,
          name: updatedTestCase.name,
          description: updatedTestCase.description,
          expectedConversation: conversation,
          contract: isChecked,
        },
      });

      if (result.error) {
        setEditedTestCase(editedTestCase); // Revert
        toast({
          variant: 'destructive',
          title: 'Error updating test case',
          description: result.error.message,
        });
      } else {
        setTestCases((prev) => (prev || []).map((tc) => (tc.id === updatedTestCase.id ? updatedTestCase : tc)));
        setSelectedTestCase(updatedTestCase);
        toast({
          title: 'Test Case Updated',
          description: `Contract status for "${updatedTestCase.name}" has been updated.`,
        });
      }
    } finally {
      setIsSavingTestCase(false);
    }
  };

  const handleSaveTestCase = async () => {
    if (!editedTestCase) return;

    setIsSavingTestCase(true);
    try {
        const conversation = (editedTestCase.expectedConversation || editedTestCase.messages || []).map(
            ({ role, content }) => ({ role, content })
        );

        const result = await executeUpdateTestCase({
            input: {
                id: editedTestCase.id,
                name: editedTestCase.name,
                description: editedTestCase.description,
                expectedConversation: conversation,
                contract: editedTestCase.contract ?? false,
            }
        });

        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error updating test case",
                description: result.error.message,
            });
        } else {
            setTestCases(prevTestCases => {
                if (!prevTestCases) return [];
                return prevTestCases.map(tc => tc.id === editedTestCase.id ? JSON.parse(JSON.stringify(editedTestCase)) : tc);
            });
            setSelectedTestCase(JSON.parse(JSON.stringify(editedTestCase)));
            setIsTestCaseEditing(false);

            toast({
                title: "Test Case Updated",
                description: `"${editedTestCase.name}" has been successfully saved.`,
            });
        }
    } finally {
        setIsSavingTestCase(false);
    }
  };

  const handleTestCaseMessageChange = (index: number, content: string) => {
    setEditedTestCase(prev => {
        if (!prev) return null;
        const currentConversation = (prev.expectedConversation || prev.messages || []);
        if (!currentConversation) return prev;
        const newMessages = [...currentConversation];
        newMessages[index] = { ...newMessages[index], content };
        return { ...prev, expectedConversation: newMessages };
    });
  };

  const handleTestCaseMessageRoleChange = (index: number, role: 'user' | 'assistant') => {
      setEditedTestCase(prev => {
          if (!prev) return null;
          const currentConversation = (prev.expectedConversation || prev.messages || []);
          if (!currentConversation) return prev;
          const newMessages = [...currentConversation];
          newMessages[index] = { ...newMessages[index], role };
          return { ...prev, expectedConversation: newMessages };
      });
  };

  const handleRemoveTestCaseMessage = (index: number) => {
      setEditedTestCase(prev => {
          if (!prev) return null;
          const currentConversation = (prev.expectedConversation || prev.messages || []);
          if (!currentConversation) return prev;
          const newMessages = currentConversation.filter((_, i) => i !== index);
          return { ...prev, expectedConversation: newMessages };
      });
  };

  const handleAddTestCaseMessage = () => {
      setEditedTestCase(prev => {
          if (!prev) return null;
          const newMessages = [...(prev.expectedConversation || prev.messages || []), { role: 'user', content: '', format: 'text' as const }];
          return { ...prev, expectedConversation: newMessages };
      });
  };

  const handleWidgetChange = (value: string) => {
    const outputId = value === 'none' ? '' : value;
    if (!useCaseId) return;

    executeUpdateOutput({ id: useCaseId, output: outputId }).then(({ data, error }) => {
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Error updating widget',
                description: error.message,
            });
        } else if (data?.updateOutput) {
            toast({
                title: 'Widget Updated',
                description: 'The output widget for this prompt has been changed.',
            });
            setSelectedWidget(outputId);
        }
    });
  };

  if (useCaseIdFromUrl && promptFetching && !loadedPromptIdRef.current) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-4">Loading prompt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-2 py-1 mb-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <span id="prompt-id" className="p-2 w-72 font-mono text-sm h-9">{useCaseId}</span>
          </div>
          <div className="flex items-center gap-4">
            <TagManager tags={tags} onTagsChange={setTags} />
            <Select
              value={selectedWidget || 'none'}
              onValueChange={handleWidgetChange}
              onOpenChange={(open) => {
                if (open) {
                  reexecuteWidgetsQuery({ requestPolicy: 'network-only' });
                }
              }}
              disabled={!useCaseId || widgetsResult.fetching}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a widget" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No Widget</SelectItem>
                    {widgets.map(widget => (
                        <SelectItem key={widget.id} value={widget.id}>{widget.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
              onClick={() => setIsHistoryOpen(true)}
              size="sm"
              variant="outline"
            >
              <BookText className="mr-2 h-4 w-4" />
              Chat History
            </Button>
            <Button
              onClick={handleOpenChat}
              size="sm"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Button>
          </div>
        </div>
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1"
        >
          <ResizablePanel defaultSize={42} className="relative z-20 pr-4">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} minSize={30}>
                <Card className="h-full">
                  <PromptEditor
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    onSave={handlePromptSave}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    onBlur={handleBlurSave}
                    tools={tools}
                  />
                </Card>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} className="pt-4">
                <Card className="h-full">
                  <ExampleUtterances
                    utterances={utterances}
                    onRemoveUtterance={handleRemoveUtterance}
                    onAddUtterance={handleAddUtterance}
                    isGenerating={isGeneratingUtterances}
                    disabled={!useCaseId}
                    onPlayUtterance={handlePlayUtterance}
                    onRegenerate={handleRegenerateUtterances}
                  />
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={33}>
            <Card className="h-full mx-4">
              <TestCases 
                testCases={testCases || []}
                isTesting={isTesting}
                onGenerateTestCases={handleGenerateTestCases}
                isGeneratingTests={isGeneratingTests}
                onPlayTestCase={handlePlayTestCase}
                onRunTests={handleRunTests}
                useCaseId={useCaseId}
                onTestCaseSelect={handleViewTestCase}
                onDeleteTestCase={handleDeleteTestCaseClick}
                onToggleContract={handleToggleContract}
              />
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} className="pl-4">
            <div className="h-full flex flex-col gap-4">
              <Card>
                <AiOptimizer prompt={prompt} useCaseId={useCaseId} onAcceptSuggestion={handleAcceptSuggestion} />
              </Card>
              <Card className="flex-1">
                <PerformanceCharts
                  accuracy={performanceScore}
                  verdict={performanceVerdict}
                  reasons={performanceReasons}
                  missingRequirements={performanceMissingRequirements}
                  violations={performanceViolations}
                  results={testResults}
                  onViewTestCase={handleViewTestCase}
                  isTesting={isTesting}
                />
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <ChatPlayground
        isOpen={isChatOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUtterance(null);
            setSelectedHistoryItem(null);
          }
          setIsChatOpen(open);
        }}
        useCaseId={selectedHistoryItem ? selectedHistoryItem.useCaseId : useCaseId}
        prompt={selectedHistoryItem ? selectedHistoryItem.prompt : chatPrompt}
        utterance={selectedUtterance}
        historyItem={selectedHistoryItem}
        onSaveHistory={handleSaveChatHistory}
        onSaveAsTest={handleSaveAsTest}
      />
      <ChatHistory 
        isOpen={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        history={chatHistory}
        onHistoryItemClick={handleHistoryItemClick} 
      />
       <Sheet open={isTestCaseSheetOpen} onOpenChange={handleTestCaseSheetOpenChange}>
          <SheetContent className="w-full sm:max-w-xl flex flex-col">
            {editedTestCase && (
              <>
                <SheetHeader>
                  <div className="space-y-1.5">
                    {isTestCaseEditing ? (
                      <>
                        <Input
                          value={editedTestCase.name}
                          onChange={(e) => setEditedTestCase(prev => prev ? {...prev, name: e.target.value} : null)}
                          className="text-lg font-semibold h-auto p-0 border-0 shadow-none focus-visible:ring-0"
                          placeholder="Test Case Name"
                        />
                        <Textarea
                          value={editedTestCase.description}
                          onChange={(e) => setEditedTestCase(prev => prev ? {...prev, description: e.target.value} : null)}
                          className="text-sm text-muted-foreground p-0 border-0 shadow-none focus-visible:ring-0 resize-none"
                          placeholder="Test Case Description"
                          rows={2}
                        />
                      </>
                    ) : (
                      <>
                        <SheetTitle>{editedTestCase.name}</SheetTitle>
                        <SheetDescription>{editedTestCase.description}</SheetDescription>
                      </>
                    )}
                  </div>
                </SheetHeader>
                <div className="border-y py-4 my-4">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="contract-switch" className="font-semibold">Contract Test</Label>
                        <Switch
                            id="contract-switch"
                            checked={editedTestCase.contract ?? false}
                            onCheckedChange={handleContractChange}
                            disabled={isSavingTestCase}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground px-1 pt-1">If enabled, the Test will be used at runtime to improve reliability.</p>
                </div>
                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="space-y-6 pr-4">
                        {(editedTestCase.messages || editedTestCase.expectedConversation) && (editedTestCase.messages || editedTestCase.expectedConversation)!.length > 0 ? (
                            (editedTestCase.messages || editedTestCase.expectedConversation)!.map((message, index) => (
                                <ConversationMessage 
                                    key={index} 
                                    message={message} 
                                    isEditing={isTestCaseEditing}
                                    onContentChange={(content) => handleTestCaseMessageChange(index, content)}
                                    onRoleChange={(role) => handleTestCaseMessageRoleChange(index, role)}
                                    onRemove={() => handleRemoveTestCaseMessage(index)}
                                />
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center pt-8">
                                No conversation details available for this test case.
                                {isTestCaseEditing && " Add a message to get started."}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="border-t pt-4 mt-auto space-y-4">
                    {isTestCaseEditing && (
                        <Button onClick={handleAddTestCaseMessage} className="w-full" variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Add Message
                        </Button>
                    )}
                    <div className="flex justify-end gap-2">
                        {isTestCaseEditing ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (selectedTestCase) {
                                            setEditedTestCase(JSON.parse(JSON.stringify(selectedTestCase)));
                                        }
                                        setIsTestCaseEditing(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveTestCase}
                                    disabled={isSavingTestCase}
                                >
                                    {isSavingTestCase && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => setIsTestCaseEditing(true)}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        )}
                    </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
        <AlertDialog open={showDeleteTestCaseDialog} onOpenChange={handleDeleteTestCaseDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the test case
                "{testCaseToDelete?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTestCase}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export default function PromptEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    }>
      <PromptEditorPageContent />
    </Suspense>
  )
}

    

    



