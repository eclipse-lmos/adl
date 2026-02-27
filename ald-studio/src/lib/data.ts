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
  expectedConversation?: Message[];
  messages?: Message[];
  contract?: boolean;
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

    