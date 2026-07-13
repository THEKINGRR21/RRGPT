import { LLMProvider } from "./provider"
import { GeminiProvider } from "./gemini"
import { OpenAICompatProvider } from "./openai-compat"
import { OllamaProvider } from "./ollama"

export * from "./provider"
export * from "./gemini"
export * from "./openai-compat"
export * from "./ollama"

export function getProvider(providerId?: string): LLMProvider {
  const activeProvider = providerId || process.env.MODEL_PROVIDER || "google"

  switch (activeProvider.toLowerCase()) {
    case "google":
    case "gemini":
      return new GeminiProvider()
    case "openai":
      return new OpenAICompatProvider()
    case "ollama":
      return new OllamaProvider()
    default:
      console.warn(`Unknown LLM provider "${activeProvider}". Falling back to Google Gemini.`)
      return new GeminiProvider()
  }
}
