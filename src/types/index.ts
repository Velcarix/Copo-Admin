export type Plan = 'basico' | 'pro' | 'enterprise'
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'trial'

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
  ownerUsername?: string
}

export interface MRRPoint {
  month: string
  mrr: number
}

export interface ClientsPoint {
  month: string
  nuevos: number
}
