import type { Document, Chat, ChatMessage, AgentRun, User, Org } from '@/types';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockUsers: User[] = [
  { id: '1', email: 'alice@example.com', name: 'Alice Chen' },
  { id: '2', email: 'bob@example.com', name: 'Bob Smith' },
  { id: '3', email: 'carol@example.com', name: 'Carol Davis' },
];

const mockOrgs: Org[] = [
  { id: '1', name: 'Acme Corp', slug: 'acme' },
];

let mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Q4 Revenue Report.pdf',
    type: 'pdf',
    size: 2_450_000,
    status: 'ready',
    uploadedBy: '1',
    uploadedAt: '2026-06-01T09:15:00Z',
  },
  {
    id: 'doc-2',
    name: 'Product Roadmap 2026.pptx',
    type: 'pptx',
    size: 5_120_000,
    status: 'ready',
    uploadedBy: '2',
    uploadedAt: '2026-06-03T14:30:00Z',
  },
  {
    id: 'doc-3',
    name: 'Customer Survey Results.xlsx',
    type: 'xlsx',
    size: 890_000,
    status: 'ready',
    uploadedBy: '1',
    uploadedAt: '2026-06-05T11:00:00Z',
  },
  {
    id: 'doc-4',
    name: 'Engineering Sprint Retro.pdf',
    type: 'pdf',
    size: 1_340_000,
    status: 'ready',
    uploadedBy: '3',
    uploadedAt: '2026-06-07T16:45:00Z',
  },
  {
    id: 'doc-5',
    name: 'Investor Deck Q3.pptx',
    type: 'pptx',
    size: 8_900_000,
    status: 'processing',
    uploadedBy: '2',
    uploadedAt: '2026-06-10T08:20:00Z',
  },
  {
    id: 'doc-6',
    name: 'Budget Forecast 2026.xlsx',
    type: 'xlsx',
    size: 1_100_000,
    status: 'ready',
    uploadedBy: '1',
    uploadedAt: '2026-06-12T10:00:00Z',
  },
  {
    id: 'doc-7',
    name: 'Design System Guidelines.pdf',
    type: 'pdf',
    size: 4_200_000,
    status: 'uploaded',
    uploadedBy: '3',
    uploadedAt: '2026-06-13T09:00:00Z',
  },
  {
    id: 'doc-8',
    name: 'Competitive Analysis.xlsx',
    type: 'xlsx',
    size: 670_000,
    status: 'failed',
    uploadedBy: '2',
    uploadedAt: '2026-06-14T13:10:00Z',
    error: 'Unsupported formula engine detected',
  },
];

let mockChats: Chat[] = [
  {
    id: 'chat-1',
    title: 'Q4 revenue summary',
    createdAt: '2026-06-02T10:00:00Z',
    updatedAt: '2026-06-02T10:25:00Z',
    documentIds: ['doc-1'],
  },
  {
    id: 'chat-2',
    title: 'Roadmap priorities',
    createdAt: '2026-06-04T09:00:00Z',
    updatedAt: '2026-06-04T09:45:00Z',
    documentIds: ['doc-2', 'doc-3'],
  },
  {
    id: 'chat-3',
    title: 'Sprint retro action items',
    createdAt: '2026-06-08T14:00:00Z',
    updatedAt: '2026-06-08T14:30:00Z',
    documentIds: ['doc-4'],
  },
  {
    id: 'chat-4',
    title: 'Budget vs forecast',
    createdAt: '2026-06-12T11:00:00Z',
    updatedAt: '2026-06-12T11:20:00Z',
    documentIds: ['doc-1', 'doc-6'],
  },
];

