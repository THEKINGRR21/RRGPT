import { streamText } from "ai"
import { getProvider } from "@/core/llm"
import { SYSTEM_PROMPT } from "@/core/prompts/system"

export const runtime = "edge"

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

    // Invoke Vercel AI SDK text streaming
    const result = await streamText({
      model: languageModel,
      messages,
      system: SYSTEM_PROMPT,
    })

    return result.toTextStreamResponse()
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
