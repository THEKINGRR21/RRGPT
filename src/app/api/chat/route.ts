import { streamText, generateText, tool, zodSchema, isStepCount } from "ai"
import { getProvider } from "@/core/llm"
import { SYSTEM_PROMPT } from "@/core/prompts/system"
import { retrieveRelevantContext } from "@/lib/rag"
import { scanPromptInjection } from "@/lib/safety"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

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

    // Server-side environment diagnostics (safely logs key existence and mask)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.RRGPT_KEY || ""
    const keyMask = geminiKey 
      ? `${geminiKey.substring(0, 6)}...${geminiKey.substring(geminiKey.length - 4)}` 
      : "missing"

    console.log("LLM Gateway configuration scan:", {
      hasGeminiKey: !!geminiKey,
      geminiKeyMask: keyMask,
      hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      model,
      providerId
    })

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

    // 5. Invoke Vercel AI SDK text streaming with server-side tools
    const result = await streamText({
      model: languageModel,
      messages: chatMessages,
      system: systemPrompt,
      stopWhen: isStepCount(5),
      tools: {
        getCurrentTime: tool({
          description: "Get the current date and time in a specific timezone.",
          inputSchema: zodSchema(z.object({
            timezone: z.string().describe("The timezone name, e.g. 'Asia/Kolkata', 'America/New_York', 'UTC'").default("Asia/Kolkata"),
          })),
          execute: async ({ timezone }: { timezone: string }) => {
            const now = new Date()
            const timeStr = now.toLocaleString("en-US", { timeZone: timezone })
            return {
              timezone,
              dateTime: timeStr,
              message: `The current date and time in ${timezone} is ${timeStr}.`
            }
          }
        }),
        calculateExpression: tool({
          description: "Evaluate a simple mathematical expression containing only digits, arithmetic operators (+, -, *, /), parentheses, and spaces.",
          inputSchema: zodSchema(z.object({
            expression: z.string().describe("The math expression to evaluate, e.g. '3 * (4 + 2) / 1.5'"),
          })),
          execute: async ({ expression }: { expression: string }) => {
            try {
              if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
                return { error: "Security validation failed: Expression contains invalid characters." }
              }
              const res = eval(expression)
              return { expression, result: res }
            } catch {
              return { error: "Failed to evaluate mathematical expression." }
            }
          }
        }),
        searchWeb: tool({
          description: "Search the web for real-time information, news, current events, sports scores, or stock prices.",
          inputSchema: zodSchema(z.object({
            query: z.string().describe("The search query to execute, e.g. 'AAPL stock price today' or 'current status of NASA mission'"),
          })),
          execute: async ({ query }: { query: string }) => {
            console.log(`Executing web search tool for query: "${query}"`)
            const results = await searchWebScraper(query)
            return {
              query,
              results,
              message: results.length > 0 
                ? `Found ${results.length} search results.` 
                : "No search results found."
            }
          }
        })
      }
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

/**
 * Fetch wrapper with strict timeout support.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

/**
 * Unified server-side web search scraper with automatic Yahoo Search fallback.
 * Bypasses Vercel serverless IP blocking by falling back to Yahoo HTML results.
 */
async function searchWebScraper(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  // 1. Try DuckDuckGo first (timeout 2000ms)
  try {
    console.log(`Attempting DuckDuckGo search for: "${query}"`)
    const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, 2000)
    
    if (res.ok) {
      const html = await res.text()
      const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      
      const resultsMap = new Map<string, { title: string; url: string; snippet: string }>()
      
      const cleanText = (text: string) => {
        return text
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .trim()
      }
      
      const decodeDDGUrl = (link: string) => {
        if (link.includes("uddg=")) {
          const urlParam = link.split("uddg=")[1]?.split("&")[0]
          if (urlParam) return decodeURIComponent(urlParam)
        }
        if (link.startsWith("//")) {
          return "https:" + link
        }
        return link
      }
      
      let match
      while ((match = titleRegex.exec(html)) !== null) {
        const rawUrl = match[1]
        const url = decodeDDGUrl(rawUrl)
        const title = cleanText(match[2])
        resultsMap.set(rawUrl, { title, url, snippet: "" })
      }
      
      while ((match = snippetRegex.exec(html)) !== null) {
        const rawUrl = match[1]
        const snippet = cleanText(match[2])
        if (resultsMap.has(rawUrl)) {
          const item = resultsMap.get(rawUrl)
          if (item) item.snippet = snippet
        }
      }
      
      const results = Array.from(resultsMap.values()).slice(0, 5)
      if (results.length > 0) {
        console.log(`DuckDuckGo search succeeded, found ${results.length} results.`)
        return results
      }
    }
    console.warn("DuckDuckGo search returned no results or failed, falling back to Yahoo Search...")
  } catch (ddgError) {
    console.warn("DuckDuckGo search failed or timed out, falling back to Yahoo Search:", ddgError)
  }
  
  // 2. Fall back to Yahoo Search (timeout 2000ms)
  try {
    console.log(`Attempting Yahoo Search fallback for: "${query}"`)
    const res = await fetchWithTimeout(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, 2000)
    
    if (!res.ok) throw new Error(`Yahoo Search HTTP error: ${res.status}`)
    const html = await res.text()
    
    const results: Array<{ title: string; url: string; snippet: string }> = []
    const blocks = html.split(/<div[^>]*class="[^"]*dd [^"]*algo[^"]*"/)
    
    const cleanText = (text: string) => {
      return text
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&hellip;/g, "...")
        .trim()
    }
    
    for (let i = 1; i < blocks.length && results.length < 5; i++) {
      const block = blocks[i]
      const linkMatch = /<a[^>]*href="([^"]+)"[^>]*>/.exec(block)
      const titleMatch = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(block)
      const snippetMatch = /<p[^>]*>([\s\S]*?)<\/p>/.exec(block) || /<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block)
      
      if (linkMatch && titleMatch) {
        const url = linkMatch[1]
        const title = cleanText(titleMatch[1])
        const snippet = snippetMatch ? cleanText(snippetMatch[1]) : ""
        
        if (url && title && !url.includes("yahoo.com") && !url.includes("yimg.com")) {
          results.push({ title, url, snippet })
        }
      }
    }
    
    console.log(`Yahoo Search succeeded, found ${results.length} results.`)
    return results
  } catch (yahooError) {
    console.error("Yahoo Search fallback failed or timed out:", yahooError)
    return []
  }
}
