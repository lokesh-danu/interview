# Collaborative Workspace — Technical Design

## Overview

A workspace where users upload documents (PDF, PPTX, XLSX), chat with them using RAG, and run agents that produce reports. Multiple users share a workspace and see each other's uploads and chats in real-time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT                                     │
│                              (Next.js Frontend)                             │
│                                                                             │
│   Upload UI ──── Chat UI ──── Workspace Dashboard ──── Agent Trigger        │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              │ Hono RPC (typed, end-to-end)
                              │ SSE for streaming responses
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API SERVER                                    │
│                            (Hono on Bun/Node)                               │
│                                                                             │
│   /upload        /chat         /workspaces      /documents      /agent      │
│       │             │               │                │              │       │
│       ▼             ▼               ▼                ▼              ▼       │
│   MinIO         SSE stream      CRUD ops         Metadata       Webhook     │
│   upload        handler         for orgs         queries        trigger     │
└───────┬─────────────┬───────────────┬────────────────┬──────────────┬───────┘
        │             │               │                │              │
        │             │               │                │              │
        ▼             ▼               ▼                ▼              ▼
┌───────────┐  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐
│   MinIO   │  │   Redis   │  │ PostgreSQL │  │   pgvector │  │  RabbitMQ │
│  (files)  │  │ (streams) │  │  (schema)  │  │(embeddings)│  │  (tasks)  │
└───────────┘  └───────────┘  └────────────┘  └────────────┘  └─────┬─────┘
                                                                     │
                                                                     │ consume
                                                                     ▼
                           ┌─────────────────────────────────────────────────┐
                           │              WORKER (Python)                     │
                           │                                                  │
                           │   DocumentProcessor: extract → chunk → embed    │
                           │                                                  │
                           │   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
                           │   │ Extract  │──▶│  Chunk   │──▶│  Embed   │   │
                           │   │  (per    │   │ (by para │   │ (local   │   │
                           │   │  format) │   │  /slide) │   │  model)  │   │
                           │   └──────────┘   └──────────┘   └──────────┘   │
                           └─────────────────────────────────────────────────┘

                           ┌─────────────────────────────────────────────────┐
                           │              AGENT (Python / LangGraph)          │
                           │                                                  │
                           │   ReactAgent                                     │
                           │     └── tool: query_embeddings(query, doc_ids)   │
                           │                                                  │
                           │   Reads from: PostgreSQL, pgvector               │
                           │   Writes to: PostgreSQL (chat history, reports)  │
                           │   Sandbox: E2B (for generated code execution)    │
                           └─────────────────────────────────────────────────┘
```

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js (App Router) | RSC, file-based routing, fast iteration |
| API | Hono | Lightweight, built-in RPC support, edge-ready |
| Shared Types | TypeScript package | End-to-end type safety between Next.js ↔ Hono |
| Database | PostgreSQL | Mature, JSONB for metadata, extensions ecosystem |
| Embeddings | pgvector extension | Vector search co-located with relational data |
| Object Storage | MinIO (local dev), S3 (prod) | S3-compatible, easy local setup |
| Message Queue | RabbitMQ | Reliable task delivery, dead-letter support |
| Cache/Streams | Redis | SSE session storage, pub/sub for real-time |
| Document Worker | Python | Best ecosystem for PDF/PPTX/XLSX parsing |
| Agent | LangGraph (Python) | ReAct agent pattern, tool orchestration |
| Sandbox | E2B | Sandboxed code execution for agent-generated code |

---

## Data Model

```sql
-- Tenancy
CREATE TABLE orgs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id),
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,  -- application/pdf, application/vnd.openxmlformats-...
    storage_key TEXT NOT NULL,  -- MinIO/S3 object key
    status      TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | processing | ready | failed
    metadata    JSONB DEFAULT '{}',  -- page count, slide count, etc.
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES orgs(id),
    chunk_index INT NOT NULL,
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',  -- page number, slide number, etc.
    embedding   vector(1536),  -- adjust dimension to embedding model
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_embedding ON document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_chunks_org ON document_chunks(org_id);
CREATE INDEX idx_chunks_doc ON document_chunks(document_id);

