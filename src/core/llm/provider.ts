import { ModelMessage, LanguageModel } from "ai"

export interface ProviderTelemetry {
  tokensIn: number
  tokensOut: number
  cost: number
  latencyMs: number
}

export interface LLMProvider {
  id: string
  name: string
  
  /**
   * Retrieves the Vercel AI SDK LanguageModel instance for text generation.
   */
  getModel(modelId?: string): LanguageModel

  /**
   * Computes the number of tokens for a given string or message array.
   */
  countTokens(content: string | ModelMessage[]): Promise<number>

  /**
   * Computes estimated input, output, and total costs in USD.
   */
  calculateCost(tokensIn: number, tokensOut: number, modelId?: string): {
    inputCost: number
    outputCost: number
    totalCost: number
  }

  /**
   * Generates a vector embedding for a given text chunk (for pgvector/RAG).
   */
  embedText(text: string): Promise<number[]>
}
