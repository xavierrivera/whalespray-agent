import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Database, MessageSquare, Phone, Settings, ChevronRight } from 'lucide-react'
import SourcesPanel from '../components/SourcesPanel'
import ConversationsPanel from '../components/ConversationsPanel'
import ContactsPanel from '../components/ContactsPanel'
import InstructionsPanel from '../components/InstructionsPanel'

const tabs = [
  { path: '/admin', label: 'Fuentes de datos', icon: Database, exact: true },
  { path: '/admin/conversations', label: 'Conversaciones', icon: MessageSquare },
  { path: '/admin/contacts', label: 'Contactos', icon: Phone },
  { path: '/admin/instructions', label: 'Instrucciones', icon: Settings },
]

export default function AdminPage() {
  const location = useLocation()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona fuentes de datos, conversaciones y configuración del agente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => {
          const active = tab.exact
            ? location.pathname === tab.path
            : location.pathname.startsWith(tab.path) && location.pathname !== '/admin'
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
