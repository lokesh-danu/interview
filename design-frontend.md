# Frontend Service — Design Doc

## Overview

Next.js App Router frontend for the Collaborative Workspace. Handles document uploads, real-time chat with SSE streaming, and workspace management. Communicates with Hono API via typed RPC client.

---

## Tech Stack

- Next.js 14+ (App Router, React Server Components)
- TypeScript
- Tailwind CSS
- Shared types from `packages/shared`
- Hono RPC client (typed API calls)

---

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing / redirect to workspace
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx        # Stubbed login (pick user)
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + workspace context
│   │   ├── workspace/
│   │   │   ├── page.tsx        # Workspace overview
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx    # Document list + upload
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Document detail
│   │   │   ├── chats/
│   │   │   │   ├── page.tsx    # Chat list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Chat view
│   │   │   └── agent/
│   │   │       └── page.tsx    # Agent run history + trigger
│   │   └── settings/
│   │       └── page.tsx        # Org settings (minimal)
├── components/
│   ├── ui/                     # Shared UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── skeleton.tsx
│   │   └── toast.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── workspace-switcher.tsx
│   ├── document/
│   │   ├── upload-dropzone.tsx # Drag & drop upload zone
│   │   ├── upload-progress.tsx # Per-file upload progress
│   │   ├── document-list.tsx   # Table/grid of documents
│   │   ├── document-card.tsx   # Single document card
│   │   └── status-badge.tsx    # uploaded/processing/ready/failed
│   ├── chat/
│   │   ├── chat-list.tsx       # Sidebar chat list
│   │   ├── chat-view.tsx       # Main chat view
│   │   ├── message-bubble.tsx  # Single message
│   │   ├── message-input.tsx   # Input with send button
│   │   ├── source-card.tsx     # Document source reference
│   │   └── streaming-text.tsx  # Animated streaming text
│   └── agent/
│       ├── run-trigger.tsx     # Select docs + trigger run
│       ├── run-card.tsx        # Single run status card
│       └── run-output.tsx      # Display agent output
├── lib/
│   ├── api.ts                  # Hono RPC client setup
│   ├── sse.ts                  # SSE connection helper
│   └── utils.ts                # Shared utilities
├── hooks/
│   ├── use-upload.ts           # Upload state management
│   ├── use-chat.ts             # Chat + SSE streaming
│   └── use-documents.ts        # Document list + refresh
├── stores/
│   ├── workspace-store.ts      # Current org/user context
│   └── chat-store.ts           # Active chat state
└── types/
    └── index.ts                # Re-export from shared
```

---

## Key Pages

### 1. Login (Stubbed)

```
┌─────────────────────────────────────────┐
│          Collaborative Workspace         │
│                                         │
│   Select user to continue:              │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ alice@example.com            ▼  │   │
│   └─────────────────────────────────┘   │
│                                         │
│          [ Continue ]                   │
└─────────────────────────────────────────┘
```

- Fetches user list from API (or hardcoded for MVP)
- Stores selected user in cookie/localStorage
- Redirects to workspace

### 2. Workspace Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Workspace Name                    [User] [Settings]      │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ Sidebar  │   Welcome back, Alice                                │
│          │                                                      │
│ Docs     │   ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│ Chats    │   │ 12          │  │ 5           │  │ 3          │ │
│ Agent    │   │ Documents   │  │ Chats       │  │ Agent Runs │ │
│          │   └─────────────┘  └─────────────┘  └────────────┘ │
│          │                                                      │
│          │   Recent Activity                                    │
│          │   ─────────────────                                  │
│          │   • Bob uploaded Q3-Report.pdf (2 min ago)           │
│          │   • Alice started chat "Revenue Analysis" (1 hr ago) │
│          │   • Agent run completed (3 hr ago)                   │
└──────────┴──────────────────────────────────────────────────────┘
```

