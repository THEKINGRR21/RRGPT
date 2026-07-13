import { auth } from "@/auth"
import { getConversationsList, createConversation } from "@/db/queries/conversations"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const list = await getConversationsList(session.user.id)
    return new Response(JSON.stringify(list), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error("GET /api/conversations error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { title, model, provider } = await req.json()
    if (!model || !provider) {
      return new Response(JSON.stringify({ error: "Model and provider are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const newThread = await createConversation({
      userId: session.user.id,
      title: title || "Untitled Conversation",
      model,
      provider,
    })

    return new Response(JSON.stringify(newThread), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error("POST /api/conversations error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
