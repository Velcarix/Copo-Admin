import { useMemo } from 'react'
import { Users, KeyRound, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useApp } from '../store/AppContext'
import { StatCard } from '../components/StatCard'
import { StatusBadge, PlanBadge } from '../components/Badge'
import { MRR_HISTORY, NEW_CLIENTS_HISTORY } from '../data/mock'
import { formatCurrency, formatDate, isExpiringSoon, daysUntil } from '../lib/utils'
import type { LicenseStatus } from '../types'

const STATUS_COLORS: Record<LicenseStatus, string> = {
  active: '#10b981',
  suspended: '#f59e0b',
  expired: '#ef4444',
  trial: '#3b82f6',
}

const STATUS_LABELS: Record<LicenseStatus, string> = {
  active: 'Activas',
  suspended: 'Suspendidas',
  expired: 'Expiradas',
  trial: 'Prueba',
}

export function Dashboard() {
  const { clients, licenses } = useApp()

  const stats = useMemo(() => {
    const active = licenses.filter(l => l.status === 'active')
    const expiringSoon = active.filter(l => isExpiringSoon(l.expiresAt))
    const mrr = active.reduce((sum, l) => sum + l.monthlyAmount, 0)
    return {
      totalClients: clients.length,
      activeLicenses: active.length,
      expiringSoon: expiringSoon.length,
      mrr,
    }
  }, [clients, licenses])

  const statusData = useMemo(() => {
    const counts: Record<LicenseStatus, number> = { active: 0, suspended: 0, expired: 0, trial: 0 }
    licenses.forEach(l => { counts[l.status]++ })
    return (['active', 'suspended', 'expired', 'trial'] as LicenseStatus[])
      .filter(s => counts[s] > 0)
      .map(s => ({ name: s, value: counts[s], label: STATUS_LABELS[s] }))
  }, [licenses])

  const recentLicenses = useMemo(
    () => [...licenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [licenses],
  )

  const expiringSoonList = useMemo(
    () => licenses.filter(l => l.status === 'active' && isExpiringSoon(l.expiresAt)),
    [licenses],
  )

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {}
    clients.forEach(c => { m[c.id] = c.businessName })
    return m
  }, [clients])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Resumen general de Copo — junio 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Clientes totales"
          value={String(stats.totalClients)}
          icon={Users}
          iconBg="bg-blue-500"
          trend={{ value: '+3 este mes', positive: true }}
        />
        <StatCard
          title="Licencias activas"
          value={String(stats.activeLicenses)}
          icon={KeyRound}
          iconBg="bg-emerald-500"
          subtitle={`de ${licenses.length} totales`}
        />
        <StatCard
          title="Vencen pronto"
          value={String(stats.expiringSoon)}
          icon={AlertTriangle}
          iconBg={stats.expiringSoon > 0 ? 'bg-amber-500' : 'bg-slate-400'}
          subtitle="en los próximos 30 días"
        />
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          icon={TrendingUp}
          iconBg="bg-violet-500"
          trend={{ value: '+$2,800', positive: true }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        {/* MRR Trend */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Ingresos mensuales (MRR)</h2>
          <p className="text-xs text-slate-400 mb-5">Enero – Junio 2026</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MRR_HISTORY} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'MRR']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#mrrGrad)"
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Licencias por estado</h2>
          <p className="text-xs text-slate-400 mb-2">Distribución actual</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                innerRadius={52}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map(entry => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name as LicenseStatus]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [v, '']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend
                formatter={(value: string) => {
                  const item = statusData.find(d => d.name === value)
                  return <span style={{ fontSize: 12, color: '#64748b' }}>{item?.label ?? value}</span>
                }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* New clients bar + expiring soon */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Clientes nuevos por mes</h2>
          <p className="text-xs text-slate-400 mb-5">Enero – Junio 2026</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={NEW_CLIENTS_HISTORY} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip
                formatter={(v: number) => [v, 'Clientes nuevos']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="nuevos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expiring soon */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Vencen pronto</h2>
          {expiringSoonList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin vencimientos próximos</p>
          ) : (
            <div className="space-y-3">
              {expiringSoonList.map(l => (
                <div key={l.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{l.branchName}</p>
                    <p className="text-xs text-slate-400 truncate">{clientMap[l.clientId]}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">
                    {daysUntil(l.expiresAt)}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent licenses */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Licencias recientes</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Clave', 'Sucursal', 'Cliente', 'Plan', 'Estado', 'Vence'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {recentLicenses.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5 text-xs font-mono text-slate-500">{l.licenseKey}</td>
                <td className="px-6 py-3.5 text-sm text-slate-800 font-medium">{l.branchName}</td>
                <td className="px-6 py-3.5 text-sm text-slate-500">{clientMap[l.clientId]}</td>
                <td className="px-6 py-3.5"><PlanBadge plan={l.plan} /></td>
                <td className="px-6 py-3.5"><StatusBadge status={l.status} /></td>
                <td className="px-6 py-3.5 text-sm text-slate-500 tabular-nums">{formatDate(l.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