let mockMessages: Record<string, ChatMessage[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'Summarise the Q4 revenue highlights.',
      createdAt: '2026-06-02T10:00:00Z',
    },
    {
      id: 'msg-2',
      chatId: 'chat-1',
      role: 'assistant',
      content:
        'Q4 revenue grew 18% YoY to $14.2 M, driven primarily by the enterprise segment (+27%). ARR closed at $52 M. Key risks flagged in the report include slower SMB growth and increased churn in the APAC region.',
      sources: [
        {
          documentId: 'doc-1',
          documentName: 'Q4 Revenue Report.pdf',
          page: 3,
          excerpt: 'Total revenue for Q4 reached $14.2M, an 18% increase year-over-year...',
        },
        {
          documentId: 'doc-1',
          documentName: 'Q4 Revenue Report.pdf',
          page: 7,
          excerpt: 'ARR stood at $52M at the close of Q4, up from $44M at the end of Q3...',
        },
      ],
      createdAt: '2026-06-02T10:01:00Z',
    },
  ],
  'chat-2': [
    {
      id: 'msg-3',
      chatId: 'chat-2',
      role: 'user',
      content: 'What are the top three priorities on the 2026 roadmap?',
      createdAt: '2026-06-04T09:00:00Z',
    },
    {
      id: 'msg-4',
      chatId: 'chat-2',
      role: 'assistant',
      content:
        'The top three priorities are: (1) real-time collaboration features, (2) AI-powered document insights, and (3) enterprise SSO and compliance tooling. These align closely with the customer survey feedback showing 72% demand for collaboration and 64% for AI features.',
      sources: [
        {
          documentId: 'doc-2',
          documentName: 'Product Roadmap 2026.pptx',
          page: 4,
          excerpt: 'Priority 1: Real-time collaboration — Q1-Q2 2026...',
        },
        {
          documentId: 'doc-3',
          documentName: 'Customer Survey Results.xlsx',
          excerpt: '72% of respondents rated real-time collaboration as "very important"...',
        },
      ],
      createdAt: '2026-06-04T09:02:00Z',
    },
  ],
};

