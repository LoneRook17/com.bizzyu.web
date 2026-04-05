const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

class BusinessApiClient {
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`
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

  private async silentRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/business/auth/refresh`, {
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

  // Auth-specific methods (don't trigger silent refresh redirect)
  async authPost<T>(path: string, body?: unknown): Promise<T> {
    const url = `${BASE_URL}${path}`
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