### 3. Documents Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Documents                                     [+ Upload]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │           Drag & drop files here                         │   │
│  │           or click to browse                             │   │
│  │                                                          │   │
│  │           PDF, PPTX, XLSX — Max 50MB                     │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Uploads in progress:                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Q3-Report.pdf       ████████████░░░░  72%  2.4 MB/3.2MB│   │
│  │ Slides.pptx         ████████████████  100% ✓            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────┬──────────┬──────────┬───────────┬──────────┐   │
│  │ Name      │ Type     │ Size     │ Status    │ Actions  │   │
│  ├───────────┼──────────┼──────────┼───────────┼──────────┤   │
│  │ Q3-Report │ PDF      │ 3.2 MB   │ ● Ready   │ Chat Del │   │
│  │ Budget    │ XLSX     │ 1.1 MB   │ ● Process │          │   │
│  │ Pitch     │ PPTX     │ 8.4 MB   │ ● Failed  │ Retry    │   │
│  └───────────┴──────────┴──────────┴───────────┴──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Upload behavior:**
- Multiple files can be selected/dropped
- Each file uploads independently (parallel)
- Progress bar per file via `XMLHttpRequest` progress events
- On complete: file moves from "in progress" to document table
- Status polling: poll every 2s until status is `ready` or `failed`

### 4. Chat Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Chat: Revenue Analysis                                          │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│ Chat List        │  Messages                                    │
│                  │                                              │
│ ▶ Revenue Analys │  ┌──────────────────────────────────────┐   │
│   Budget Review  │  │ You                                  │   │
│   Competitor     │  │ What were Q3 revenue targets?        │   │
│                  │  └──────────────────────────────────────┘   │
│ [+ New Chat]     │                                              │
│                  │  ┌──────────────────────────────────────┐   │
│                  │  │ Assistant                            │   │
│                  │  │                                      │   │
│                  │  │ Based on the Q3 report, revenue      │   │
│                  │  │ targets were:                        │   │
│                  │  │                                      │   │
│                  │  │ • APAC: $4.2M (+15% YoY)            │   │
│                  │  │ • EMEA: $3.8M (+12% YoY)            │   │
│                  │  │ • Americas: $5.1M (+8% YoY)         │   │
│                  │  │                                      │   │
│                  │  │ Sources:                             │   │
│                  │  │ ┌────────────────────────────────┐  │   │
│                  │  │ │ Q3-Report.pdf — Page 12       │  │   │
│                  │  │ │ "Revenue targets by region..." │  │   │
│                  │  │ └────────────────────────────────┘  │   │
│                  │  └──────────────────────────────────────┘   │
│                  │                                              │
│                  │  ┌──────────────────────────────────────┐   │
│                  │  │ Ask a question...              [Send] │   │
│                  │  └──────────────────────────────────────┘   │
│                  │                                              │
│                  │  Filter: [All Documents ▼]                  │
└──────────────────┴──────────────────────────────────────────────┘
```

**Chat behavior:**
- New message → POST to API → SSE stream opens
- Stream events:
  - `delta`: append text to message bubble with typing animation
  - `sources`: render source cards below message
  - `done`: finalize message, save to chat history
  - `error`: show error toast
- Document filter: dropdown to select specific docs or "All"
- Auto-scroll to bottom on new messages

### 5. Agent Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent Runs                                      [New Run]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Trigger New Run:                                                │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Select documents:                                        │    │
│ │ ☑ Q3-Report.pdf  ☑ Budget.xlsx  ☐ Pitch.pptx           │    │
│ │                                                          │    │
│ │ Prompt (optional):                                       │    │
│ │ ┌─────────────────────────────────────────────────────┐ │    │
│ │ │ Summarize key financial metrics and projections     │ │    │
│ │ └─────────────────────────────────────────────────────┘ │    │
│ │                                                          │    │
│ │                                        [Run Agent]      │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ Past Runs:                                                      │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ ● Completed — 2 hours ago                                │    │
│ │ Docs: Q3-Report.pdf, Budget.xlsx                         │    │
│ │ Output: "Financial Summary: Total revenue for Q3..."     │    │
│ │                                          [View Full]     │    │
│ └─────────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ ◐ Running — Started 5 min ago                            │    │
│ │ Docs: Pitch.pptx                                         │    │
│ │ Status: Processing...                                    │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### `upload-dropzone.tsx`

```typescript
// Responsibilities:
// - Drag & drop zone with file input fallback
// - Validates file type (PDF, PPTX, XLSX) and size (≤50MB)
// - Triggers upload for each file independently
// - Emits onUploadStart, onProgress, onComplete, onError

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSizeBytes?: number; // default 50MB
  accept?: string[];     // default: PDF, PPTX, XLSX MIME types
}
```

### `use-upload.ts`

```typescript
// Manages upload state for multiple concurrent files
// Uses XMLHttpRequest for progress tracking

