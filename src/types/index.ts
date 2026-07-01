export type Plan = 'basico' | 'pro' | 'enterprise'
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'trial'

export interface OwnerEmployee {
  id: string
  username: string
  name: string
  email: string | null
}

export interface Client {
  id: string
  ownerName: string
  businessName: string
  email: string
  phone: string
  city: string
  state: string
  createdAt: string
  notes?: string
  rfc?: string
  taxRegime?: string
  ownerEmployee?: OwnerEmployee
}

export interface License {
  id: string
  clientId: string
  licenseKey: string
  branchName: string
  branchAddress: string
  plan: Plan
  status: LicenseStatus
  monthlyAmount: number
  startedAt: string
  expiresAt: string
  createdAt: string
}

export interface MRRPoint {
  month: string
  mrr: number
}

export interface ClientsPoint {
  month: string
  nuevos: number
}
