# API Service — Design Doc

## Overview

Hono-based REST API server for the Collaborative Workspace. Handles document uploads to MinIO, publishes processing jobs to RabbitMQ, serves chat with SSE streaming, and provides endpoints for agent runs. Communicates with frontend via typed RPC.

---

## Tech Stack

- Hono (web framework)
- TypeScript
- Bun or Node.js runtime
- PostgreSQL (via `pg` or Drizzle ORM)
- MinIO SDK
- RabbitMQ (via `amqplib`)
- Redis (for SSE session management)

---

## File Structure

```
backend/
├── src/
│   ├── index.ts                # Hono app entry point
│   ├── routes/
│   │   ├── orgs.ts             # Org CRUD
│   │   ├── users.ts            # User endpoints (stubbed)
│   │   ├── documents.ts        # Upload, list, delete
│   │   ├── chats.ts            # Chat CRUD + message SSE
│   │   └── agent.ts            # Agent run trigger + status
│   ├── middleware/
│   │   ├── auth.ts             # Stubbed auth (extract user from header)
│   │   ├── org.ts              # Org context middleware
│   │   └── error.ts            # Global error handler
│   ├── services/
│   │   ├── storage.ts          # MinIO operations
│   │   ├── queue.ts            # RabbitMQ publish
│   │   ├── sse.ts              # Redis-backed SSE manager
│   │   └── db.ts               # Database queries
│   ├── db/
│   │   ├── schema.ts           # Table definitions (Drizzle)
│   │   ├── migrations/         # SQL migrations
│   │   └── index.ts            # Connection pool
│   ├── queue/
│   │   └── publisher.ts        # RabbitMQ connection + publish
│   ├── sse/
│   │   ├── manager.ts          # SSE session management via Redis
│   │   └── handler.ts          # SSE endpoint handler
│   └── types/
│       └── index.ts            # Re-export from shared
├── package.json
└── tsconfig.json
```

---

## Routes

### Auth Middleware (Stubbed)

```typescript
// Every request must have X-User-Id header (or cookie)
// Middleware extracts user, attaches to context

app.use('*', async (c, next) => {
  const userId = c.req.header('X-User-Id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const user = await db.users.findById(userId);
  if (!user) return c.json({ error: 'User not found' }, 404);

  c.set('user', user);
  c.set('orgId', user.orgId);
  await next();
});
```

### Documents

```typescript
// POST /documents/upload
// Content-Type: multipart/form-data
// Body: file (PDF, PPTX, XLSX), max 50MB
router.post('/documents/upload', async (c) => {
  const user = c.get('user');
  const orgId = c.get('orgId');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  // 1. Validate file type and size
  // 2. Generate storage key: {orgId}/{documentId}/{filename}
  // 3. Upload to MinIO
  // 4. Insert document record (status: 'uploaded')
  // 5. Publish message to RabbitMQ: { documentId, storageKey }
  // 6. Return document object

  return c.json({ id: documentId, ... }, 201);
});

// GET /documents
router.get('/documents', async (c) => {
  const orgId = c.get('orgId');
  const documents = await db.documents.findByOrg(orgId);
  return c.json(documents);
});

// GET /documents/:id
router.get('/documents/:id', async (c) => {
  const doc = await db.documents.findById(c.req.param('id'));
  if (!doc || doc.orgId !== c.get('orgId')) return c.json({ error: 'Not found' }, 404);
  return c.json(doc);
});

// DELETE /documents/:id
router.delete('/documents/:id', async (c) => {
  const doc = await db.documents.findById(c.req.param('id'));
  if (!doc || doc.orgId !== c.get('orgId')) return c.json({ error: 'Not found' }, 404);

  // 1. Delete from MinIO
  // 2. Delete chunks from DB
  // 3. Delete document record

  return c.json({ success: true });
});
```

### Chats

