// Returns the base URL for the Node.js API.
// Browser: relative path through the Next.js rewrite proxy (avoids HTTPS → HTTP mixed content).
// Server: direct URL via INTERNAL_API_URL (server-to-server, no mixed content concern).
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    return '/api/proxy'
  }
  return process.env.INTERNAL_API_URL || 'http://localhost:3000'
}
