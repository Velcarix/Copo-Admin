export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function isExpiringSoon(dateStr: string): boolean {
  const expiry = new Date(dateStr)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

export function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Convierte HTML de correo (potencialmente de remitentes externos no confiables) a texto
// plano legible. Deliberadamente NO se usa dangerouslySetInnerHTML para evitar XSS vía
// correos entrantes de soporte.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