```typescript
// POST /chats
router.post('/chats', async (c) => {
  const { title } = await c.req.json();
  const chat = await db.chats.create({
    orgId: c.get('orgId'),
    userId: c.get('user').id,
    title,
  });
  return c.json(chat, 201);
});

// GET /chats
router.get('/chats', async (c) => {
  const chats = await db.chats.findByOrg(c.get('orgId'));
  return c.json(chats);
});

// GET /chats/:id
router.get('/chats/:id', async (c) => {
  const chat = await db.chats.findById(c.req.param('id'));
  if (!chat || chat.orgId !== c.get('orgId')) return c.json({ error: 'Not found' }, 404);

  const messages = await db.messages.findByChat(chat.id);
  return c.json({ ...chat, messages });
});

// POST /chats/:id/messages — Returns SSE stream
router.post('/chats/:id/messages', async (c) => {
  const chatId = c.req.param('id');
  const { content, documentIds } = await c.req.json();
  const orgId = c.get('orgId');
  const user = c.get('user');

  // 1. Save user message to DB
  const userMessage = await db.messages.create({
    chatId,
    role: 'user',
    content,
  });

  // 2. Create SSE session
  const sessionId = crypto.randomUUID();
  await sseManager.createSession(sessionId);

  // 3. Invoke agent (async — agent will push to SSE)
  // Publish to RabbitMQ or call agent directly
  await queue.publish('chat.message', {
    sessionId,
    chatId,
    orgId,
    userId: user.id,
    content,
    documentIds,
    contextMessages: await db.messages.findByChat(chatId, { limit: 20 }),
  });

  // 4. Return SSE stream
  return c.newResponse(
    new ReadableStream({
      async start(controller) {
        const unsubscribe = sseManager.subscribe(sessionId, (event) => {
          controller.enqueue(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);

          if (event.type === 'done' || event.type === 'error') {
            controller.close();
            sseManager.deleteSession(sessionId);
          }
        });

        // Cleanup on client disconnect
        c.req.raw.signal.addEventListener('abort', () => {
          unsubscribe();
          sseManager.deleteSession(sessionId);
          controller.close();
        });
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
});
```

### Agent

```typescript
// POST /agent/run
router.post('/agent/run', async (c) => {
  const { documentIds, prompt } = await c.req.json();
  const user = c.get('user');
  const orgId = c.get('orgId');

  const run = await db.agentRuns.create({
    orgId,
    triggeredBy: user.id,
    inputDocIds: documentIds,
    status: 'pending',
  });

  // Publish to RabbitMQ for agent to pick up
  await queue.publish('agent.run', {
    runId: run.id,
    orgId,
    documentIds,
    prompt,
  });

  return c.json(run, 201);
});

// GET /agent/runs
router.get('/agent/runs', async (c) => {
  const runs = await db.agentRuns.findByOrg(c.get('orgId'));
  return c.json(runs);
});

// GET /agent/runs/:id
router.get('/agent/runs/:id', async (c) => {
  const run = await db.agentRuns.findById(c.req.param('id'));
  if (!run || run.orgId !== c.get('orgId')) return c.json({ error: 'Not found' }, 404);
  return c.json(run);
});
```

### Webhook (for external triggers)

```typescript
// POST /webhook/agent-run
// Allows external systems to trigger agent runs
router.post('/webhook/agent-run', async (c) => {
  // Validate webhook secret
  const secret = c.req.header('X-Webhook-Secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return c.json({ error: 'Invalid secret' }, 401);
  }

  const { orgId, documentIds, prompt } = await c.req.json();

  const run = await db.agentRuns.create({
    orgId,
    triggeredBy: null, // system-triggered
    inputDocIds: documentIds,
    status: 'pending',
  });

  await queue.publish('agent.run', { runId: run.id, orgId, documentIds, prompt });

  return c.json({ runId: run.id }, 201);
});
```

---

## Services

### Storage Service (MinIO)

```typescript
// services/storage.ts

import { Client as MinioClient } from 'minio';

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = 'documents';

export async function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) await minio.makeBucket(BUCKET);

  await minio.putObject(BUCKET, key, buffer, buffer.length, { 'Content-Type': mimeType });
}

export async function getFile(key: string): Promise<Buffer> {
  const stream = await minio.getObject(BUCKET, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function deleteFile(key: string): Promise<void> {
  await minio.removeObject(BUCKET, key);
}
```

