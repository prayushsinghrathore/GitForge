/**
 * Minimal typed fetch wrapper for the GitForge API.
 *
 * Responsibilities:
 * - prefix all calls with `/api` (Vite proxies this to the FastAPI backend);
 * - encode query params and JSON bodies;
 * - translate non-2xx responses into a typed {@link ApiError} that carries the
 *   backend's `detail` message (engine errors arrive as HTTP 409 with a
 *   human-readable detail — see routes.py `_guard`).
 */

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export class ApiError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

type QueryValue = string | number | boolean | null | undefined
type Query = Record<string, QueryValue>

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function parseError(res: Response): Promise<ApiError> {
  let detail: string | undefined
  try {
    const body = (await res.json()) as { detail?: string }
    detail = body?.detail
  } catch {
    // non-JSON error body — ignore
  }
  return new ApiError(res.status, detail ?? `Request failed with ${res.status}`, detail)
}

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
}
