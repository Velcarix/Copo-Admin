import { createContext, useContext, useState, useEffect } from 'react'
import type { Client, License, LicenseStatus, Plan, OwnerEmployee } from '../types'
import { adminApi } from '../lib/api'

// ── Backend response types ────────────────────────────────────────────────────

type BackendPlan = 'BASIC' | 'PRO' | 'ENTERPRISE'
type BackendStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL'

interface BackendOwnerEmployee {
  id: string
  username: string
  name: string
  email: string | null
}

interface BackendBusiness {
  id: string
  name: string
  ownerName: string | null
  contactEmail: string | null
  phone: string | null
  city: string | null
  state: string | null
  notes: string | null
  createdAt: string
  employees?: BackendOwnerEmployee[]
  owner?: { username: string; name: string; tempPassword: string }
}

interface BackendBranch {
  id: string
  name: string
  address: string | null
  businessId: string
}

interface BackendBranchLicense {
  id: string
  branchId: string
  licenseKey: string
  plan: BackendPlan
  status: BackendStatus
  monthlyAmountCents: number
  startedAt: string | null
  expiresAt: string
  createdAt: string
  branch: BackendBranch
}

// ── Conversion maps ───────────────────────────────────────────────────────────

const PLAN_FROM_BACKEND: Record<BackendPlan, Plan> = {
  BASIC: 'basico',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
}

const PLAN_TO_BACKEND: Record<Plan, BackendPlan> = {
  basico: 'BASIC',
  pro: 'PRO',
  enterprise: 'ENTERPRISE',
}

const STATUS_FROM_BACKEND: Record<BackendStatus, LicenseStatus> = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  TRIAL: 'trial',
}

