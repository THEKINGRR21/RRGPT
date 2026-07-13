import { auth } from "@/auth"
import { getConversation, addMessage } from "@/db/queries/conversations"
import { maskSensitiveData } from "@/lib/safety"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { id } = await params
    
    // Verify conversation exists and belongs to the active user
    const conversation = await getConversation(id, session.user.id)
    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { role, content, tokens, cost, latency, sources } = body

    if (!role || !content) {
      return new Response(JSON.stringify({ error: "Role and content are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const sanitizedContent = role === "assistant" ? maskSensitiveData(content) : content

    const newMessage = await addMessage({
      conversationId: id,
      role,
      content: sanitizedContent,
      tokens,
      cost,
      latency,
      sources,
    })

    return new Response(JSON.stringify(newMessage), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error("POST /api/conversations/[id]/messages error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
