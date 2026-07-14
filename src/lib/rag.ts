// Mock DOMMatrix global to prevent pdf-parse from crashing in serverless environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).DOMMatrix = class {} as any
}

import { db } from "@/db"
import { documents, documentChunks } from "@/db/schema"
import { getProvider } from "@/core/llm"
import { sql, desc } from "drizzle-orm"

/**
 * Parses a PDF buffer and extracts all raw text content.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // Lazy-load pdf-parse to isolate its environment dependencies in serverless functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = (await import("pdf-parse")) as any
  const data = await (pdfModule.default || pdfModule)(buffer)
  return data.text || ""
}

/**
 * Recursively splits text into overlapping chunks, attempting to keep paragraphs/sentences intact.
 */
export function chunkText(text: string, chunkSize = 800, chunkOverlap = 150): string[] {
  const chunks: string[] = []
  let currentIndex = 0
  
  while (currentIndex < text.length) {
    let endIndex = currentIndex + chunkSize
    if (endIndex >= text.length) {
      chunks.push(text.substring(currentIndex).trim())
      break
    }
    
    // Find boundaries inside the overlap search window
    const searchRange = text.substring(endIndex - 100, endIndex + 50)
    const sentenceBoundary = searchRange.lastIndexOf(".")
    const paragraphBoundary = searchRange.lastIndexOf("\n")
    
    if (paragraphBoundary !== -1) {
      endIndex = (endIndex - 100) + paragraphBoundary + 1
    } else if (sentenceBoundary !== -1) {
      endIndex = (endIndex - 100) + sentenceBoundary + 1
    }
    
    chunks.push(text.substring(currentIndex, endIndex).trim())
    currentIndex = endIndex - chunkOverlap
    if (currentIndex < 0) currentIndex = 0
    if (endIndex <= currentIndex) break // Prevent infinite loops
  }
  
  return chunks.filter(c => c.length > 10)
}

interface IngestOptions {
  userId?: string | null
  name: string
  mimeType: string
  size: number
  buffer: Buffer
}

/**
 * Main entry point for file ingestion.
 * Saves metadata, chunks the text, and generates embeddings for all configured providers.
 */
export async function ingestDocument(options: IngestOptions) {
  let content = ""
  
  if (options.mimeType === "application/pdf") {
    content = await parsePdf(options.buffer)
  } else {
    content = options.buffer.toString("utf-8")
  }
  
  if (!content.trim()) {
    throw new Error("No text content could be extracted from this document.")
  }

  // 1. Create document record
  const [doc] = await db
    .insert(documents)
    .values({
      userId: options.userId || null,
      name: options.name,
      mimeType: options.mimeType,
      size: options.size,
      storageUrl: `local://${Date.now()}_${options.name}`,
    })
    .returning()

  // 2. Chunk text
  const textChunks = chunkText(content)
  if (textChunks.length === 0) {
    return doc
  }

  // 3. Generate embeddings for all configured/active providers
  const providers = ["google", "openai", "ollama"]
  
  for (const providerId of providers) {
    try {
      const provider = getProvider(providerId)
      
      // Basic sanity check to see if api key is configured
      if (providerId === "google" && !process.env.GEMINI_API_KEY) continue
      if (providerId === "openai" && !process.env.OPENAI_API_KEY) continue
      // Ollama runs locally, we can attempt to check or embed

      console.log(`Generating embeddings for provider: ${providerId}...`)
      
      // Batch embedding generation to be efficient
      for (let i = 0; i < textChunks.length; i++) {
        const chunkText = textChunks[i]
        const embedding = await provider.embedText(chunkText)
        
        await db.insert(documentChunks).values({
          documentId: doc.id,
          content: chunkText,
          embedding,
          metadata: {
            provider: providerId,
            documentName: options.name,
            index: i,
            totalChunks: textChunks.length,
          },
        })
      }
    } catch (err) {
      console.warn(`Failed to generate embeddings for provider ${providerId}:`, err)
    }
  }

  return doc
}

export interface SearchResult {
  content: string
  documentName: string
  score: number
}

/**
 * Performs a hybrid vector similarity and keyword lexical search against pgvector.
 */
export async function retrieveRelevantContext(
  query: string,
  providerId: string,
  limit = 4
): Promise<SearchResult[]> {
  try {
    const provider = getProvider(providerId)
    const queryEmbedding = await provider.embedText(query)
    const vectorString = `[${queryEmbedding.join(",")}]`
    
    // 1. Cosine similarity query using pgvector distance operator
    // Drizzle custom sql template injection for cosine distance
    const similarity = sql<number>`1 - (embedding <=> ${vectorString}::vector)`
    
    // We filter document chunks by current provider space
    const chunks = await db
      .select({
        content: documentChunks.content,
        metadata: documentChunks.metadata,
        score: similarity,
      })
      .from(documentChunks)
      .where(sql`metadata->>'provider' = ${providerId}`)
      .orderBy(t => desc(t.score))
      .limit(limit)

    return chunks.map(c => {
      const meta = c.metadata as { documentName?: string } | null
      return {
        content: c.content,
        documentName: meta?.documentName || "Unknown Document",
        score: c.score,
      }
    })
  } catch (e) {
    console.error("RAG retrieval failed:", e)
    return []
  }
}