const STATUS_TO_BACKEND: Record<LicenseStatus, BackendStatus> = {
  active: 'ACTIVE',
  suspended: 'SUSPENDED',
  expired: 'EXPIRED',
  trial: 'TRIAL',
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapOwnerEmployee(e: BackendOwnerEmployee): OwnerEmployee {
  return { id: e.id, username: e.username, name: e.name, email: e.email }
}

function mapClient(b: BackendBusiness): Client {
  const ownerEmp = b.employees?.[0]
  return {
    id: b.id,
    businessName: b.name,
    ownerName: b.ownerName ?? '',
    email: b.contactEmail ?? '',
    phone: b.phone ?? '',
    city: b.city ?? '',
    state: b.state ?? '',
    notes: b.notes ?? undefined,
    createdAt: b.createdAt,
    ownerEmployee: ownerEmp ? mapOwnerEmployee(ownerEmp) : undefined,
  }
}

function mapLicense(l: BackendBranchLicense): License {
  return {
    id: l.id,
    clientId: l.branch.businessId,
    licenseKey: l.licenseKey,
    branchName: l.branch.name,
    branchAddress: l.branch.address ?? '',
    plan: PLAN_FROM_BACKEND[l.plan],
    status: STATUS_FROM_BACKEND[l.status],
    monthlyAmount: l.monthlyAmountCents / 100,
    startedAt: l.startedAt ? l.startedAt.split('T')[0] : '',
    expiresAt: l.expiresAt.split('T')[0],
    createdAt: l.createdAt,
  }
}

// ── Context types ─────────────────────────────────────────────────────────────

export type ClientCreateData = Omit<Client, 'id' | 'createdAt' | 'ownerEmployee'>
export type ClientUpdateData = Partial<Omit<Client, 'id' | 'createdAt' | 'ownerEmployee'>>
export type LicenseCreateData = Omit<License, 'id' | 'licenseKey' | 'createdAt'>
export interface LicenseUpdateData {
  branchName?: string
  branchAddress?: string
  plan?: Plan
  status?: LicenseStatus
  expiresAt?: string
}

interface AppContextValue {
  clients: Client[]
  licenses: License[]
  isLoading: boolean
  error: string | null
  addClient: (data: ClientCreateData) => Promise<{ id: string; username: string; name: string; tempPassword: string }>
  updateClient: (id: string, data: ClientUpdateData) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  addLicense: (data: LicenseCreateData) => Promise<string>
  updateLicense: (id: string, data: LicenseUpdateData) => Promise<void>
  updateLicenseStatus: (id: string, status: LicenseStatus) => Promise<void>
  deleteLicense: (id: string) => Promise<void>
  regenerateLicenseKey: (id: string) => Promise<string>
  getClientLicenses: (clientId: string) => License[]
}

const AppContext = createContext<AppContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [clientsRes, licensesRes] = await Promise.all([
          adminApi.get<{ data: BackendBusiness[] }>('/api/admin/clients'),
          adminApi.get<{ data: BackendBranchLicense[] }>('/api/admin/licenses'),
        ])
        setClients(clientsRes.data.map(mapClient))
        setLicenses(licensesRes.data.map(mapLicense))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  async function addClient(data: ClientCreateData) {
    const body = {
      name: data.businessName,
      ownerName: data.ownerName || undefined,
      contactEmail: data.email || undefined,
      phone: data.phone || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      notes: data.notes || undefined,
    }
    const res = await adminApi.post<{ data: BackendBusiness }>('/api/admin/clients', body)
    setClients(prev => [mapClient(res.data), ...prev])
    const owner = res.data.owner
    if (!owner) throw new Error('El servidor no devolvió las credenciales del usuario OWNER. Verifica que el backend esté actualizado.')
    return { id: res.data.id, username: owner.username, name: owner.name, tempPassword: owner.tempPassword }
  }

  async function deleteClient(id: string) {
    await adminApi.delete(`/api/admin/clients/${id}`)
    setClients(prev => prev.filter(c => c.id !== id))
    setLicenses(prev => prev.filter(l => l.clientId !== id))
  }

  async function updateClient(id: string, data: ClientUpdateData) {
    const body: Record<string, string | null | undefined> = {}
    if (data.businessName !== undefined) body.name = data.businessName
    if (data.ownerName !== undefined) body.ownerName = data.ownerName || null
    if (data.email !== undefined) body.contactEmail = data.email || null
    if (data.phone !== undefined) body.phone = data.phone || null
    if (data.city !== undefined) body.city = data.city || null
    if (data.state !== undefined) body.state = data.state || null
    if (data.notes !== undefined) body.notes = data.notes || null
    const res = await adminApi.put<{ data: BackendBusiness }>(`/api/admin/clients/${id}`, body)
    setClients(prev => prev.map(c => (c.id === id ? { ...mapClient(res.data), ownerEmployee: c.ownerEmployee } : c)))
  }

  async function addLicense(data: LicenseCreateData): Promise<string> {
    const body = {
      businessId: data.clientId,
      branchName: data.branchName,
      branchAddress: data.branchAddress || undefined,
      plan: PLAN_TO_BACKEND[data.plan],
      status: STATUS_TO_BACKEND[data.status],
      monthlyAmountCents: Math.round(data.monthlyAmount * 100),
      startedAt: data.startedAt ? `${data.startedAt}T00:00:00.000Z` : undefined,
      expiresAt: `${data.expiresAt}T00:00:00.000Z`,
    }
    const res = await adminApi.post<{
      data: { branch: BackendBranch; license: Omit<BackendBranchLicense, 'branch'> }
    }>('/api/admin/licenses', body)
    const merged: BackendBranchLicense = { ...res.data.license, branch: res.data.branch }
    setLicenses(prev => [mapLicense(merged), ...prev])
    return res.data.license.licenseKey
  }

  async function updateLicense(id: string, data: LicenseUpdateData) {
    const body: Record<string, string | undefined> = {}
    if (data.branchName) body.branchName = data.branchName
    if (data.branchAddress !== undefined) body.branchAddress = data.branchAddress
    if (data.plan) body.plan = PLAN_TO_BACKEND[data.plan]
    if (data.status) body.status = STATUS_TO_BACKEND[data.status]
    if (data.expiresAt) body.expiresAt = `${data.expiresAt}T00:00:00.000Z`
    const res = await adminApi.put<{ data: BackendBranchLicense }>(`/api/admin/licenses/${id}`, body)
    setLicenses(prev => prev.map(l => (l.id === id ? mapLicense(res.data) : l)))
  }

  async function updateLicenseStatus(id: string, status: LicenseStatus) {
    await adminApi.put(`/api/admin/licenses/${id}/status`, { status: STATUS_TO_BACKEND[status] })
    setLicenses(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
  }

  async function deleteLicense(id: string) {
    await adminApi.delete(`/api/admin/licenses/${id}`)
    setLicenses(prev => prev.filter(l => l.id !== id))
  }

  async function regenerateLicenseKey(id: string) {
    const res = await adminApi.post<{ data: BackendBranchLicense }>(`/api/admin/licenses/${id}/regenerate-key`, {})
    setLicenses(prev => prev.map(l => (l.id === id ? mapLicense(res.data) : l)))
    return res.data.licenseKey
  }

  function getClientLicenses(clientId: string) {
    return licenses.filter(l => l.clientId === clientId)
  }

  return (
    <AppContext.Provider
      value={{
        clients,
        licenses,
        isLoading,
        error,
        addClient,
        updateClient,
        deleteClient,
        addLicense,
        updateLicense,
        updateLicenseStatus,
        deleteLicense,
        regenerateLicenseKey,
        getClientLicenses,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
