import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Database, MessageSquare, Phone, Settings, Lock, LogIn, AlertCircle } from 'lucide-react'
import SourcesPanel from '../components/SourcesPanel'
import ConversationsPanel from '../components/ConversationsPanel'
import ContactsPanel from '../components/ContactsPanel'
import InstructionsPanel from '../components/InstructionsPanel'
import axios from 'axios'

const ADMIN_TOKEN_KEY = 'admin_token'

const tabs = [
  { path: '/admin', label: 'Fuentes de datos', icon: Database, exact: true },
  { path: '/admin/conversations', label: 'Conversaciones', icon: MessageSquare },
  { path: '/admin/contacts', label: 'Contactos', icon: Phone },
  { path: '/admin/instructions', label: 'Instrucciones', icon: Settings },
]

function LoginForm({ setAdminToken }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/admin/login', { password })
      if (res.data.ok) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, res.data.token)
        setAdminToken(res.data.token)
      } else {
        setError(res.data.error || 'Error al iniciar sesión')
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock size={28} className="text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Acceso Administración</h1>
            <p className="text-sm text-gray-500 mt-1">Introduce la contraseña para acceder</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                'Verificando...'
              ) : (
                <>
                  <LogIn size={16} />
                  Acceder
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function AdminContent() {
  const location = useLocation()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona fuentes de datos, conversaciones y configuración del agente</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.exact
            ? location.pathname === '/admin'
            : location.pathname === tab.path

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </Link>
          )
        })}
      </div>

      <Routes>
        <Route index element={<SourcesPanel />} />
        <Route path="conversations" element={<ConversationsPanel />} />
        <Route path="contacts" element={<ContactsPanel />} />
        <Route path="instructions" element={<InstructionsPanel />} />
      </Routes>
    </div>
  )
}

export default function AdminPage({ adminToken, setAdminToken }) {
  if (!adminToken) {
    return <LoginForm setAdminToken={setAdminToken} />
  }
  return <AdminContent />
}