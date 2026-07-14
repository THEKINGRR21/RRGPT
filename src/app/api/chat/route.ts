import { streamText, generateText } from "ai"
import { getProvider } from "@/core/llm"
import { SYSTEM_PROMPT } from "@/core/prompts/system"
import { retrieveRelevantContext } from "@/lib/rag"
import { scanPromptInjection } from "@/lib/safety"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    // Resolve client IP and enforce rate limit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
    const limiter = rateLimit(ip, 15, 60000)

    if (!limiter.success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded: Too many requests. Please retry in a minute." }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((limiter.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const { messages, model, provider: providerId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Malformed request: messages array is required." }), 
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Resolve swappable LLM provider factory
    const llmProvider = getProvider(providerId)
    const languageModel = llmProvider.getModel(model)

    // 1. Safety Scan: Input Prompt Injection Check
    const lastMessage = messages[messages.length - 1]
    const queryText = typeof lastMessage?.content === "string" ? lastMessage.content : ""

    if (queryText.trim() && scanPromptInjection(queryText)) {
      console.warn("Safety Alert: Prompt injection pattern detected in user prompt.")
      return new Response(
        JSON.stringify({ error: "Safety Alert: Suspicious prompt pattern detected. Query rejected." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // 2. RAG Context Retrieval
    let sources: Array<{ content: string; documentName: string; score: number }> = []
    let contextText = ""

    if (queryText.trim()) {
      try {
        sources = await retrieveRelevantContext(queryText, providerId)
        contextText = sources
          .map(c => `[Source: ${c.documentName}]\n${c.content}`)
          .join("\n\n")
      } catch (ragError) {
        console.error("RAG context retrieval failed gracefully:", ragError)
      }
    }

    // 3. Memory: Rolling Summary Consolidation
    let chatMessages = messages
    if (messages.length > 8) {
      console.log("Memory consolidation triggered: Summarizing older context...")
      
      const systemMessage = messages.find(m => m.role === "system") || { role: "system", content: SYSTEM_PROMPT }
      const lastMessages = messages.slice(-4) // Keep the last 4 messages (2 user, 2 assistant turns) for exact state
      const olderMessages = messages.slice(messages[0].role === "system" ? 1 : 0, -4)
      
      const olderMessagesText = olderMessages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n")
        
      try {
        const { text: summary } = await generateText({
          model: languageModel,
          prompt: `Summarize the following conversation history in under 150 words. Focus on core technical requirements, decisions made, code files discussed, and open requests:\n\n${olderMessagesText}`,
        })
        
        chatMessages = [
          systemMessage,
          {
            role: "system",
            content: `Summary of previous conversation context:\n${summary}`
          },
          ...lastMessages
        ]
      } catch (err) {
        console.warn("Failed to generate rolling summary, falling back to sliding window compression:", err)
        // Fallback: compress history to the last 6 messages + system prompt
        chatMessages = [
          systemMessage,
          ...messages.slice(-6)
        ]
      }
    }

    // 4. System Prompt context injection
    let systemPrompt = SYSTEM_PROMPT
    if (contextText) {
      systemPrompt += `\n\nRetrieved Knowledge Base Context:\n${contextText}\n\nStrictly answer the query using the retrieved context above. Cite your sources inline using [Source: Document Name] notation (e.g. "[Source: my-doc.pdf]").`
    }

    // 5. Invoke Vercel AI SDK text streaming
    const result = await streamText({
      model: languageModel,
      messages: chatMessages,
      system: systemPrompt,
    })

    // 6. Return text stream with sources metadata in header using Vercel AI SDK response helper
    return result.toTextStreamResponse({
      headers: {
        "X-Sources": encodeURIComponent(JSON.stringify(sources)),
      }
    })
  } catch (error: unknown) {
    console.error("Streaming Chat API error:", error)
    const errorMessage = error instanceof Error ? error.message : "An error occurred while communicating with the LLM provider."
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
