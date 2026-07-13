import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

// Orgs table
export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  storageKey: text('storage_key').notNull(),
  status: text('status').notNull().default('uploaded'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Document chunks table (with embedding)
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  embedding: text('embedding'), // Store as text, parse to array for pgvector
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chats table
export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agent runs table
export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  triggeredBy: uuid('triggered_by').references(() => users.id),
  status: text('status').notNull().default('pending'),
  inputDocIds: uuid('input_doc_ids').array().default([]).notNull(),
  output: text('output'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});
