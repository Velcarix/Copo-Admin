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
  billingNotice?: string
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

// ── Soporte ──────────────────────────────────────────────────────────────────

export type SupportTicketStatus = 'OPEN' | 'PENDING' | 'CLOSED'

export interface SupportAttachment {
  id: string
  filename: string
  contentType: string
}

export interface SupportMessage {
  id: string
  ticketId: string
  direction: 'INBOUND' | 'OUTBOUND'
  fromEmail: string
  toEmails: string[]
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  authorAdminId: string | null
  createdAt: string
  attachments: SupportAttachment[]
}

export interface SupportTicket {
  id: string
  subject: string
  status: SupportTicketStatus
  requesterEmail: string
  requesterName: string | null
  businessId: string | null
  assignedToId: string | null
  lastMessageAt: string
  createdAt: string
  closedAt: string | null
}

export interface SupportTicketWithMessages extends SupportTicket {
  messages: SupportMessage[]
}

export type LoyaltyLicenseStatus = 'active' | 'suspended' | 'expired' | 'trial'
export type LoyaltyProgramType = 'visits' | 'points'

export interface LoyaltyLicenseSummary {
  licenseKey: string
  status: LoyaltyLicenseStatus
  plan: string
  expiresAt: string | null
}

export interface LoyaltyMerchantSummary {
  id: string
  businessName: string
  email: string
  plan: string
  createdAt: string
  license: LoyaltyLicenseSummary | null
  posLinked: boolean
  programsCount: number
  customersCount: number
}

export interface LoyaltyProgramSummary {
  id: string
  name: string
  type: LoyaltyProgramType
  isActive: boolean
  createdAt: string
  customersCount: number
  transactionsCount: number
}

export interface LoyaltyMerchantDetail {
  id: string
  businessName: string
  email: string
  phone: string | null
  vertical: string | null
  plan: string
  createdAt: string
  license: (LoyaltyLicenseSummary & { lastValidatedAt: string | null }) | null
  posLink: { posBusinessId: string; linkedAt: string } | null
  locations: { id: string; name: string; isActive: boolean }[]
  programs: LoyaltyProgramSummary[]
}
