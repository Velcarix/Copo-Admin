import { useState } from 'react'
import { Lock } from 'lucide-react'
import { adminApi, UnauthorizedError } from '../lib/api'

interface LoginProps {
  onSuccess: () => void
}

interface LoginResponse {
  data: {
    accessToken: string
    user: { id: string; username: string; name: string; role: string }
  }
}

export function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.post<LoginResponse>('/api/admin/auth/login', {
        username: username.trim(),
        password,
      })
      sessionStorage.setItem('adminToken', res.data.accessToken)
      sessionStorage.setItem('adminUser', JSON.stringify(res.data.user))
      onSuccess()
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setError('Usuario o contraseña incorrectos.')
      } else {
        setError('No se pudo conectar al servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Lock size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Admin Copo</h1>
          <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Usuario"
            autoComplete="username"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!username.trim() || !password || loading}
            className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
