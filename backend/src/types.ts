// Shared types - mirrors frontend/types/index.ts

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
}

export interface Org {
  id: string;
  name: string;
}

export interface Document {
  id: string;
  orgId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  size: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  orgId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

export interface Chat {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    sources?: Source[];
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface Source {
  documentId: string;
  filename: string;
  chunk: string;
}

export interface AgentRun {
  id: string;
  orgId: string;
  triggeredBy: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputDocIds: string[];
  output: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
}

// API Request/Response types
export interface UploadDocumentResponse {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  status: Document['status'];
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  documentIds?: string[];
}

export interface TriggerAgentRunRequest {
  documentIds: string[];
  prompt?: string;
}

// SSE Event types
export type SSEEvent =
  | { type: 'delta'; data: { content: string } }
  | { type: 'sources'; data: { documents: Source[] } }
  | { type: 'done'; data: { message_id: string; full_content: string } }
  | { type: 'error'; data: { error: string } };

// Queue message types
export interface DocumentProcessMessage {
  documentId: string;
  storageKey: string;
}

export interface ChatMessageQueue {
  sessionId: string;
  chatId: string;
  orgId: string;
  userId: string;
  content: string;
  documentIds: string[];
  contextMessages: Array<{ role: string; content: string }>;
}

export interface AgentRunQueue {
  runId: string;
  orgId: string;
  documentIds: string[];
  prompt?: string;
}
