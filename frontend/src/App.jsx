import { Routes, Route, Link, useLocation } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import { MessageSquare, Settings, Database, Phone, SlidersHorizontal } from 'lucide-react'

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const isInstructions = location.pathname === '/admin/instructions'

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-800">Agente IA</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isAdmin ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={15} />
              Chat
            </Link>
            <Link
              to="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isAdmin && !isInstructions ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Database size={15} />
              Admin
            </Link>
            <Link
              to="/admin/instructions"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isInstructions ? 'bg-violet-50 text-violet-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal size={15} />
              Configuración
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}
