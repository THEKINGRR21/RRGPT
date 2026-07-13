import { auth } from "@/auth"
import { 
  getConversation, 
  updateConversationTitle, 
  toggleConversationPin, 
  deleteConversation 
} from "@/db/queries/conversations"

export async function GET(
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
    const thread = await getConversation(id, session.user.id)
    if (!thread) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(thread), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error("GET /api/conversations/[id] error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function PATCH(
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
    const body = await req.json()
    const { title, isPinned } = body

    let result

    if (title !== undefined) {
      result = await updateConversationTitle(id, title, session.user.id)
    } else if (isPinned !== undefined) {
      result = await toggleConversationPin(id, isPinned, session.user.id)
    } else {
      return new Response(JSON.stringify({ error: "No update parameters provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "Conversation not found or update failed" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error("PATCH /api/conversations/[id] error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function DELETE(
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
    const deleted = await deleteConversation(id, session.user.id)
    if (!deleted) {
      return new Response(JSON.stringify({ error: "Conversation not found or deletion failed" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, deleted }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error("DELETE /api/conversations/[id] error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
