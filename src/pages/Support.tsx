import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../lib/api'
import { TicketStatusBadge } from '../components/Badge'
import { formatDateTime } from '../lib/utils'
import type { SupportTicket, SupportTicketStatus } from '../types'

const STATUS_TABS: { value: SupportTicketStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CLOSED', label: 'Cerrados' },
]

const LIMIT = 20

export function Support() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<SupportTicketStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (status !== 'ALL') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())

    adminApi.get<{ data: SupportTicket[]; total: number }>(`/api/admin/support/tickets?${params}`)
      .then(res => {
        if (cancelled) return
        setTickets(res.data)
        setTotal(res.total)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Error al cargar los tickets')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, status, search])

  useEffect(() => { setPage(1) }, [status, search])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soporte</h1>
        <p className="text-sm text-slate-500 mt-1">{total} ticket{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                status === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por asunto o correo..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Asunto', 'Remitente', 'Estado', 'Última actividad'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tickets.map(t => (
              <tr
                key={t.id}
                onClick={() => navigate(`/support/${t.id}`)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 truncate max-w-md">{t.subject}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{t.requesterName ?? t.requesterEmail}</td>
                <td className="px-6 py-4"><TicketStatusBadge status={t.status} /></td>
                <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{formatDateTime(t.lastMessageAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && tickets.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            {error ?? 'No hay tickets que coincidan con el filtro'}
          </div>
        )}
        {loading && (
          <div className="text-center py-16 text-slate-400 text-sm">Cargando…</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
