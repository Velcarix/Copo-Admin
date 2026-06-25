import { createContext, useContext, useState } from 'react'
import type { Client, License, LicenseStatus } from '../types'
import { MOCK_CLIENTS, MOCK_LICENSES } from '../data/mock'

interface AppContextValue {
  clients: Client[]
  licenses: License[]
  addClient: (client: Client) => void
  addLicense: (license: License) => void
  updateLicenseStatus: (id: string, status: LicenseStatus) => void
  deleteLicense: (id: string) => void
  getClientLicenses: (clientId: string) => License[]
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS)
  const [licenses, setLicenses] = useState<License[]>(MOCK_LICENSES)

  function addClient(client: Client) {
    setClients(prev => [client, ...prev])
  }

  function addLicense(license: License) {
    setLicenses(prev => [license, ...prev])
  }

  function updateLicenseStatus(id: string, status: LicenseStatus) {
    setLicenses(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
  }

  function deleteLicense(id: string) {
    setLicenses(prev => prev.filter(l => l.id !== id))
  }

  function getClientLicenses(clientId: string) {
    return licenses.filter(l => l.clientId === clientId)
  }

  return (
    <AppContext.Provider
      value={{ clients, licenses, addClient, addLicense, updateLicenseStatus, deleteLicense, getClientLicenses }}
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
