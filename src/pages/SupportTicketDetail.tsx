import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Paperclip, Send, GitMerge, Mail } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { adminApi, fetchBinary, type AdminUser } from '../lib/api'
import { TicketStatusBadge } from '../components/Badge'
import { Modal, FormField, inputClass } from '../components/Modal'
import { formatDateTime, htmlToPlainText } from '../lib/utils'
import type { SupportTicket, SupportTicketWithMessages, SupportTicketStatus, SupportMessage } from '../types'

function messageBody(m: SupportMessage): string {
  if (m.bodyText) return m.bodyText
  if (m.bodyHtml) return htmlToPlainText(m.bodyHtml)
  return ''
}

function MessageBubble({ message, ticketId }: { message: SupportMessage; ticketId: string }) {
  const isOutbound = message.direction === 'OUTBOUND'

  async function openAttachment(attachmentId: string, filename: string) {
    try {
      const blob = await fetchBinary(`/api/admin/support/tickets/${ticketId}/attachments/${attachmentId}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // el error queda visible si el navegador bloquea la descarga; no hay más que reportar aquí
    }
  }

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl rounded-xl px-4 py-3 ${isOutbound ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
        <div className={`flex items-center justify-between gap-4 text-xs mb-1.5 ${isOutbound ? 'text-blue-100' : 'text-slate-400'}`}>
          <span className="font-medium">{isOutbound ? 'Soporte Copo' : message.fromEmail}</span>
          <span className="tabular-nums shrink-0">{formatDateTime(message.createdAt)}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{messageBody(message)}</p>
        {message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map(a => (
              <button
                key={a.id}
                onClick={() => openAttachment(a.id, a.filename)}
                className={`flex items-center gap-1.5 text-xs underline ${isOutbound ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-700'}`}
              >
                <Paperclip size={11} />
                {a.filename}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function SupportTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients } = useApp()

  const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [mergeError, setMergeError] = useState<string | null>(null)

  const loadTicket = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    adminApi.get<{ data: SupportTicketWithMessages }>(`/api/admin/support/tickets/${id}`)
      .then(res => setTicket(res.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Error al cargar el ticket'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadTicket() }, [loadTicket])

  useEffect(() => {
    adminApi.get<{ data: AdminUser[] }>('/api/admin/accounts').then(res => setAdmins(res.data)).catch(() => {})
  }, [])

  const business = ticket?.businessId ? clients.find(c => c.id === ticket.businessId) : undefined

  async function handleStatusChange(status: SupportTicketStatus) {
    if (!id) return
    try {
      const res = await adminApi.patch<{ data: SupportTicket }>(`/api/admin/support/tickets/${id}`, { status })
      setTicket(prev => prev ? { ...prev, ...res.data } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado')
    }
  }

  async function handleAssign(assignedToId: string) {
    if (!id) return
    try {
      const res = await adminApi.patch<{ data: SupportTicket }>(`/api/admin/support/tickets/${id}`, {
        assignedToId: assignedToId || null,
      })
      setTicket(prev => prev ? { ...prev, ...res.data } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar el ticket')
    }
  }

  async function handleReply() {
    if (!id || !replyText.trim()) return
    setSending(true)
    setSendError(null)
    try {
      const html = replyText.trim().split('\n').map(line => line || '<br>').join('<br>')
      await adminApi.post(`/api/admin/support/tickets/${id}/reply`, { html })
      setReplyText('')
      loadTicket()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Error al enviar la respuesta')
    } finally {
      setSending(false)
    }
  }

  async function handleMerge() {
    if (!id || !mergeTargetId.trim()) return
    setMergeError(null)
    try {
      await adminApi.post(`/api/admin/support/tickets/${id}/merge`, { intoTicketId: mergeTargetId.trim() })
      navigate(`/support/${mergeTargetId.trim()}`)
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Error al fusionar el ticket')
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">Cargando…</div>
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">{error ?? 'Ticket no encontrado.'}</p>
        <button onClick={() => navigate('/support')} className="text-blue-600 text-sm mt-2 hover:underline">
          Volver a soporte
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/support')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={15} />
        Soporte
      </button>

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900 truncate">{ticket.subject}</h1>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
            <Mail size={13} />
            {ticket.requesterName ? `${ticket.requesterName} — ${ticket.requesterEmail}` : ticket.requesterEmail}
          </div>
          {business && (
            <button onClick={() => navigate(`/clients/${business.id}`)} className="text-xs text-blue-600 hover:underline mt-1">
              Negocio: {business.businessName}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={ticket.assignedToId ?? ''}
            onChange={e => handleAssign(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin asignar</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {ticket.status !== 'CLOSED' ? (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cerrar ticket
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange('OPEN')}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reabrir
            </button>
          )}
          <button
            onClick={() => { setMergeError(null); setMergeTargetId(''); setShowMerge(true) }}
            title="Fusionar con otro ticket"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <GitMerge size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {ticket.messages.map(m => (
          <MessageBubble key={m.id} message={m} ticketId={ticket.id} />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder="Escribe tu respuesta..."
          rows={4}
          className={`${inputClass} resize-none`}
        />
        {sendError && <p className="text-xs text-red-500">{sendError}</p>}
        <div className="flex justify-end">
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
            {sending ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </div>
      </div>

      {showMerge && (
        <Modal
          title="Fusionar con otro ticket"
          onClose={() => setShowMerge(false)}
          onConfirm={handleMerge}
          confirmLabel="Fusionar"
          confirmDisabled={!mergeTargetId.trim()}
          error={mergeError}
        >
          <FormField label="ID del ticket destino" hint="Los mensajes de este ticket se moverán al ticket destino y este se eliminará">
            <input value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} placeholder="01H..." className={inputClass} />
          </FormField>
        </Modal>
      )}
    </div>
  )
}
