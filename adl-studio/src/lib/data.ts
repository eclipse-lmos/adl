export type ContextItem = {
  key: string;
  value: any;
};

export type ToolCall = {
  name: string;
  arguments: string;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  format: 'text';
  context?: ContextItem[];
  toolCalls?: ToolCall[];
};

export type TestCase = {
  id: string;
  name: string;
  description: string;
  useCaseId?: string;
  adlId?: string;
  expectedConversation?: ConversationTurn[];
  messages?: Message[];
  contract?: boolean;
};

export type ConversationTurn = {
  role: string;
  content: string;
};

export type TestExecutionEvidence = {
  quote: string;
  mapsTo: string;
};

export type TestExecutionDetails = {
  verdict: string;
  score: number;
  reasons: string[];
  missingRequirements: string[];
  violations: string[];
  evidence: TestExecutionEvidence[];
};

export type TestExecutionResult = {
  testCaseId: string;
  testCaseName: string;
  status: string;
  score: number;
  testCase: TestCase;
  executedVariantIndex?: number | null;
  executedConversation: ConversationTurn[];
  actualConversation: ConversationTurn[];
  useCases: string[];
  details: TestExecutionDetails;
  failureReason?: string | null;
};

export type TestRunResult = {
  id: string;
  adlId: string;
  owner: string;
  createdAt: string;
  requestedTestCaseId?: string | null;
  overallScore: number;
  results: TestExecutionResult[];
};

export type PerformanceData = {
  model: string;
  latency: number;
  cost: number;
  quality: number;
};

export type UseCasePrompt = {
  id: string;
  createdAt: string;
  tags: string[];
  content: string;
  output?: string | null;
};

export type ChatHistoryItem = {
  id: string;
  timestamp: string;
  utterance: string;
  useCaseId: string;
  modelResponse: string;
  messages: Message[];
  prompt: string;
};

export type Agent = {
  id: string;
  name: string;
  description?: string | null;
  models?: string[] | null;
  tags?: string[] | null;
  mcpServers?: string[] | null;
  role?: string | null;
  corePrompt?: string | null;
  active?: boolean | null;
};
