const BASE = import.meta.env.VITE_API_URL ?? ''

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export interface AdminUser {
  id: string
  username: string
  name: string
  role: 'SUPER_ADMIN' | 'SOPORTE'
}

export function getAdminUser(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem('adminUser')
    return raw ? (JSON.parse(raw) as AdminUser) : null
  } catch {
    return null
  }
}

function getKey() {
  return sessionStorage.getItem('adminToken') ?? ''
}

function clearSession() {
  sessionStorage.removeItem('adminToken')
  sessionStorage.removeItem('adminUser')
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
    clearSession()
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
    clearSession()
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