-- Chat
CREATE TABLE chats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    title       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,  -- user | assistant | system
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',  -- sources, tool calls, etc.
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Agent Runs
CREATE TABLE agent_runs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id),
    triggered_by UUID NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed
    input_doc_ids UUID[] DEFAULT '{}',
    output      TEXT,  -- final report/answer
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);
```

---

## API Surface (Hono RPC)

### Workspaces & Users

```
POST   /api/orgs                    — create org
GET    /api/orgs/:id                — get org details
POST   /api/orgs/:id/join           — join org (stubbed)

GET    /api/users/me                 — current user (stubbed)
```

### Documents

```
POST   /api/documents/upload         — multipart upload → MinIO → enqueue processing job
GET    /api/documents                — list documents for current org
GET    /api/documents/:id            — get document metadata + status
DELETE /api/documents/:id            — delete document + chunks + MinIO object
```

### Chat

```
POST   /api/chats                   — create new chat
GET    /api/chats                   — list chats for current org
GET    /api/chats/:id               — get chat with messages
POST   /api/chats/:id/messages      — send message, returns SSE stream

SSE Stream Events:
  event: delta       — { content: "partial text" }
  event: sources     — { documents: [{ id, filename, chunk }] }
  event: done        — { message_id, full_content }
  event: error       — { error }
```

### Agent

```
POST   /api/agent/run               — trigger agent run (webhook-compatible)
GET    /api/agent/runs/:id          — get run status + output
```

---

## Key Flows

### Document Upload & Processing

```
Browser                     API Server                 MinIO           RabbitMQ         Worker
  │                            │                         │                │                │
  │  POST /documents/upload    │                         │                │                │
  │  (multipart/form-data)     │                         │                │                │
  │───────────────────────────▶│                         │                │                │
  │                            │  PutObject              │                │                │
  │                            │────────────────────────▶│                │                │
  │                            │                         │                │                │
  │                            │  INSERT documents       │                │                │
  │                            │  (status: 'uploaded')   │                │                │
  │                            │                         │                │                │
  │                            │  publish message        │                │                │
  │                            │  {doc_id, storage_key}  │                │                │
  │                            │────────────────────────────────────────▶│                │
  │                            │                         │                │                │
  │  201 { document }          │                         │                │  consume        │
  │◀───────────────────────────│                         │                │───────────────▶│
  │                            │                         │                │                │
  │                            │                         │  GetObject     │                │
  │                            │                         │◀───────────────────────────────│
  │                            │                         │                │                │
  │                            │                         │  file bytes    │                │
  │                            │                         │───────────────────────────────▶│
  │                            │                         │                │                │
  │                            │                         │                │   Extract      │
  │                            │                         │                │   Chunk        │
  │                            │                         │                │   Embed        │
  │                            │                         │                │                │
  │                            │  INSERT document_chunks │                │                │
  │                            │  UPDATE documents       │                │                │
  │                            │  (status: 'ready')      │                │                │
  │                            │◀─────────────────────────────────────────────────────────│
```

**Extraction by format:**
- PDF → `pymupdf` or `pdfplumber` (text + tables)
- PPTX → `python-pptx` (slide text + notes)
- XLSX → `openpyxl` (sheet data as text rows)

### Chat with Streaming

```
Browser                         API Server                  Redis         Agent
  │                                │                          │             │
  │  POST /chats/:id/messages      │                          │             │
  │  { content, doc_ids? }         │                          │             │
  │───────────────────────────────▶│                          │             │
  │                                │                          │             │
  │                                │  Create SSE session      │             │
  │                                │  session_id → Redis      │             │
  │                                │─────────────────────────▶│             │
  │                                │                          │             │
  │                                │  Invoke agent            │             │
  │                                │────────────────────────────────────────▶
  │                                │                          │             │
  │  SSE stream opens              │                          │             │
  │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │             │
  │                                │                          │             │
  │                                │  PUBLISH delta events    │             │
  │                                │◀─────────────────────────────────────────
  │                                │─────────────────────────▶│             │
  │                                │                          │             │
  │  event: delta { content }      │  SUBSCRIBE → SSE         │             │
  │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│◀─────────────────────────│             │
  │                                │                          │             │
  │  event: sources { docs }       │                          │             │
  │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │             │
  │                                │                          │             │
  │  event: done { message_id }    │                          │             │
  │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │             │
  │                                │                          │             │
  │                                │  INSERT messages         │             │
  │                                │  (user + assistant)      │             │
  │                                │                          │             │
