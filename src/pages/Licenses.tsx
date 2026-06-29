import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ExternalLink, Download, Pencil, RefreshCw, Check } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { LicenseUpdateData } from '../store/AppContext'
import { StatusBadge, PlanBadge } from '../components/Badge'
import { Modal, FormField, inputClass } from '../components/Modal'
import { formatDate, formatCurrency, isExpiringSoon } from '../lib/utils'
import { downloadFile, adminApi } from '../lib/api'
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

const EMPTY_CREATE_FORM = {
  clientId: '',
  branchName: '',
  branchAddress: '',
  plan: 'basico' as Plan,
  status: 'active' as LicenseStatus,
  startedAt: new Date().toISOString().split('T')[0],
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
}

// "tipo" combina plan+status en la vista del admin:
// 'basico' → plan=basico, status=active|expired
// 'prueba' → status=trial (plan=basico under the hood)
type TipoLicencia = 'basico' | 'prueba'

interface EditForm {
  branchName: string
  street: string
  postalCode: string
  colonia: string
  city: string
  state: string
  tipo: TipoLicencia
  status: 'active' | 'expired'
  expiresAt: string
}

function licenseToEditForm(l: License): EditForm {
  return {
    branchName: l.branchName,
    street: '',
    postalCode: '',
    colonia: '',
    city: '',
    state: '',
    tipo: l.status === 'trial' ? 'prueba' : 'basico',
    status: l.status === 'expired' ? 'expired' : 'active',
    expiresAt: l.expiresAt,
  }
}

