import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ModalProps {
  title: string
  children: React.ReactNode
  onClose: () => void
  onConfirm?: () => void | Promise<void>
  confirmLabel?: string
  confirmDisabled?: boolean
  size?: 'md' | 'lg'
  error?: string | null
}

export function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  confirmDisabled = false,
  size = 'md',
  error,
}: ModalProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, loading])

  async function handleConfirm() {
    if (!onConfirm || loading) return
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {onConfirm && (
          <div className="flex-shrink-0">
            {error && (
              <div className="px-6 py-2 bg-red-50 border-t border-red-100">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmDisabled || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-w-[100px]"
              >
                {loading ? 'Guardando…' : confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}

export function FormField({ label, required, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 bg-white'
