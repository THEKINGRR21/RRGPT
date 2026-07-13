import { 
  pgTable, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  primaryKey, 
  vector, 
  json,
  index
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ==========================================
// 1. AUTH.JS (NEXTAUTH) COMPATIBLE TABLES
// ==========================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: text("role", { enum: ["user", "admin", "dev"] }).default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      parentKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    }
  ]
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    {
      parentKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    }
  ]
)

// ==========================================
// 2. CONVERSATION PERSISTENCE TABLES
// ==========================================

export const conversations = pgTable("conversation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .references(() => users.id, { onDelete: "cascade" }), // Nullable for guest/trial rate-limited users
  title: text("title").default("Untitled Conversation").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
})

export const messages = pgTable("message", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  
  // Telemetry details
  tokens: integer("tokens"),
  cost: text("cost"),
  latency: integer("latency"), // in ms
  
  // RAG references (JSON array of sources/citations)
  sources: json("sources"),
  
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
})

// ==========================================
// 3. RAG / KNOWLEDGE BASE TABLES
// ==========================================

export const documents = pgTable("document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .references(() => users.id, { onDelete: "cascade" }), // Can be null if global knowledge
  name: text("name").notNull(),
  mimeType: text("mimeType").notNull(),
  size: integer("size").notNull(), // in bytes
  storageUrl: text("storageUrl").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
})

export const documentChunks = pgTable("documentChunk", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  documentId: text("documentId")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  
  // Vector dimensions set to 768. 
  // Gemini text-embedding-004 = 768. 
  // OpenAI text-embedding-3-small is requested with 768 dimensions (truncated & normalized).
  // Ollama nomic-embed-text = 768.
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  
  metadata: json("metadata"), // Heading information, document name, chunk range, etc.
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
])

// ==========================================
// 4. RELATION RELATIONSHIPS FOR DRIZZLE
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  documents: many(documents),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  chunks: many(documentChunks),
}))

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}))
