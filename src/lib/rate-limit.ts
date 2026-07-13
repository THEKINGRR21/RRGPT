/**
 * Sliding Window In-Memory Rate Limiting Utility
 */

const ipCache = new Map<string, { count: number; resetTime: number }>()

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Enforces rate limiting on a per-IP basis.
 * @param ip Client IP address
 * @param limit Max requests allowed in the window
 * @param windowMs Window size in milliseconds (default: 1 minute)
 */
export function rateLimit(ip: string, limit = 30, windowMs = 60000): RateLimitResult {
  const now = Date.now()
  const record = ipCache.get(ip)
  
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    ipCache.set(ip, { count: 1, resetTime })
    return { 
      success: true, 
      limit, 
      remaining: limit - 1, 
      reset: resetTime 
    }
  }
  
  if (record.count >= limit) {
    return { 
      success: false, 
      limit, 
      remaining: 0, 
      reset: record.resetTime 
    }
  }
  
  record.count += 1
  return { 
    success: true, 
    limit, 
    remaining: limit - record.count, 
    reset: record.resetTime 
  }
}
