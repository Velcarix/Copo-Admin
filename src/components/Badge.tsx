import type { LicenseStatus, Plan } from '../types'

const STATUS_STYLES: Record<LicenseStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  expired: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  trial: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
}

const STATUS_LABELS: Record<LicenseStatus, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  expired: 'Expirada',
  trial: 'Prueba',
}

const PLAN_STYLES: Record<Plan, string> = {
  basico: 'bg-slate-100 text-slate-600',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-violet-100 text-violet-700',
}

const PLAN_LABELS: Record<Plan, string> = {
  basico: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export function StatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLES[plan]}`}>
      {PLAN_LABELS[plan]}
    </span>
  )
}