```

### Agent Tool: Query Embeddings

```
Agent (LangGraph)
  │
  │  query_embeddings("What are the Q3 revenue targets?", doc_ids=[...])
  │
  ▼
┌─────────────────────────────────────────────────────┐
│  1. Embed query using same model as worker           │
│  2. SELECT id, content, metadata                     │
│     FROM document_chunks                             │
│     WHERE org_id = ?                                 │
│       AND document_id = ANY(?)                       │
│     ORDER BY embedding <=> ?                         │
│     LIMIT 10;                                        │
│  3. Return chunks with source metadata               │
└─────────────────────────────────────────────────────┘
```

---

## Infrastructure

### Local Development

| Component | Setup |
|-----------|-------|
| PostgreSQL + pgvector | Docker compose |
| MinIO | Docker compose |
| RabbitMQ | Docker compose |
| Redis | Docker compose |
| Next.js | `npm run dev` |
| Hono API | `bun run --watch` |
| Python Worker | `python worker.py` |
| Agent | `python agent.py` |

### Production (No IaC — reasoning only)

| Component | Hosting | Notes |
|-----------|---------|-------|
| Next.js | Vercel or container on ECS/Render | Edge functions for SSR |
| Hono API | Container on ECS/Render/Fly | Stateless, scale horizontally |
| PostgreSQL | RDS or Neon | pgvector extension required |
| MinIO | S3 (swap MinIO for S3) | Same SDK, different endpoint |
| RabbitMQ | Amazon MQ or CloudAMQP | Managed broker reduces ops |
| Redis | ElastiCache or Upstash | For SSE sessions + caching |
| Python Workers | ECS tasks or Lambda | Scale based on queue depth |
| Agent | Container on ECS | Long-running, needs E2B access |

### Sandbox: E2B

Agent-generated code runs in E2B sandboxes:

```
Agent → E2B SDK → Create sandbox (isolated VM)
       → Execute Python code
       → Read stdout/stderr
       → Destroy sandbox
```

- Sandboxes are ephemeral (created per execution)
- Network-isolated by default
- Resource limits: configurable CPU/memory per sandbox
- Cleanup: auto-destroy after timeout (default 5 min)

---

## Shared Type Layer

Single TypeScript package shared between Next.js and Hono:

```typescript
// packages/shared/src/types.ts

// Request/Response types
export interface UploadDocumentRequest {
  file: File;  // multipart
}

export interface DocumentResponse {
  id: string;
  filename: string;
  mimeType: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  documentIds?: string[];  // filter to specific docs, or all
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    documentId: string;
    filename: string;
    chunk: string;
  }>;
  createdAt: string;
}

export interface TriggerAgentRunRequest {
  documentIds: string[];
  prompt?: string;
}

export interface AgentRun {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  createdAt: string;
  completedAt?: string;
}

// Hono RPC client type inference
export type AppRouter = typeof import('../../backend/src/index').app;
```

---

## Decisions & Tradeoffs

| Decision | Alternative | Why |
|----------|-------------|-----|
| Upload to API, not presigned URL | Presigned URL to S3 | Simpler for local dev with MinIO; no CORS config; API validates before storage |
| pgvector for embeddings | Separate vector DB (Pinecone, Qdrant) | Single database, no sync issues, good enough for scale |
| RabbitMQ for task queue | Redis Streams, SQS | Mature, dead-letter support, priority queues if needed |
| SSE over WebSocket | WebSocket | Simpler server implementation, HTTP-compatible, auto-reconnect |
| LangGraph agent | Custom agent loop | Built-in ReAct pattern, tool management, state persistence |
| E2B sandbox | Local Docker containers | Managed sandbox infra, no container orchestration code |
| One org per user | Multi-org with roles | Simplifies permissions model for MVP |

---

## Decisions Log

| Question | Answer |
|----------|--------|
| Embedding model | Mocked (random vectors) — swap to real model later |
| Chunk size | 512 tokens |
| Chat context window | Last 20 messages |
| Rate limiting | None for MVP |
| Max file size | 50MB |
| Concurrent uploads | Queue multiple, process in parallel |
