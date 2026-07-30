import { getApiBaseUrl } from '@/lib/api-url'
import { clearBizSession } from './cookies'

export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

class BusinessApiClient {
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  // The shared transport: fetch + 401-silent-refresh-then-retry-once + the
  // login redirect on refresh failure. request() layers JSON parsing and the
  // !ok → ApiError mapping on top; send() exists so header-aware callers
  // (getWithHeaders / getRaw) reuse the exact same auth semantics.
  private async send(path: string, options: RequestInit = {}): Promise<Response> {
    const base = getApiBaseUrl()
    const url = `${base}${path}`
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    let response = await fetch(url, config)

    // On 401, attempt silent refresh then retry once
    if (response.status === 401) {
      const refreshed = await this.silentRefresh()
      if (refreshed) {
        response = await fetch(url, config)
      } else {
        if (typeof window !== 'undefined') {
          // Cooper (May 2026): clear biz_session before redirecting so the
          // middleware doesn't see a stale session cookie and bounce us back
          // to /business → 401 → /business/login → loop.
          clearBizSession()
          window.location.href = '/business/login'
        }
        throw new ApiError('Session expired', 401)
      }
    }

    return response
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.send(path, options)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new ApiError(body.message || body.error || 'Request failed', response.status, body)
    }

    return response.json()
  }

  private async silentRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/business/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        return res.ok
      } catch {
        return false
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  get<T>(path: string) {
    return this.request<T>(path)
  }

  /** GET that surfaces the response headers alongside the parsed JSON body —
   *  for endpoints whose freshness contract rides in headers (the payouts
   *  X-Payouts-* trio). Same 401-silent-refresh + ApiError semantics as get(). */
  async getWithHeaders<T>(path: string): Promise<{ body: T; headers: Headers; status: number }> {
    const response = await this.send(path)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new ApiError(body.message || body.error || 'Request failed', response.status, body)
    }

    return { body: await response.json(), headers: response.headers, status: response.status }
  }

  /** GET that returns the raw Response without consuming the body — for
   *  non-JSON payloads (the payouts CSV export, where 202 = still computing
   *  and 200 = the file). Same 401-silent-refresh semantics; non-2xx still
   *  maps to ApiError so callers keep one error shape. */
  async getRaw(path: string): Promise<Response> {
    const response = await this.send(path)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new ApiError(body.message || body.error || 'Request failed', response.status, body)
    }

    return response
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const base = getApiBaseUrl()
    const url = `${base}${path}`
    const config: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }

    let response = await fetch(url, config)

    if (response.status === 401) {
      const refreshed = await this.silentRefresh()
      if (refreshed) {
        response = await fetch(url, config)
      } else {
        if (typeof window !== 'undefined') {
          // Cooper (May 2026): see clearBizSession comment in request().
          clearBizSession()
          window.location.href = '/business/login'
        }
        throw new ApiError('Session expired', 401)
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new ApiError(body.message || body.error || 'Request failed', response.status)
    }

    return response.json()
  }

  // Auth-specific methods (don't trigger silent refresh redirect)
  async authGet<T>(path: string): Promise<T> {
    const url = `${getApiBaseUrl()}${path}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(data.message || data.error || 'Request failed', response.status)
    }

    return response.json()
  }

  async authPost<T>(path: string, body?: unknown): Promise<T> {
    const url = `${getApiBaseUrl()}${path}`
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(data.message || data.error || 'Request failed', response.status)
    }

    return response.json()
  }
}

export const apiClient = new BusinessApiClient()
