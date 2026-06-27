const BASE = import.meta.env.VITE_API_URL ?? ''

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

function getKey() {
  return sessionStorage.getItem('adminKey') ?? ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getKey()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    sessionStorage.removeItem('adminKey')
    throw new UnauthorizedError()
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    const msg = (json as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export async function downloadFile(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getKey()}` },
  })
  if (res.status === 401) {
    sessionStorage.removeItem('adminKey')
    throw new UnauthorizedError()
  }
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.blob()
}

export const adminApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
