import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5435/rrgpt"

// Disable statement preparation to support connection pooling and bouncers
const client = postgres(connectionString, { 
  prepare: false 
})

export const db = drizzle(client, { schema })

// Cloud-Native Auto-Migration Engine (Bypasses local network port blocks)
if (typeof window === "undefined" && (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)) {
  (async () => {
    try {
      console.log("Database connection established. Scanning tables schema...")
      const tableCheck = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user'
        );
      `
      const schemaExists = tableCheck[0]?.exists
      
      if (!schemaExists) {
        console.log("Empty database detected. Auto-applying production SQL schema tables...")
        const sqlMigration = `
          CREATE EXTENSION IF NOT EXISTS vector;
          
          CREATE TABLE "user" (
            "id" text PRIMARY KEY NOT NULL,
            "name" text,
            "email" text,
            "emailVerified" timestamp,
            "image" text,
            "role" text DEFAULT 'user' NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "user_email_unique" UNIQUE("email")
          );
          
          CREATE TABLE "account" (
            "userId" text NOT NULL,
            "type" text NOT NULL,
            "provider" text NOT NULL,
            "providerAccountId" text NOT NULL,
            "refresh_token" text,
            "access_token" text,
            "expires_at" integer,
            "token_type" text,
            "scope" text,
            "id_token" text,
            "session_state" text
          );
          
          CREATE TABLE "conversation" (
            "id" text PRIMARY KEY NOT NULL,
            "userId" text,
            "title" text DEFAULT 'Untitled Conversation' NOT NULL,
            "isPinned" boolean DEFAULT false NOT NULL,
            "model" text NOT NULL,
            "provider" text NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL
          );
          
          CREATE TABLE "document" (
            "id" text PRIMARY KEY NOT NULL,
            "userId" text,
            "name" text NOT NULL,
            "mimeType" text NOT NULL,
            "size" integer NOT NULL,
            "storageUrl" text NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL
          );
          
          CREATE TABLE "documentChunk" (
            "id" text PRIMARY KEY NOT NULL,
            "documentId" text NOT NULL,
            "content" text NOT NULL,
            "embedding" vector(768) NOT NULL,
            "metadata" json,
            "createdAt" timestamp DEFAULT now() NOT NULL
          );
          
          CREATE TABLE "message" (
            "id" text PRIMARY KEY NOT NULL,
            "conversationId" text NOT NULL,
            "role" text NOT NULL,
            "content" text NOT NULL,
            "tokens" integer,
            "cost" text,
            "latency" integer,
            "sources" json,
            "createdAt" timestamp DEFAULT now() NOT NULL
          );
          
          CREATE TABLE "session" (
            "sessionToken" text PRIMARY KEY NOT NULL,
            "userId" text NOT NULL,
            "expires" timestamp NOT NULL
          );
          
          CREATE TABLE "verificationToken" (
            "identifier" text NOT NULL,
            "token" text NOT NULL,
            "expires" timestamp NOT NULL
          );
          
          ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
          ALTER TABLE "conversation" ADD CONSTRAINT "conversation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
          ALTER TABLE "documentChunk" ADD CONSTRAINT "documentChunk_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;
          ALTER TABLE "document" ADD CONSTRAINT "document_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
          ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;
          ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
          
          CREATE INDEX IF NOT EXISTS "embedding_idx" ON "documentChunk" USING hnsw ("embedding" vector_cosine_ops);
        `
        
        await client.unsafe(sqlMigration)
        console.log("✅ Production database schema initialized successfully!")
      } else {
        console.log("Database schema verified (tables exist). skipping migration.")
      }
    } catch (err) {
      console.error("Database auto-schema check failed:", err)
    }
  })()
}
