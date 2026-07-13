import { auth } from "@/auth"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { ingestDocument } from "@/lib/rag"
import { desc, eq, or, isNull } from "drizzle-orm"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id || null

    // Users can see their own documents, or global documents (userId is null)
    const list = await db
      .select()
      .from(documents)
      .where(
        userId 
          ? or(eq(documents.userId, userId), isNull(documents.userId)) 
          : isNull(documents.userId)
      )
      .orderBy(desc(documents.createdAt))

    return Response.json(list)
  } catch (err: unknown) {
    console.error("Failed to list documents:", err)
    const msg = err instanceof Error ? err.message : "Internal Server Error"
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Resolve client IP and enforce rate limit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
    const limiter = rateLimit(ip, 5, 60000)

    if (!limiter.success) {
      return Response.json(
        { error: "Rate limit exceeded: Too many uploads. Please retry in a minute." },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil((limiter.reset - Date.now()) / 1000).toString()
          }
        }
      )
    }

    const session = await auth()
    const userId = session?.user?.id || null

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file was uploaded." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const doc = await ingestDocument({
      userId,
      name: file.name,
      mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "text/plain"),
      size: file.size,
      buffer,
    })

    return Response.json(doc, { status: 201 })
  } catch (err: unknown) {
    console.error("Document upload failed:", err)
    const msg = err instanceof Error ? err.message : "Failed to ingest document."
    return Response.json({ error: msg }, { status: 500 })
  }
}
