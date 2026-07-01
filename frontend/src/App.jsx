import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import { MessageSquare, Shield, LogOut } from 'lucide-react'

const ADMIN_TOKEN_KEY = 'admin_token'

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export default function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [adminToken, setAdminToken] = useState(getAdminToken())

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar — adapts based on whether we're on admin or not */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-800">Agente IA</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isAdminRoute
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={15} />
              Chat
            </Link>
            {isAdminRoute ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Salir
              </button>
            ) : (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Shield size={14} />
                Admin
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route
            path="/admin/*"
            element={
              <AdminPage
                adminToken={adminToken}
                setAdminToken={setAdminToken}
                onLogout={handleLogout}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}