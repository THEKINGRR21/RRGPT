import { streamText } from "ai"
import { getProvider } from "@/core/llm"
import { SYSTEM_PROMPT } from "@/core/prompts/system"
import { retrieveRelevantContext } from "@/lib/rag"

export async function POST(req: Request) {
  try {
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

    // 1. RAG Context Retrieval
    const lastMessage = messages[messages.length - 1]
    const queryText = typeof lastMessage?.content === "string" ? lastMessage.content : ""
    
    let sources: Array<{ content: string; documentName: string; score: number }> = []
    let contextText = ""

    if (queryText.trim()) {
      sources = await retrieveRelevantContext(queryText, providerId)
      contextText = sources
        .map(c => `[Source: ${c.documentName}]\n${c.content}`)
        .join("\n\n")
    }

    // 2. System Prompt context injection
    let systemPrompt = SYSTEM_PROMPT
    if (contextText) {
      systemPrompt += `\n\nRetrieved Knowledge Base Context:\n${contextText}\n\nStrictly answer the query using the retrieved context above. Cite your sources inline using [Source: Document Name] notation (e.g. "[Source: my-doc.pdf]").`
    }

    // 3. Invoke Vercel AI SDK text streaming
    const result = await streamText({
      model: languageModel,
      messages,
      system: systemPrompt,
    })

    // 4. Return text stream with sources metadata in header
    return new Response(result.textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
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
