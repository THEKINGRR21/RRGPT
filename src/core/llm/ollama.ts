import { createOpenAI } from "@ai-sdk/openai"
import { embed, ModelMessage } from "ai"
import { getEncoding } from "js-tiktoken"
import { LLMProvider } from "./provider"

const encoding = getEncoding("cl100k_base")

export class OllamaProvider implements LLMProvider {
  id = "ollama"
  name = "Ollama Local"
  private client

  constructor() {
    // Ollama exposes an OpenAI-compatible API at http://localhost:11434/v1
    const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1"
    this.client = createOpenAI({
      apiKey: "ollama", // Dummy key required by OpenAI client structure
      baseURL,
    })
  }

  getModel(modelId = "llama3") {
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

  calculateCost(tokensIn: number, tokensOut: number, modelId?: string) {
    // Local execution is completely free of cost
    void tokensIn
    void tokensOut
    void modelId
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    }
  }

  async embedText(text: string): Promise<number[]> {
    const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text"
    const { embedding } = await embed({
      model: this.client.textEmbeddingModel(embeddingModel),
      value: text,
    })
    return embedding
  }
}
