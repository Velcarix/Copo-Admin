import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronLeft, ChevronRight, Gift, Link2, PauseCircle, PlayCircle, Check, Copy } from 'lucide-react'
import { loyaltyApi } from '../lib/api'
import { useApp } from '../store/AppContext'
import { LoyaltyLicenseBadge } from '../components/Badge'
import { Modal, FormField, inputClass } from '../components/Modal'
import { formatDate } from '../lib/utils'
import type { LoyaltyLicenseStatus, LoyaltyMerchantSummary } from '../types'

const LIMIT = 20

const EMPTY_CREATE_FORM = {
  posClientId: '',
  businessName: '',
  email: '',
  phone: '',
  vertical: '',
  plan: 'basico' as 'basico' | 'pro' | 'enterprise',
  status: 'trial' as LoyaltyLicenseStatus,
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
}

interface CreateLoyaltyLicenseResponse {
  data: {
    merchant: LoyaltyMerchantSummary
    license: { licenseKey: string; status: LoyaltyLicenseStatus; plan: string; expiresAt: string | null }
    temporaryPassword: string
  }
}

export function Loyalty() {
  const navigate = useNavigate()
  const { clients } = useApp()
  const [merchants, setMerchants] = useState<LoyaltyMerchantSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<{ licenseKey: string; temporaryPassword: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (search.trim()) params.set('search', search.trim())

    loyaltyApi.get<{ data: LoyaltyMerchantSummary[]; total: number }>(`/api/v1/admin/merchants?${params}`)
      .then(res => {
        if (cancelled) return
        setMerchants(res.data)
        setTotal(res.total)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Error al cargar los merchants de Loyalty')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, search, reloadTick])

  useEffect(() => { setPage(1) }, [search])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  async function toggleLicense(m: LoyaltyMerchantSummary) {
    if (!m.license || m.license.status === 'expired') return
    const nextStatus = m.license.status === 'active' ? 'suspended' : 'active'
    setTogglingId(m.id)
    try {
      await loyaltyApi.patch<{ data: { status: 'active' | 'suspended' | 'expired' } }>(
        `/api/v1/admin/merchants/${m.id}/license`,
        { status: nextStatus },
      )
      setMerchants(prev => prev.map(x => x.id === m.id && x.license
        ? { ...x, license: { ...x.license, status: nextStatus } }
        : x))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la licencia')
    } finally {
      setTogglingId(null)
    }
  }

  function cf(field: keyof typeof createForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCreateForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function selectPosClient(clientId: string) {
    const client = clients.find(c => c.id === clientId)
    setCreateForm(prev => ({
      ...prev,
      posClientId: clientId,
      businessName: client ? client.businessName : prev.businessName,
      email: client ? client.email : prev.email,
      phone: client ? client.phone : prev.phone,
    }))
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateForm({ ...EMPTY_CREATE_FORM })
    setCreateError(null)
    setCreateResult(null)
  }

  async function handleCreate() {
    if (!createForm.businessName || !createForm.email) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await loyaltyApi.post<CreateLoyaltyLicenseResponse>('/api/v1/admin/merchants', {
        email: createForm.email,
        businessName: createForm.businessName,
        phone: createForm.phone || undefined,
        vertical: createForm.vertical || undefined,
        plan: createForm.plan,
        status: createForm.status,
        expiresAt: new Date(createForm.expiresAt).toISOString(),
      })
      setCreateResult({ licenseKey: res.data.license.licenseKey, temporaryPassword: res.data.temporaryPassword })
      setPage(1)
      setReloadTick(t => t + 1)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear la licencia')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Loyalty</h1>
          <p className="text-sm text-slate-500 mt-1">{total} merchant{total !== 1 ? 's' : ''} de Copo Loyalty</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nueva licencia
        </button>
      </div>

      <div className="relative w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por negocio o correo..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Negocio', 'Licencia', 'POS', 'Programas', 'Clientes', 'Alta', ''].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {merchants.map(m => (
              <tr
                key={m.id}
                onClick={() => navigate(`/loyalty/${m.id}`)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Gift size={14} className="text-violet-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{m.businessName}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {m.license ? <LoyaltyLicenseBadge status={m.license.status} /> : (
                    <span className="text-xs text-slate-400">Sin licencia</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {m.posLinked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Link2 size={13} /> Vinculado
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Sin vincular</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{m.programsCount}</td>
                <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{m.customersCount}</td>
                <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{formatDate(m.createdAt)}</td>
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                  {m.license && m.license.status !== 'expired' && (
                    <button
                      onClick={() => toggleLicense(m)}
                      disabled={togglingId === m.id}
                      title={m.license.status === 'active' ? 'Suspender' : 'Activar'}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                    >
                      {m.license.status === 'active' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && merchants.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            {error ?? 'No hay merchants que coincidan con el filtro'}
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

      {/* Create license modal — formulario */}
      {showCreate && !createResult && (
        <Modal
          title="Nueva licencia de Loyalty"
          onClose={closeCreate}
          onConfirm={handleCreate}
          confirmLabel="Crear licencia"
          confirmDisabled={!createForm.businessName || !createForm.email || creating}
          error={createError}
          size="lg"
        >
          <div className="space-y-4">
            <FormField label="Cliente POS existente" hint="Opcional — solo precarga los datos. El vínculo real con Copo POS se hace después desde la app (Ajustes → Conectar Copo POS).">
              <select value={createForm.posClientId} onChange={e => selectPosClient(e.target.value)} className={inputClass}>
                <option value="">Negocio nuevo (sin cliente POS)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Nombre del negocio" required>
              <input value={createForm.businessName} onChange={cf('businessName')} placeholder="Ej. Cafetería Luna" className={inputClass} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Correo" required>
                <input type="email" value={createForm.email} onChange={cf('email')} placeholder="negocio@ejemplo.com" className={inputClass} />
              </FormField>
              <FormField label="Teléfono">
                <input value={createForm.phone} onChange={cf('phone')} placeholder="Opcional" className={inputClass} />
              </FormField>
            </div>

            <FormField label="Giro" hint="Opcional — ej. cafetería, salón de belleza">
              <input value={createForm.vertical} onChange={cf('vertical')} className={inputClass} />
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
                  <option value="trial">Prueba</option>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </FormField>
            </div>

            <FormField label="Vencimiento">
              <input type="date" value={createForm.expiresAt} onChange={cf('expiresAt')} className={inputClass} />
            </FormField>

            <div className="bg-blue-50 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-700 font-medium">Clave de licencia y contraseña temporal</p>
              <p className="text-xs text-blue-500 mt-0.5">Se generarán automáticamente al crear — cópialas y compártelas con el negocio.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Create license modal — resultado */}
      {showCreate && createResult && (
        <Modal title="Licencia creada" onClose={closeCreate} confirmLabel="Entendido" onConfirm={async () => closeCreate()}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <Check size={16} /> El negocio ya puede iniciar sesión en la app de Loyalty
            </div>
            <CopyField label="Correo" value={createForm.email} />
            <CopyField label="Contraseña temporal" value={createResult.temporaryPassword} />
            <CopyField label="Clave de licencia" value={createResult.licenseKey} />
            <p className="text-xs text-slate-400">
              Comparte estos datos con el negocio por un canal seguro. La contraseña no se volverá a mostrar.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-mono text-slate-700 truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
