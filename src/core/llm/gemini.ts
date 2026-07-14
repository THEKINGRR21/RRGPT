import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { embed, ModelMessage } from "ai"
import { getEncoding } from "js-tiktoken"
import { LLMProvider } from "./provider"

const encoding = getEncoding("cl100k_base")

// Dynamic API Key resolver for Vercel and local environments
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.RRGPT_KEY || ""
const googleInstance = createGoogleGenerativeAI({
  apiKey
})

export class GeminiProvider implements LLMProvider {
  id = "google"
  name = "Google Gemini"

  getModel(modelId = "gemini-2.5-flash") {
    // If the UI requests gemini-1.5-flash or pro, we map them directly to 2.5
    let activeModelId = modelId
    if (modelId.includes("1.5-flash")) activeModelId = "gemini-2.5-flash"
    if (modelId.includes("1.5-pro")) activeModelId = "gemini-2.5-pro"
    
    return googleInstance(activeModelId)
  }

  async countTokens(content: string | ModelMessage[]): Promise<number> {
    if (typeof content === "string") {
      return encoding.encode(content).length
    }
    
    let tokens = 0
    for (const msg of content) {
      tokens += 4 // message formatting overhead
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
    return tokens + 2 // response formatting overhead
  }

  calculateCost(tokensIn: number, tokensOut: number, modelId = "gemini-2.5-flash") {
    let inputRate = 0.075 / 1_000_000 // $0.075 per 1M tokens
    let outputRate = 0.30 / 1_000_000 // $0.30 per 1M tokens

    if (modelId.includes("pro")) {
      inputRate = 1.25 / 1_000_000 // $1.25 per 1M tokens
      outputRate = 5.00 / 1_000_000 // $5.00 per 1M tokens
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
      model: googleInstance.textEmbeddingModel("gemini-embedding-001"),
      value: text,
      providerOptions: {
        google: {
          outputDimensionality: 768,
        },
      },
    })
    return embedding
  }
}