export function Licenses() {
  const { licenses, clients, addLicense, updateLicense, regenerateLicenseKey } = useApp()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM })

  const [editTarget, setEditTarget] = useState<License | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenDone, setRegenDone] = useState<string | null>(null)
  const [editColonias, setEditColonias] = useState<string[]>([])
  const [editCpLoading, setEditCpLoading] = useState(false)

  useEffect(() => {
    const cp = editForm?.postalCode ?? ''
    if (cp.length !== 5) { setEditColonias([]); return }
    let cancelled = false
    setEditCpLoading(true)
    adminApi.get<{ data: { city: string; state: string; colonias: string[] } }>(`/api/admin/postal-code/${cp}`)
      .then(res => {
        if (cancelled) return
        setEditForm(prev => prev ? { ...prev, city: res.data.city, state: res.data.state } : prev)
        setEditColonias(res.data.colonias)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setEditCpLoading(false) })
    return () => { cancelled = true }
  }, [editForm?.postalCode])

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

  function cf(field: keyof typeof createForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCreateForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function ef(field: keyof EditForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm(prev => prev ? { ...prev, [field]: e.target.value } : prev)
  }

  function handleCreate() {
    if (!createForm.clientId || !createForm.branchName) return
    addLicense({
      clientId: createForm.clientId,
      branchName: createForm.branchName,
      branchAddress: createForm.branchAddress,
      plan: createForm.plan,
      status: createForm.status,
      monthlyAmount: createForm.status === 'trial' ? 0 : PLAN_PRICES[createForm.plan],
      startedAt: createForm.startedAt,
      expiresAt: createForm.expiresAt,
    })
    setShowCreate(false)
    setCreateForm({ ...EMPTY_CREATE_FORM })
  }

  function openEdit(l: License) {
    setEditTarget(l)
    setEditForm(licenseToEditForm(l))
    setEditError(null)
    setShowRegenConfirm(false)
    setRegenDone(null)
  }

  async function handleRegenerate() {
    if (!editTarget) return
    const newKey = await regenerateLicenseKey(editTarget.id)
    setRegenDone(newKey)
    setShowRegenConfirm(false)
    // actualizar el form para mostrar nueva clave
    setEditTarget(prev => prev ? { ...prev, licenseKey: newKey } : prev)
  }

  async function handleEdit() {
    if (!editTarget || !editForm) return
    const addressParts = [editForm.street, editForm.colonia, editForm.city, editForm.state, editForm.postalCode].filter(Boolean)
    const data: LicenseUpdateData = {
      branchName: editForm.branchName,
      expiresAt: editForm.expiresAt,
      ...(addressParts.length > 0 ? { branchAddress: addressParts.join(', ') } : {}),
    }
    if (editForm.tipo === 'prueba') {
      data.plan = 'basico'
      data.status = 'trial'
    } else {
      data.plan = 'basico'
      data.status = editForm.status
    }
    await updateLicense(editTarget.id, data)
    setEditTarget(null)
    setEditForm(null)
    setEditColonias([])
  }

  async function handleGenerateFile(licenseId: string, branchName: string) {
    try {
      const blob = await downloadFile(`/api/admin/licenses/${licenseId}/generate-file`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `licencia-${branchName.toLowerCase().replace(/\s+/g, '-')}.copo`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // error visible en la consola del backend
    }
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
              {['Clave de licencia', 'Sucursal', 'Cliente', 'Plan', 'Estado', 'Vence', ''].map(h => (
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
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(l)}
                        title="Editar licencia"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {l.status !== 'suspended' && l.status !== 'expired' && (
                        <button
                          onClick={() => handleGenerateFile(l.id, l.branchName)}
                          title="Descargar licencia (.copo)"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/clients/${l.clientId}`)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Ver cliente"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
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
          onClose={() => { setShowCreate(false); setCreateForm({ ...EMPTY_CREATE_FORM }) }}
          onConfirm={handleCreate}
          confirmLabel="Crear licencia"
          confirmDisabled={!createForm.clientId || !createForm.branchName}
          size="lg"
        >
          <div className="space-y-4">
            <FormField label="Cliente" required>
              <select value={createForm.clientId} onChange={cf('clientId')} className={inputClass}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Nombre de la sucursal" required>
              <input value={createForm.branchName} onChange={cf('branchName')} placeholder="Ej. Sucursal Centro" className={inputClass} />
            </FormField>

            <FormField label="Dirección de la sucursal">
              <input value={createForm.branchAddress} onChange={cf('branchAddress')} placeholder="Calle, colonia, ciudad" className={inputClass} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Plan">
                <select value={createForm.plan} onChange={cf('plan')} className={inputClass}>
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </FormField>
              <FormField label="Estado">
                <select value={createForm.status} onChange={cf('status')} className={inputClass}>
                  <option value="active">Activo</option>
                  <option value="trial">Prueba</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Inicio">
                <input type="date" value={createForm.startedAt} onChange={cf('startedAt')} className={inputClass} />
              </FormField>
              <FormField label="Vencimiento">
                <input type="date" value={createForm.expiresAt} onChange={cf('expiresAt')} className={inputClass} />
              </FormField>
            </div>

            <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Clave de licencia</p>
                <p className="text-xs text-blue-500 mt-0.5">Se generará automáticamente al crear</p>
              </div>
              <span className="text-sm font-semibold text-blue-800">
                {createForm.status === 'trial' ? 'Gratis (prueba)' : formatCurrency(PLAN_PRICES[createForm.plan])}/mes
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit license modal */}
      {editTarget && editForm && (
        <Modal
          title="Editar licencia"
          onClose={() => { setEditTarget(null); setEditForm(null); setShowRegenConfirm(false); setRegenDone(null) }}
          onConfirm={handleEdit}
          confirmLabel="Guardar cambios"
          confirmDisabled={!editForm.branchName}
          error={editError}
        >
          <div className="space-y-4">
            {/* Clave actual */}
            <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">Clave de licencia</p>
                <p className="text-xs font-mono text-slate-600 truncate">{editTarget.licenseKey}</p>
              </div>
              {regenDone ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium shrink-0">
                  <Check size={13} /> Clave regenerada
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
                >
                  <RefreshCw size={12} />
                  Regenerar clave
                </button>
              )}
            </div>

            {/* Confirmación de regenerar */}
            {showRegenConfirm && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">¿Regenerar la clave de licencia?</p>
                <p className="text-xs text-amber-700">
                  Se generará una nueva clave. El POS dejará de funcionar hasta que descargues y apliques el nuevo archivo <span className="font-mono">.copo</span>.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Sí, regenerar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegenConfirm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <FormField label="Nombre de la sucursal" required>
              <input value={editForm.branchName} onChange={ef('branchName')} className={inputClass} />
            </FormField>

            {editTarget.branchAddress && (
              <p className="text-xs text-slate-400">Dirección actual: <span className="text-slate-600">{editTarget.branchAddress}</span></p>
            )}

            <FormField label="Calle">
              <input value={editForm.street} onChange={ef('street')} placeholder="Ej. Av. García Lavín 123" className={inputClass} />
            </FormField>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Código postal">
                <div className="relative">
                  <input value={editForm.postalCode} onChange={ef('postalCode')} placeholder="97000" maxLength={5} className={inputClass} />
                  {editCpLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">cargando…</span>}
                </div>
              </FormField>
              <FormField label="Ciudad">
                <input value={editForm.city} readOnly placeholder="Auto" className={inputClass + ' bg-slate-50 text-slate-600'} />
              </FormField>
              <FormField label="Estado">
                <input value={editForm.state} readOnly placeholder="Auto" className={inputClass + ' bg-slate-50 text-slate-600'} />
              </FormField>
            </div>

            <FormField label="Colonia">
              {editColonias.length > 0 ? (
                <select value={editForm.colonia} onChange={ef('colonia')} className={inputClass}>
                  <option value="">Seleccionar colonia…</option>
                  {editColonias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={editForm.colonia} onChange={ef('colonia')} placeholder={editForm.postalCode.length === 5 ? 'No encontrada — escribe manualmente' : 'Ingresa el código postal primero'} className={inputClass} />
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Plan">
                <select value={editForm.tipo} onChange={ef('tipo')} className={inputClass}>
                  <option value="basico">Básico</option>
                  <option value="prueba">Prueba</option>
                </select>
              </FormField>

              {editForm.tipo === 'basico' && (
                <FormField label="Estado">
                  <select value={editForm.status} onChange={ef('status')} className={inputClass}>
                    <option value="active">Activo</option>
                    <option value="expired">Vencido</option>
                  </select>
                </FormField>
              )}
            </div>

            <FormField label="Fecha de vencimiento">
              <input type="date" value={editForm.expiresAt} onChange={ef('expiresAt')} className={inputClass} />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  )
}
