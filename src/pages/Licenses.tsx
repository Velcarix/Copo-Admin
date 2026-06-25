import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ExternalLink } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { StatusBadge, PlanBadge } from '../components/Badge'
import { Modal, FormField, inputClass } from '../components/Modal'
import { formatDate, formatCurrency, generateLicenseKey, generateId, isExpiringSoon } from '../lib/utils'
import { PLAN_PRICES } from '../data/mock'
import type { License, LicenseStatus, Plan } from '../types'

type FilterStatus = 'all' | LicenseStatus

const FILTER_TABS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'trial', label: 'Prueba' },
  { value: 'suspended', label: 'Suspendidas' },
  { value: 'expired', label: 'Expiradas' },
]

const EMPTY_FORM = {
  clientId: '',
  branchName: '',
  branchAddress: '',
  plan: 'basico' as Plan,
  status: 'active' as LicenseStatus,
  startedAt: new Date().toISOString().split('T')[0],
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
}

export function Licenses() {
  const { licenses, clients, addLicense } = useApp()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {}
    clients.forEach(c => { m[c.id] = c.businessName })
    return m
  }, [clients])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return licenses.filter(l => {
      const matchesStatus = filter === 'all' || l.status === filter
      const matchesSearch =
        !q ||
        l.licenseKey.toLowerCase().includes(q) ||
        l.branchName.toLowerCase().includes(q) ||
        (clientMap[l.clientId] ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [licenses, filter, search, clientMap])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: licenses.length }
    licenses.forEach(l => { c[l.status] = (c[l.status] ?? 0) + 1 })
    return c
  }, [licenses])

  function f(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleCreate() {
    if (!form.clientId || !form.branchName) return
    const license: License = {
      id: generateId(),
      clientId: form.clientId,
      licenseKey: generateLicenseKey(),
      branchName: form.branchName,
      branchAddress: form.branchAddress,
      plan: form.plan,
      status: form.status,
      monthlyAmount: form.status === 'trial' ? 0 : PLAN_PRICES[form.plan],
      startedAt: form.startedAt,
      expiresAt: form.expiresAt,
      createdAt: new Date().toISOString(),
    }
    addLicense(license)
    setShowCreate(false)
    setForm({ ...EMPTY_FORM })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Licencias</h1>
          <p className="text-sm text-slate-500 mt-1">{licenses.length} licencias en total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nueva licencia
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              filter === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs tabular-nums ${
              filter === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[tab.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por clave, sucursal o cliente..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Clave de licencia', 'Sucursal', 'Cliente', 'Plan', 'Estado', 'Vence', 'Mensual', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(l => {
              const soon = l.status === 'active' && isExpiringSoon(l.expiresAt)
              return (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {l.licenseKey}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{l.branchName}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{clientMap[l.clientId] ?? '—'}</td>
                  <td className="px-5 py-3.5"><PlanBadge plan={l.plan} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3.5">
                    <p className={`text-sm tabular-nums ${soon ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                      {formatDate(l.expiresAt)}
                    </p>
                    {soon && <p className="text-xs text-amber-500">Vence pronto</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-900 tabular-nums">
                    {l.monthlyAmount > 0 ? formatCurrency(l.monthlyAmount) : <span className="text-slate-400 font-normal">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => navigate(`/clients/${l.clientId}`)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Ver cliente"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No se encontraron licencias
          </div>
        )}
      </div>

      {/* Create license modal */}
      {showCreate && (
        <Modal
          title="Nueva licencia"
          onClose={() => { setShowCreate(false); setForm({ ...EMPTY_FORM }) }}
          onConfirm={handleCreate}
          confirmLabel="Crear licencia"
          confirmDisabled={!form.clientId || !form.branchName}
          size="lg"
        >
          <div className="space-y-4">
            <FormField label="Cliente" required>
              <select value={form.clientId} onChange={f('clientId')} className={inputClass}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Nombre de la sucursal" required>
              <input value={form.branchName} onChange={f('branchName')} placeholder="Ej. Sucursal Centro" className={inputClass} />
            </FormField>

            <FormField label="Dirección de la sucursal">
              <input value={form.branchAddress} onChange={f('branchAddress')} placeholder="Calle, colonia, ciudad" className={inputClass} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Plan">
                <select value={form.plan} onChange={f('plan')} className={inputClass}>
                  <option value="basico">Básico — $499/mes</option>
                  <option value="pro">Pro — $899/mes</option>
                  <option value="enterprise">Enterprise — $1,799/mes</option>
                </select>
              </FormField>
              <FormField label="Estado">
                <select value={form.status} onChange={f('status')} className={inputClass}>
                  <option value="active">Activa</option>
                  <option value="trial">Prueba</option>
                  <option value="suspended">Suspendida</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Inicio">
                <input type="date" value={form.startedAt} onChange={f('startedAt')} className={inputClass} />
              </FormField>
              <FormField label="Vencimiento">
                <input type="date" value={form.expiresAt} onChange={f('expiresAt')} className={inputClass} />
              </FormField>
            </div>

            <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Clave de licencia</p>
                <p className="text-xs text-blue-500 mt-0.5">Se generará automáticamente al crear</p>
              </div>
              <span className="text-sm font-semibold text-blue-800">
                {form.status === 'trial' ? 'Gratis (prueba)' : formatCurrency(PLAN_PRICES[form.plan])}/mes
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
