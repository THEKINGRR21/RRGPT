import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

export interface MessageInput {
  conversationId: string
  role: "system" | "user" | "assistant"
  content: string
  tokens?: number
  cost?: string
  latency?: number
  sources?: unknown
}

/**
 * Retrieves all conversations for a user, ordered by isPinned desc and updatedAt desc.
 */
export async function getConversationsList(userId?: string) {
  if (!userId) return []
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.isPinned), desc(conversations.updatedAt))
}

/**
 * Retrieves a single conversation thread including all its messages.
 */
export async function getConversation(id: string, userId?: string) {
  const queryCondition = userId 
    ? and(eq(conversations.id, id), eq(conversations.userId, userId))
    : eq(conversations.id, id)

  const threadList = await db
    .select()
    .from(conversations)
    .where(queryCondition)
    .limit(1)

  const thread = threadList[0]
  if (!thread) return null

  const msgList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)

  return {
    ...thread,
    messages: msgList,
  }
}

/**
 * Creates a new conversation thread.
 */
export async function createConversation(data: {
  userId?: string
  title: string
  model: string
  provider: string
}) {
  const [newThread] = await db
    .insert(conversations)
    .values({
      userId: data.userId || null,
      title: data.title,
      model: data.model,
      provider: data.provider,
    })
    .returning()
  return newThread
}

/**
 * Updates the title of a conversation thread.
 */
export async function updateConversationTitle(id: string, title: string, userId?: string) {
  const queryCondition = userId 
    ? and(eq(conversations.id, id), eq(conversations.userId, userId))
    : eq(conversations.id, id)

  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(queryCondition)
    .returning()
  return updated
}

/**
 * Toggles the pinned status of a conversation.
 */
export async function toggleConversationPin(id: string, isPinned: boolean, userId?: string) {
  const queryCondition = userId 
    ? and(eq(conversations.id, id), eq(conversations.userId, userId))
    : eq(conversations.id, id)

  const [updated] = await db
    .update(conversations)
    .set({ isPinned, updatedAt: new Date() })
    .where(queryCondition)
    .returning()
  return updated
}

/**
 * Deletes a conversation thread and all its messages (cascade delete handled by DB schema).
 */
export async function deleteConversation(id: string, userId?: string) {
  const queryCondition = userId 
    ? and(eq(conversations.id, id), eq(conversations.userId, userId))
    : eq(conversations.id, id)

  const [deleted] = await db
    .delete(conversations)
    .where(queryCondition)
    .returning()
  return deleted
}

/**
 * Adds a message to a conversation thread and updates the thread's updatedAt timestamp.
 */
export async function addMessage(data: MessageInput) {
  return db.transaction(async (tx) => {
    const [newMessage] = await tx
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        tokens: data.tokens ?? null,
        cost: data.cost ?? null,
        latency: data.latency ?? null,
        sources: data.sources ?? null,
      })
      .returning()

    // Update conversation's updatedAt timestamp
    await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId))

    return newMessage
  })
}
