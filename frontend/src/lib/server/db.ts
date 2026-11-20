import { neon } from "@neondatabase/serverless";

function sanitizeDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.get("channel_binding") === "require") {
      parsed.searchParams.delete("channel_binding");
    }
    return parsed.toString();
  } catch {
    return rawUrl
      .replace(/([?&])channel_binding=require(&|$)/, (_match, p1, p2) =>
        p2 === "&" ? p1 : ""
      )
      .replace(/[?&]$/, "");
  }
}

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not configured.");
  }
  return neon(sanitizeDatabaseUrl(databaseUrl));
}

let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) return;
  const sql = getDb();

  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      total_chunks INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, filename)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding vector(768),
      owner_id TEXT NOT NULL DEFAULT 'public',
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `;

  await sql`
    ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'public';
  `;

  await sql`
    ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS document_chunks_user_idx
    ON document_chunks (user_id, filename);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'legacy',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE chat_sessions
    ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'legacy';
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_owner_idx
    ON chat_sessions (owner_id, updated_at DESC);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS chat_messages_session_idx
    ON chat_messages (session_id, created_at ASC);
  `;

  schemaInitialized = true;
}
