// User and Org
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
}

// Document
export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'pptx' | 'xlsx';
  size: number; // bytes
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  uploadedBy: string; // user ID
  uploadedAt: string; // ISO timestamp
  error?: string;
}

// Chat
export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  createdAt: string;
}

export interface Source {
  documentId: string;
  documentName: string;
  page?: number;
  excerpt: string;
}

// Agent
export interface AgentRun {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  documentIds: string[];
  prompt?: string;
  output?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// Upload state (for frontend use)
export interface UploadState {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  documentId?: string;
  error?: string;
}