interface UploadState {
  files: Map<string, {
    file: File;
    progress: number;      // 0-100
    status: 'uploading' | 'processing' | 'ready' | 'failed';
    documentId?: string;
    error?: string;
  }>;
}

// Methods:
// - uploadFiles(files: File[]): void
// - retryUpload(fileId: string): void
// - removeUpload(fileId: string): void
```

### `use-chat.ts`

```typescript
// Manages chat state and SSE connection

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentSources: Source[];
}

// Methods:
// - sendMessage(content: string, docIds?: string[]): Promise<void>
// - loadChatHistory(chatId: string): Promise<void>

// Internally:
// - Opens SSE connection on sendMessage
// - Parses events: delta, sources, done, error
// - Updates message state incrementally
```

### `sse.ts`

```typescript
// SSE connection helper with auto-reconnect

export function createSSEConnection(
  url: string,
  options: {
    onDelta?: (content: string) => void;
    onSources?: (sources: Source[]) => void;
    onDone?: (messageId: string) => void;
    onError?: (error: string) => void;
    onOpen?: () => void;
  }
): {
  close: () => void;
};
```

### `api.ts`

```typescript
// Hono RPC client with type inference

import { hc } from 'hono/client';
import type { AppRouter } from '@workspace/shared';

export const api = hc<AppRouter>('http://localhost:3001');

// Usage:
// const res = await api.documents.$get();
// const data = await res.json(); // fully typed
```

---

## State Management

### Workspace Store (Zustand)

```typescript
interface WorkspaceStore {
  currentOrg: Org | null;
  currentUser: User | null;
  setOrg: (org: Org) => void;
  setUser: (user: User) => void;
}
```

### Chat Store (Zustand)

```typescript
interface ChatStore {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChat: (id: string) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateLastMessage: (chatId: string, content: string) => void;
}
```

---

## API Integration

All API calls go through the Hono RPC client. Key endpoints:

| Action | Method | Endpoint |
|--------|--------|----------|
| List documents | GET | `/api/documents` |
| Upload document | POST | `/api/documents/upload` |
| Delete document | DELETE | `/api/documents/:id` |
| Create chat | POST | `/api/chats` |
| List chats | GET | `/api/chats` |
| Get chat messages | GET | `/api/chats/:id` |
| Send message | POST | `/api/chats/:id/messages` |
| Trigger agent run | POST | `/api/agent/run` |
| Get agent runs | GET | `/api/agent/runs` |

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Implementation Order

1. **Project setup**: Next.js + Tailwind + shared types
2. **Login stub**: User selector, store in cookie
3. **Layout**: Sidebar, header, workspace context
4. **Documents page**: Upload dropzone, document list, status polling
5. **Chat page**: Chat list, message view, SSE streaming
6. **Agent page**: Run trigger, run history, output display
7. **Polish**: Loading states, error handling, responsive layout

---

## Dependencies on Other Services

| Dependency | From | Used For |
|------------|------|----------|
| API types | Shared package | Type-safe RPC calls |
| API URL | Env variable | Connecting to Hono API |
| Document statuses | API polling | Showing processing state |
| SSE endpoint | API | Streaming chat responses |
