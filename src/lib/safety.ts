/**
 * Safety and Moderation Helpers
 */

/**
 * Scans a user input string for common prompt injection patterns.
 */
export function scanPromptInjection(text: string): boolean {
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /system\s+(prompt\s+)?override/i,
    /you\s+are\s+now\s+a/i,
    /new\s+role\s+directive/i,
    /ignore\s+operating\s+rules/i,
  ]
  return injectionPatterns.some(pattern => pattern.test(text))
}

/**
 * Scans outgoing assistant text for API keys or connection strings and masks them.
 */
export function maskSensitiveData(text: string): string {
  let sanitized = text
  
  // Mask connection strings (e.g. postgresql://user:password@host...)
  sanitized = sanitized.replace(/postgresql:\/\/([^:]+):([^@]+)@/g, "postgresql://$1:****@")
  sanitized = sanitized.replace(/postgres:\/\/([^:]+):([^@]+)@/g, "postgres://$1:****@")
  
  // Mask OpenAI API keys
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{32,}/g, "sk-****")
  
  // Mask Google Cloud API keys
  sanitized = sanitized.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, "AIzaSy-****")
  
  return sanitized
}
