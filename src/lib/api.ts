const BASE = import.meta.env.VITE_API_URL ?? ''
const LOYALTY_BASE = import.meta.env.VITE_LOYALTY_API_URL ?? ''

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

export function logout(): void {
  clearSession()
}

async function requestTo<T>(base: string, method: string, path: string, body?: unknown): Promise<T> {
  const url = `${base}${path}`
  const res = await fetch(url, {
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
    const text = await res.text()
    let apiMessage: string | undefined
    try {
      apiMessage = (JSON.parse(text) as { error?: { message?: string } }).error?.message
    } catch {
      // La respuesta no es JSON (ej. una pagina 404 de la plataforma de hosting) — se muestra el texto crudo.
    }
    const detail = apiMessage ?? text.slice(0, 200) ?? ''
    throw new Error(`${method} ${url} → ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  return res.json() as Promise<T>
}

function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return requestTo<T>(BASE, method, path, body)
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

export async function fetchBinary(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
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
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

// Backend independiente de Copo Loyalty (VITE_LOYALTY_API_URL). Reusa el mismo
// adminToken de sessionStorage — el JWT admin valida en ambos backends.
export const loyaltyApi = {
  get: <T>(path: string) => requestTo<T>(LOYALTY_BASE, 'GET', path),
  post: <T>(path: string, body: unknown) => requestTo<T>(LOYALTY_BASE, 'POST', path, body),
  put: <T>(path: string, body: unknown) => requestTo<T>(LOYALTY_BASE, 'PUT', path, body),
  patch: <T>(path: string, body: unknown) => requestTo<T>(LOYALTY_BASE, 'PATCH', path, body),
  delete: <T>(path: string) => requestTo<T>(LOYALTY_BASE, 'DELETE', path),
}