let mockAgentRuns: AgentRun[] = [
  {
    id: 'run-1',
    status: 'completed',
    documentIds: ['doc-1', 'doc-6'],
    prompt: 'Compare Q4 actuals against the budget forecast and flag variances > 10%.',
    output:
      'Three line items exceeded the 10% variance threshold: Marketing spend (+14%), Cloud infrastructure (+12%), and Contractor costs (+18%). Under-spending was observed in Travel (-22%) and Hiring (-15%).',
    startedAt: '2026-06-12T12:00:00Z',
    completedAt: '2026-06-12T12:03:45Z',
  },
  {
    id: 'run-2',
    status: 'completed',
    documentIds: ['doc-4'],
    prompt: 'Extract all action items from the sprint retro and assign owners.',
    output:
      'Found 5 action items: (1) Improve PR review turnaround — Owner: Eng Lead, (2) Add staging smoke tests — Owner: QA, (3) Reduce meeting load to < 10 hrs/wk — Owner: PM, (4) Document onboarding checklist — Owner: DevRel, (5) Schedule incident drill — Owner: SRE.',
    startedAt: '2026-06-08T15:00:00Z',
    completedAt: '2026-06-08T15:02:10Z',
  },
  {
    id: 'run-3',
    status: 'failed',
    documentIds: ['doc-8'],
    prompt: 'Identify the top 5 competitors and summarize their positioning.',
    error: 'Document processing failed: unsupported formula engine.',
    startedAt: '2026-06-14T13:20:00Z',
    completedAt: '2026-06-14T13:20:05Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Simple incrementing ID generator for mock creates. */
let nextId = 100;
const generateId = (prefix: string): string => `${prefix}-${++nextId}`;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const api = {
  // ---- Auth / Users -------------------------------------------------------

  getUsers: async (): Promise<User[]> => {
    await delay(300);
    return mockUsers;
  },

  getOrgs: async (): Promise<Org[]> => {
    await delay(200);
    return mockOrgs;
  },

  // ---- Documents ----------------------------------------------------------

  getDocuments: async (): Promise<Document[]> => {
    await delay(400);
    return mockDocuments;
  },

  getDocument: async (id: string): Promise<Document> => {
    await delay(200);
    const doc = mockDocuments.find((d) => d.id === id);
    if (!doc) throw new Error(`Document ${id} not found`);
    return doc;
  },

  uploadDocument: async (
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<Document> => {
    const id = generateId('doc');
    const totalSteps = 20;

    // Simulate upload progress
    for (let i = 1; i <= totalSteps; i++) {
      await delay(80);
      onProgress?.(Math.round((i / totalSteps) * 80)); // 0-80% during upload
    }

    // Create document in "uploaded" state
    const doc: Document = {
      id,
      name: file.name,
      type: file.name.endsWith('.pdf')
        ? 'pdf'
        : file.name.endsWith('.pptx')
          ? 'pptx'
          : 'xlsx',
      size: file.size,
      status: 'processing',
      uploadedBy: '1', // current user
      uploadedAt: new Date().toISOString(),
    };
    mockDocuments = [...mockDocuments, doc];

    // Simulate processing (80-100%)
    for (let i = 81; i <= 100; i += 2) {
      await delay(100);
      onProgress?.(i);
    }

    // Mark ready
    doc.status = 'ready';
    onProgress?.(100);
    return doc;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await delay(300);
    const index = mockDocuments.findIndex((d) => d.id === id);
    if (index === -1) throw new Error(`Document ${id} not found`);
    mockDocuments = [...mockDocuments.slice(0, index), ...mockDocuments.slice(index + 1)];
  },

  // ---- Chats --------------------------------------------------------------

  getChats: async (): Promise<Chat[]> => {
    await delay(300);
    return mockChats;
  },

  getChatMessages: async (chatId: string): Promise<ChatMessage[]> => {
    await delay(350);
    return mockMessages[chatId] ?? [];
  },

  createChat: async (title: string, documentIds: string[]): Promise<Chat> => {
    await delay(250);
    const chat: Chat = {
      id: generateId('chat'),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documentIds,
    };
    mockChats = [...mockChats, chat];
    mockMessages[chat.id] = [];
    return chat;
  },

  sendMessage: async (chatId: string, content: string): Promise<ChatMessage> => {
    await delay(500);

    const chat = mockChats.find((c) => c.id === chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    // Persist the user message
    const userMessage: ChatMessage = {
      id: generateId('msg'),
      chatId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    mockMessages[chatId] = [...(mockMessages[chatId] ?? []), userMessage];

    // Simulate assistant reply
    const docs = mockDocuments.filter((d) => chat.documentIds.includes(d.id));
    const assistantMessage: ChatMessage = {
      id: generateId('msg'),
      chatId,
      role: 'assistant',
      content: `Based on ${docs.length} linked document${docs.length !== 1 ? 's' : ''}, here is a summary: ${content}`,
      sources: docs.map((d) => ({
        documentId: d.id,
        documentName: d.name,
        excerpt: `Relevant excerpt from ${d.name}...`,
      })),
      createdAt: new Date().toISOString(),
    };
    mockMessages[chatId] = [...(mockMessages[chatId] ?? []), assistantMessage];

    // Update chat timestamp
    chat.updatedAt = assistantMessage.createdAt;

    return assistantMessage;
  },

  // ---- Agent Runs ---------------------------------------------------------

  getAgentRuns: async (): Promise<AgentRun[]> => {
    await delay(350);
    return mockAgentRuns;
  },

  triggerAgentRun: async (
    documentIds: string[],
    prompt?: string,
  ): Promise<AgentRun> => {
    await delay(400);

    const run: AgentRun = {
      id: generateId('run'),
      status: 'running',
      documentIds,
      prompt,
      startedAt: new Date().toISOString(),
    };
    mockAgentRuns = [...mockAgentRuns, run];

    // Simulate completion after a short delay
    const finishDelay = 2_000 + Math.random() * 3_000;
    setTimeout(() => {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      run.output = `Agent processed ${documentIds.length} document(s). Analysis complete.`;
    }, finishDelay);

    return run;
  },
};
