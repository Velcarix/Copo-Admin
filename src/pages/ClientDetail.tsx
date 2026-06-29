import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Plus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Copy,
  Check,
  Download,
  KeyRound,
  User,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { StatusBadge, PlanBadge } from '../components/Badge'
import { Modal, FormField, inputClass } from '../components/Modal'
import { formatDate, formatCurrency, isExpiringSoon, daysUntil } from '../lib/utils'
import { downloadFile } from '../lib/api'
import { PLAN_PRICES } from '../data/mock'
import type { License, LicenseStatus, Plan } from '../types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  )
}

const EMPTY_BRANCH_FORM = {
  branchName: '',
  branchAddress: '',
  plan: 'basico' as Plan,
  status: 'active' as LicenseStatus,
  startedAt: new Date().toISOString().split('T')[0],
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  ownerUsername: '',
  ownerPassword: '',
}

const EMPTY_CRED_FORM = { ownerUsername: '', ownerPassword: '' }

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients, getClientLicenses, addLicense, updateLicenseStatus, updateLicenseCredentials, deleteLicense } = useApp()

  const client = clients.find(c => c.id === id)
  const licenses = getClientLicenses(id ?? '')

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_BRANCH_FORM })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [credFor, setCredFor] = useState<{ id: string; branchName: string } | null>(null)
  const [credForm, setCredForm] = useState({ ...EMPTY_CRED_FORM })

  const mrr = useMemo(
    () => licenses.filter(l => l.status === 'active').reduce((s, l) => s + l.monthlyAmount, 0),
    [licenses],
  )

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Cliente no encontrado.</p>
        <button onClick={() => navigate('/clients')} className="text-blue-600 text-sm mt-2 hover:underline">
          Volver a clientes
        </button>
      </div>
    )
  }

  function f(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      setForm(prev => ({
        ...prev,
        [field]: value,
        ...(field === 'plan' ? { monthlyAmount: PLAN_PRICES[value as Plan] } : {}),
      }))
    }
  }

  function handleCreateBranch() {
    if (!form.branchName) return
    addLicense({
      clientId: id!,
      branchName: form.branchName,
      branchAddress: form.branchAddress,
      plan: form.plan,
      status: form.status,
      monthlyAmount: form.status === 'trial' ? 0 : PLAN_PRICES[form.plan],
      startedAt: form.startedAt,
      expiresAt: form.expiresAt,
      ownerUsername: form.ownerUsername || undefined,
      ownerPassword: form.ownerPassword || undefined,
    })
    setShowCreate(false)
    setForm({ ...EMPTY_BRANCH_FORM })
  }

  async function handleSaveCredentials() {
    if (!credFor || !credForm.ownerPassword) return
    await updateLicenseCredentials(credFor.id, credForm.ownerUsername, credForm.ownerPassword)
    setCredFor(null)
    setCredForm({ ...EMPTY_CRED_FORM })
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

  function toggleStatus(l: License) {
    if (l.status === 'active') updateLicenseStatus(l.id, 'suspended')
    else if (l.status === 'suspended') updateLicenseStatus(l.id, 'active')
  }

  const canToggle = (l: License) => l.status === 'active' || l.status === 'suspended'

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={15} />
        Clientes
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{client.businessName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{client.ownerName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">{formatCurrency(mrr)}</p>
          <p className="text-xs text-slate-400">MRR mensual</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <Mail size={16} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">Correo</p>
            <p className="text-sm text-slate-700 truncate">{client.email}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <Phone size={16} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">Teléfono</p>
            <p className="text-sm text-slate-700">{client.phone || '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <MapPin size={16} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">Ubicación</p>
            <p className="text-sm text-slate-700">{client.city}, {client.state}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <CalendarDays size={16} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">Cliente desde</p>
            <p className="text-sm text-slate-700">{formatDate(client.createdAt)}</p>
          </div>
        </div>
      </div>

      {client.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-xs font-medium text-amber-700 mb-0.5">Nota interna</p>
          <p className="text-sm text-amber-800">{client.notes}</p>
        </div>
      )}

      {/* Licenses / Branches */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sucursales / Licencias</h2>
            <p className="text-xs text-slate-400 mt-0.5">{licenses.length} registrada{licenses.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} />
            Nueva sucursal
          </button>
        </div>

        {licenses.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <p>Este cliente no tiene licencias aún.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-blue-600 hover:underline mt-1"
            >
              Crear la primera
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Sucursal', 'Clave de licencia', 'Plan', 'Estado', 'Vence', 'Mensual', 'Owner', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {licenses.map(l => {
                const soon = l.status === 'active' && isExpiringSoon(l.expiresAt)
                return (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{l.branchName}</p>
                      {l.branchAddress && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{l.branchAddress}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-slate-500">{l.licenseKey}</span>
                      <CopyButton text={l.licenseKey} />
                    </td>
                    <td className="px-6 py-4"><PlanBadge plan={l.plan} /></td>
                    <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 tabular-nums">{formatDate(l.expiresAt)}</p>
                      {soon && (
                        <p className="text-xs text-amber-600 font-medium mt-0.5">Vence en {daysUntil(l.expiresAt)} días</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 tabular-nums">
                      {l.monthlyAmount > 0 ? formatCurrency(l.monthlyAmount) : <span className="text-slate-400 font-normal">Prueba</span>}
                    </td>
                    <td className="px-6 py-4">
                      {l.ownerUsername ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <User size={12} className="text-slate-400" />
                          <span className="font-mono">{l.ownerUsername}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setCredFor({ id: l.id, branchName: l.branchName }); setCredForm({ ownerUsername: l.ownerUsername ?? '', ownerPassword: '' }) }}
                          title="Credenciales del owner"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        {l.status !== 'suspended' && l.status !== 'expired' && (
                          <button
                            onClick={() => handleGenerateFile(l.id, l.branchName)}
                            title="Descargar licencia (.copo)"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Download size={15} />
                          </button>
                        )}
                        {canToggle(l) && (
                          <button
                            onClick={() => toggleStatus(l)}
                            title={l.status === 'active' ? 'Suspender' : 'Activar'}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            {l.status === 'active' ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(l.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create branch modal */}
      {showCreate && (
        <Modal
          title="Nueva sucursal"
          onClose={() => { setShowCreate(false); setForm({ ...EMPTY_BRANCH_FORM }) }}
          onConfirm={handleCreateBranch}
          confirmLabel="Crear sucursal"
          confirmDisabled={!form.branchName}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">
                Cliente: <span className="font-semibold text-slate-800">{client.businessName}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Cada sucursal genera una clave de licencia independiente.</p>
            </div>

            <FormField label="Nombre de la sucursal" required>
              <input value={form.branchName} onChange={f('branchName')} placeholder="Ej. Sucursal Centro" className={inputClass} />
            </FormField>

            <FormField label="Dirección">
              <input value={form.branchAddress} onChange={f('branchAddress')} placeholder="Calle, colonia, ciudad" className={inputClass} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Plan">
                <select value={form.plan} onChange={f('plan')} className={inputClass}>
                  <option value="basico">Básico — $499/mes</option>
                  <option value="pro">Pro — $899/mes</option>
                  <option value="enterprise">Enterprise — $1,799/mes</option>
                </select>
              </FormField>
              <FormField label="Estado inicial">
                <select value={form.status} onChange={f('status')} className={inputClass}>
                  <option value="active">Activa</option>
                  <option value="trial">Prueba</option>
                  <option value="suspended">Suspendida</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Fecha de inicio">
                <input type="date" value={form.startedAt} onChange={f('startedAt')} className={inputClass} />
              </FormField>
              <FormField label="Fecha de vencimiento">
                <input type="date" value={form.expiresAt} onChange={f('expiresAt')} className={inputClass} />
              </FormField>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Credenciales del owner (opcional)</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Usuario">
                  <input value={form.ownerUsername} onChange={e => setForm(p => ({ ...p, ownerUsername: e.target.value }))} placeholder="usuario123" className={inputClass} />
                </FormField>
                <FormField label="Contraseña">
                  <input type="password" value={form.ownerPassword} onChange={e => setForm(p => ({ ...p, ownerPassword: e.target.value }))} placeholder="••••••••" className={inputClass} />
                </FormField>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">Monto mensual</span>
              <span className="text-lg font-semibold text-blue-800 tabular-nums">
                {form.status === 'trial' ? 'Gratis (prueba)' : formatCurrency(PLAN_PRICES[form.plan])}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Credentials modal */}
      {credFor && (
        <Modal
          title={`Credenciales — ${credFor.branchName}`}
          onClose={() => { setCredFor(null); setCredForm({ ...EMPTY_CRED_FORM }) }}
          onConfirm={handleSaveCredentials}
          confirmLabel="Guardar"
          confirmDisabled={!credForm.ownerPassword}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Ingresa el usuario y la nueva contraseña del owner para esta licencia.</p>
            </div>
            <FormField label="Usuario del owner">
              <input
                value={credForm.ownerUsername}
                onChange={e => setCredForm(p => ({ ...p, ownerUsername: e.target.value }))}
                placeholder="usuario123"
                className={inputClass}
              />
            </FormField>
            <FormField label="Nueva contraseña" required>
              <input
                type="password"
                value={credForm.ownerPassword}
                onChange={e => setCredForm(p => ({ ...p, ownerPassword: e.target.value }))}
                placeholder="••••••••"
                className={inputClass}
                autoFocus
              />
            </FormField>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal
          title="Eliminar licencia"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => { deleteLicense(confirmDelete); setConfirmDelete(null) }}
          confirmLabel="Sí, eliminar"
        >
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar esta licencia? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  )
}
