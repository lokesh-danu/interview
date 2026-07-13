import { db } from './index.js';
import { orgs, users, documents, documentChunks, chats, messages, agentRuns } from './schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';

// Org queries
export async function findOrgById(id: string) {
  const result = await db.select().from(orgs).where(eq(orgs.id, id)).limit(1);
  return result[0] || null;
}

export async function createOrg(name: string) {
  const result = await db.insert(orgs).values({ name }).returning();
  return result[0];
}

// User queries
export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function findUsersByOrg(orgId: string) {
  return db.select().from(users).where(eq(users.orgId, orgId));
}

export async function createUser(orgId: string, email: string, name?: string) {
  const result = await db.insert(users).values({ orgId, email, name }).returning();
  return result[0];
}

// Document queries
export async function findDocumentById(id: string) {
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0] || null;
}

export async function findDocumentsByOrg(orgId: string) {
  return db.select().from(documents).where(eq(documents.orgId, orgId)).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: {
  orgId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  size?: number;
}) {
  const result = await db.insert(documents).values({
    orgId: data.orgId,
    uploadedBy: data.uploadedBy,
    filename: data.filename,
    mimeType: data.mimeType,
    storageKey: data.storageKey,
    metadata: data.size ? { size: data.size } : {},
  }).returning();
  return result[0];
}

export async function updateDocumentStatus(id: string, status: string, error?: string) {
  const metadata = error ? { error } : {};
  const result = await db.update(documents)
    .set({ status, metadata })
    .where(eq(documents.id, id))
    .returning();
  return result[0];
}

export async function deleteDocument(id: string) {
  await db.delete(documents).where(eq(documents.id, id));
}

// Document chunk queries
export async function insertChunks(data: {
  documentId: string;
  orgId: string;
  chunks: Array<{ content: string; metadata: Record<string, unknown> }>;
  embeddings: number[][];
}) {
  const values = data.chunks.map((chunk, index) => ({
    documentId: data.documentId,
    orgId: data.orgId,
    chunkIndex: index,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: JSON.stringify(data.embeddings[index]),
  }));

  await db.insert(documentChunks).values(values);
}

export async function searchSimilarChunks(orgId: string, queryEmbedding: number[], documentIds?: string[], limit = 10) {
  // For now, return all chunks (mock embeddings don't support similarity search)
  // In production, use pgvector: ORDER BY embedding <=> queryEmbedding
  let query = db.select({
    id: documentChunks.id,
    content: documentChunks.content,
    metadata: documentChunks.metadata,
    documentId: documentChunks.documentId,
    filename: documents.filename,
  })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(eq(documentChunks.orgId, orgId))
    .limit(limit);

  if (documentIds && documentIds.length > 0) {
    query = db.select({
      id: documentChunks.id,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
      documentId: documentChunks.documentId,
      filename: documents.filename,
    })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(and(
        eq(documentChunks.orgId, orgId),
        inArray(documentChunks.documentId, documentIds)
      ))
      .limit(limit);
  }

  return query;
}

export async function deleteChunksByDocument(documentId: string) {
  await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
}

// Chat queries
export async function findChatById(id: string) {
  const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
  return result[0] || null;
}

export async function findChatsByOrg(orgId: string) {
  return db.select().from(chats).where(eq(chats.orgId, orgId)).orderBy(desc(chats.createdAt));
}

export async function createChat(orgId: string, userId: string, title?: string) {
  const result = await db.insert(chats).values({ orgId, userId, title }).returning();
  return result[0];
}

// Message queries
export async function findMessagesByChat(chatId: string, limit = 50) {
  return db.select().from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function createMessage(chatId: string, role: string, content: string, metadata: Record<string, unknown> = {}) {
  const result = await db.insert(messages).values({ chatId, role, content, metadata }).returning();
  return result[0];
}

// Agent run queries
export async function findAgentRunById(id: string) {
  const result = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  return result[0] || null;
}

export async function findAgentRunsByOrg(orgId: string) {
  return db.select().from(agentRuns).where(eq(agentRuns.orgId, orgId)).orderBy(desc(agentRuns.createdAt));
}

export async function createAgentRun(orgId: string, triggeredBy: string | null, documentIds: string[], prompt?: string) {
  const result = await db.insert(agentRuns).values({
    orgId,
    triggeredBy,
    inputDocIds: documentIds,
    metadata: prompt ? { prompt } : {},
  }).returning();
  return result[0];
}

export async function updateAgentRunStatus(id: string, status: string, output?: string) {
  const result = await db.update(agentRuns)
    .set({
      status,
      output: output || null,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
    })
    .where(eq(agentRuns.id, id))
    .returning();
  return result[0];
}
