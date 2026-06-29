import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, Building2, MapPin, Copy, Check, User, KeyRound } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Modal, FormField, inputClass } from '../components/Modal'
import { formatDate, formatCurrency } from '../lib/utils'

interface CreatedCredentials {
  businessName: string
  ownerName: string
  email: string
  username: string
  tempPassword: string
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
        <p className="text-sm font-mono text-slate-800 font-semibold">{value}</p>
      </div>
      <button
        onClick={copy}
        className="ml-3 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
        title="Copiar"
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

const EMPTY_FORM = { ownerName: '', businessName: '', email: '', phone: '', city: '', state: '' }

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function Clients() {
  const { clients, licenses, addClient } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [createError, setCreateError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null)

  const filtered = useMemo(
    () =>
      clients.filter(
        c =>
          c.businessName.toLowerCase().includes(search.toLowerCase()) ||
          c.ownerName.toLowerCase().includes(search.toLowerCase()) ||
          c.city.toLowerCase().includes(search.toLowerCase()),
      ),
    [clients, search],
  )

  function clientStats(clientId: string) {
    const cls = licenses.filter(l => l.clientId === clientId)
    const active = cls.filter(l => l.status === 'active')
    const mrr = active.reduce((s, l) => s + l.monthlyAmount, 0)
    return { total: cls.length, active: active.length, mrr }
  }

  async function handleCreate() {
    setCreateError(null)
    try {
      const owner = await addClient(form)
      setShowCreate(false)
      setCredentials({
        businessName: form.businessName,
        ownerName: form.ownerName,
        email: form.email,
        username: owner.username,
        tempPassword: owner.tempPassword,
      })
      setForm({ ...EMPTY_FORM })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear el cliente')
    }
  }

  function openCreate() {
    setCreateError(null)
    setShowCreate(true)
  }

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">{clients.length} clientes registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por negocio, propietario o ciudad..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Negocio', 'Propietario', 'Ubicación', 'Licencias', 'MRR mensual', 'Desde', ''].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(c => {
              const s = clientStats(c.id)
              return (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{c.businessName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{c.ownerName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin size={12} className="text-slate-300" />
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{s.total}</span>
                      <span className="text-xs text-slate-400">({s.active} activas)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 tabular-nums">
                    {s.mrr > 0 ? formatCurrency(s.mrr) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{formatDate(c.createdAt)}</td>
                  <td className="px-6 py-4">
                    <ChevronRight size={16} className="text-slate-300" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No se encontraron clientes
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal
          title="Nuevo cliente"
          onClose={() => { setShowCreate(false); setCreateError(null) }}
          onConfirm={handleCreate}
          confirmLabel="Crear cliente"
          confirmDisabled={!form.ownerName || !form.businessName || !form.email || (form.email.length > 0 && !isValidEmail(form.email))}
          error={createError}
        >
          <div className="space-y-4">
            <FormField label="Nombre del negocio" required>
              <input value={form.businessName} onChange={f('businessName')} placeholder="Ej. Heladería La Paloma" className={inputClass} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Propietario" required>
                <input value={form.ownerName} onChange={f('ownerName')} placeholder="Nombre completo" className={inputClass} />
              </FormField>
              <FormField label="Correo electrónico" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={f('email')}
                  placeholder="correo@dominio.mx"
                  className={`${inputClass} ${form.email && !isValidEmail(form.email) ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {form.email && !isValidEmail(form.email) && (
                  <p className="text-xs text-red-500 mt-1">Formato inválido — usa nombre@dominio.com</p>
                )}
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Teléfono">
                <input value={form.phone} onChange={f('phone')} placeholder="+52 999 000 0000" className={inputClass} />
              </FormField>
              <FormField label="Ciudad">
                <input value={form.city} onChange={f('city')} placeholder="Mérida" className={inputClass} />
              </FormField>
            </div>
            <FormField label="Estado">
              <input value={form.state} onChange={f('state')} placeholder="Yucatán" className={inputClass} />
            </FormField>
          </div>
        </Modal>
      )}

      {/* Credentials summary modal */}
      {credentials && (
        <Modal
          title="Cliente creado"
          onClose={() => setCredentials(null)}
        >
          <div className="space-y-5">
            {/* Success indicator */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">{credentials.businessName}</p>
                <p className="text-xs text-emerald-600">{credentials.ownerName} · {credentials.email}</p>
              </div>
            </div>

            {/* Owner credentials */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center">
                  <User size={12} className="text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Acceso del propietario (OWNER)</p>
              </div>
              <div className="space-y-2">
                <CopyField label="Usuario" value={credentials.username} />
                <CopyField label="Contraseña temporal" value={credentials.tempPassword} />
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <KeyRound size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Esta contraseña es temporal. Al ingresar al dashboard por primera vez, el cliente deberá cambiarla. Guarda estas credenciales en un lugar seguro — no se podrán recuperar después.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
