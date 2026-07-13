import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workspace',
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Running migrations...');

    await client.query(`
      -- Enable pgvector extension
      CREATE EXTENSION IF NOT EXISTS vector;

      -- Orgs table
      CREATE TABLE IF NOT EXISTS orgs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      -- Documents table
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id),
        uploaded_by UUID NOT NULL REFERENCES users(id),
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'uploaded',
        metadata JSONB DEFAULT '{}' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      -- Document chunks table
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES orgs(id),
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}' NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      -- Create indexes for document_chunks
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
      CREATE INDEX IF NOT EXISTS idx_chunks_org ON document_chunks(org_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);

      -- Chats table
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id),
        user_id UUID NOT NULL REFERENCES users(id),
        title TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      -- Agent runs table
      CREATE TABLE IF NOT EXISTS agent_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id),
        triggered_by UUID REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        input_doc_ids UUID[] DEFAULT '{}' NOT NULL,
        output TEXT,
        metadata JSONB DEFAULT '{}' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        completed_at TIMESTAMPTZ
      );
    `);

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