### Queue Service (RabbitMQ)

```typescript
// queue/publisher.ts

import amqplib from 'amqplib';

let channel: amqplib.Channel;

export async function connectQueue(): Promise<void> {
  const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  channel = await conn.createChannel();

  // Declare queues
  await channel.assertQueue('document.process', { durable: true });
  await channel.assertQueue('chat.message', { durable: true });
  await channel.assertQueue('agent.run', { durable: true });
}

export async function publish(queue: string, message: object): Promise<void> {
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}
```

### SSE Manager (Redis-backed)

```typescript
// sse/manager.ts

import { createClient } from 'redis';

type SSEEvent = {
  type: 'delta' | 'sources' | 'done' | 'error';
  data: any;
};

type Subscriber = (event: SSEEvent) => void;

export class SSEManager {
  private redis;
  private subscribers: Map<string, Set<Subscriber>> = new Map();

  constructor() {
    this.redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    this.redis.connect();
  }

  async createSession(sessionId: string): Promise<void> {
    await this.redis.set(`sse:${sessionId}`, JSON.stringify({ created: Date.now() }), {
      EX: 3600, // 1 hour TTL
    });
  }

  subscribe(sessionId: string, callback: Subscriber): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    this.subscribers.get(sessionId)!.add(callback);

    // Also subscribe to Redis pub/sub for cross-instance events
    const channel = `sse:${sessionId}:events`;
    const redisSub = this.redis.duplicate();
    redisSub.connect();
    redisSub.subscribe(channel, (message) => {
      const event = JSON.parse(message);
      callback(event);
    });

    return () => {
      this.subscribers.get(sessionId)?.delete(callback);
      redisSub.unsubscribe(channel);
      redisSub.disconnect();
    };
  }

  async emit(sessionId: string, event: SSEEvent): Promise<void> {
    // Publish to Redis for cross-instance delivery
    await this.redis.publish(`sse:${sessionId}:events`, JSON.stringify(event));

    // Also notify local subscribers
    this.subscribers.get(sessionId)?.forEach((cb) => cb(event));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`sse:${sessionId}`);
    this.subscribers.delete(sessionId);
  }
}
```

---

## Database Schema

See main `design.md` for full schema. API uses these tables:
- `orgs`
- `users`
- `documents`
- `document_chunks` (read-only, written by worker)
- `chats`
- `messages`
- `agent_runs`

---

## Error Handling

```typescript
// middleware/error.ts

app.onError((err, c) => {
  console.error(err);

  if (err instanceof ValidationError) {
    return c.json({ error: err.message, details: err.details }, 400);
  }

  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }

  return c.json({ error: 'Internal server error' }, 500);
});
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workspace
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
RABBITMQ_URL=amqp://localhost
REDIS_URL=redis://localhost:6379
WEBHOOK_SECRET=dev-secret
PORT=3001
```

---

## Implementation Order

1. **Project setup**: Hono + TypeScript + shared types
2. **Database**: Schema, migrations, connection pool
3. **Auth middleware**: Stubbed user extraction
4. **Document routes**: Upload to MinIO, publish to queue, list/delete
5. **Chat routes**: CRUD, SSE streaming setup
6. **Agent routes**: Trigger runs, status polling
7. **Webhook endpoint**: External trigger support
8. **Error handling**: Validation, not-found, global handler

---

## Dependencies on Other Services

| Dependency | From | Used For |
|------------|------|----------|
| Shared types | Shared package | Type-safe contracts with frontend |
| PostgreSQL | Infrastructure | Primary data store |
| MinIO | Infrastructure | File storage |
| RabbitMQ | Infrastructure | Task queue for worker/agent |
| Redis | Infrastructure | SSE session management |
| Worker | RabbitMQ | Consumes document processing jobs |
| Agent | RabbitMQ | Consumes chat/agent run jobs |
