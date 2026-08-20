import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Link2, Users, Layers, PauseCircle, PlayCircle } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { loyaltyApi } from '../lib/api'
import { LoyaltyLicenseBadge } from '../components/Badge'
import { StatCard } from '../components/StatCard'
import { formatDate, formatDateTime } from '../lib/utils'
import type { LoyaltyMerchantDetail as LoyaltyMerchantDetailType } from '../types'

export function LoyaltyMerchantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients } = useApp()

  const [merchant, setMerchant] = useState<LoyaltyMerchantDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loyaltyApi.get<{ data: LoyaltyMerchantDetailType }>(`/api/v1/admin/merchants/${id}`)
      .then(res => { if (!cancelled) setMerchant(res.data) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el merchant') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function toggleLicense() {
    if (!merchant?.license || merchant.license.status === 'expired') return
    const nextStatus = merchant.license.status === 'active' ? 'suspended' : 'active'
    setToggling(true)
    try {
      await loyaltyApi.patch(`/api/v1/admin/merchants/${merchant.id}/license`, { status: nextStatus })
      setMerchant(prev => prev && prev.license ? { ...prev, license: { ...prev.license, status: nextStatus } } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la licencia')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Cargando…</div>
  }

  if (!merchant) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/loyalty')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft size={15} /> Loyalty
        </button>
        <div className="text-center py-16 text-slate-400 text-sm">{error ?? 'Merchant no encontrado'}</div>
      </div>
    )
  }

  const linkedClient = merchant.posLink ? clients.find(c => c.id === merchant.posLink!.posBusinessId) : undefined
  const totalCustomers = merchant.programs.reduce((sum, p) => sum + p.customersCount, 0)
  const totalTransactions = merchant.programs.reduce((sum, p) => sum + p.transactionsCount, 0)

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/loyalty')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} /> Loyalty
      </button>

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900 truncate">{merchant.businessName}</h1>
            {merchant.license && <LoyaltyLicenseBadge status={merchant.license.status} />}
          </div>
          <div className="text-sm text-slate-500 mt-1">{merchant.email}{merchant.phone ? ` — ${merchant.phone}` : ''}</div>
          <div className="text-xs text-slate-400 mt-1">Alta {formatDate(merchant.createdAt)} · plan {merchant.plan}</div>
        </div>

        {merchant.license && merchant.license.status !== 'expired' && (
          <button
            onClick={toggleLicense}
            disabled={toggling}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shrink-0"
          >
            {merchant.license.status === 'active' ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
            {merchant.license.status === 'active' ? 'Suspender licencia' : 'Activar licencia'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Programas" value={String(merchant.programs.length)} icon={Gift} iconBg="bg-violet-500" />
        <StatCard title="Clientes finales" value={String(totalCustomers)} icon={Users} iconBg="bg-blue-500" />
        <StatCard title="Transacciones" value={String(totalTransactions)} icon={Layers} iconBg="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Licencia</h2>
          {merchant.license ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Estado</dt><dd><LoyaltyLicenseBadge status={merchant.license.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Clave</dt><dd className="text-xs font-mono text-slate-700">{merchant.license.licenseKey}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Plan</dt><dd className="text-slate-700">{merchant.license.plan}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Expira</dt><dd className="text-slate-700">{merchant.license.expiresAt ? formatDate(merchant.license.expiresAt) : 'Sin vencimiento'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Última validación</dt><dd className="text-slate-700">{merchant.license.lastValidatedAt ? formatDateTime(merchant.license.lastValidatedAt) : '—'}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Sin licencia emitida.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Vínculo con Copo POS</h2>
          {merchant.posLink ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Link2 size={14} /> Vinculado desde {formatDate(merchant.posLink.linkedAt)}
              </div>
              {linkedClient ? (
                <button onClick={() => navigate(`/clients/${linkedClient.id}`)} className="text-xs text-blue-600 hover:underline">
                  Cliente POS: {linkedClient.businessName}
                </button>
              ) : (
                <p className="text-xs text-slate-400">ID de negocio POS: {merchant.posLink.posBusinessId}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin vincular a un cliente de Copo POS.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Programas</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Nombre', 'Tipo', 'Estado', 'Clientes', 'Transacciones', 'Creado'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {merchant.programs.map(p => (
              <tr key={p.id}>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{p.type === 'points' ? 'Puntos' : 'Visitas'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={p.isActive ? 'text-emerald-600' : 'text-slate-400'}>{p.isActive ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{p.customersCount}</td>
                <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{p.transactionsCount}</td>
                <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {merchant.programs.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">Este merchant aún no tiene programas.</div>
        )}
      </div>
    </div>
  )
}
