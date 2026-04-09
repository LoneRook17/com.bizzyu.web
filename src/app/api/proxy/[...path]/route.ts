import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function proxyRequest(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '/')
  const queryString = request.nextUrl.search
  const targetUrl = `${BACKEND_URL}${path}${queryString}`

  const headers = new Headers()
  // Forward relevant headers
  for (const [key, value] of request.headers.entries()) {
    // Skip hop-by-hop and Next.js internal headers
    if (['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) continue
    headers.set(key, value)
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  }

  // Forward body for non-GET/HEAD requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.text()
  }

  const response = await fetch(targetUrl, fetchOptions)

  // Build response with backend status and headers
  const responseHeaders = new Headers()
  for (const [key, value] of response.headers.entries()) {
    // Skip hop-by-hop headers
    if (['transfer-encoding', 'connection'].includes(key.toLowerCase())) continue
    responseHeaders.set(key, value)
  }

  const body = await response.arrayBuffer()

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const PATCH = proxyRequest
export const DELETE = proxyRequest
