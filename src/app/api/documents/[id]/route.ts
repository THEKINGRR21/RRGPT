import { auth } from "@/auth"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = session?.user?.id || null
    const { id } = await params

    const query = userId 
      ? and(eq(documents.id, id), eq(documents.userId, userId))
      : eq(documents.id, id)

    const [deleted] = await db
      .delete(documents)
      .where(query)
      .returning()

    if (!deleted) {
      return Response.json({ error: "Document not found or unauthorized." }, { status: 404 })
    }

    return Response.json(deleted)
  } catch (err: unknown) {
    console.error("Failed to delete document:", err)
    const msg = err instanceof Error ? err.message : "Internal Server Error"
    return Response.json({ error: msg }, { status: 500 })
  }
}
