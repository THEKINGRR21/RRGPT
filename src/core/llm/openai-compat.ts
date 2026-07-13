import { createOpenAI } from "@ai-sdk/openai"
import { embed, ModelMessage } from "ai"
import { getEncoding } from "js-tiktoken"
import { LLMProvider } from "./provider"

const encoding = getEncoding("cl100k_base")

export class OpenAICompatProvider implements LLMProvider {
  id = "openai"
  name = "OpenAI Compatible"
  private client

  constructor() {
    this.client = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy",
      baseURL: process.env.OPENAI_BASE_URL || undefined, // Fallback to official OpenAI API if omitted
    })
  }

  getModel(modelId = "gpt-4o-mini") {
    return this.client(modelId)
  }

  async countTokens(content: string | ModelMessage[]): Promise<number> {
    if (typeof content === "string") {
      return encoding.encode(content).length
    }
    
    let tokens = 0
    for (const msg of content) {
      tokens += 4
      if (typeof msg.content === "string") {
        tokens += encoding.encode(msg.content).length
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text") {
            tokens += encoding.encode(part.text).length
          }
        }
      }
    }
    return tokens + 2
  }

  calculateCost(tokensIn: number, tokensOut: number, modelId = "gpt-4o-mini") {
    // Default rate for gpt-4o-mini ($0.15/$0.60 per 1M tokens)
    let inputRate = 0.15 / 1_000_000
    let outputRate = 0.60 / 1_000_000

    if (modelId.includes("gpt-4o") && !modelId.includes("mini")) {
      inputRate = 5.00 / 1_000_000 // $5.00 per 1M tokens
      outputRate = 15.00 / 1_000_000 // $15.00 per 1M tokens
    }

    const inputCost = tokensIn * inputRate
    const outputCost = tokensOut * outputRate
    
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    }
  }

  async embedText(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.textEmbeddingModel("text-embedding-3-small"),
      value: text,
    })
    return embedding
  }
}
