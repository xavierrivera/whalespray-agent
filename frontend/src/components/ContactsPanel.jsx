import { useState, useEffect } from 'react'
import axios from 'axios'
import { Phone, Mail, User, CheckCircle, Clock, RefreshCw, MessageSquare } from 'lucide-react'

function timeAgo(isoDate) {
  const d = new Date(isoDate)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ContactsPanel() {
  const [contacts, setContacts] = useState([])
  const [filter, setFilter] = useState('all')

  const load = async () => {
    try {
      const res = await axios.get('/api/contacts')
      setContacts(res.data)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const toggleResolved = async (id) => {
    await axios.put(`/api/contacts/${id}/resolve`)
    load()
  }

  const filtered = contacts.filter(c => {
    if (filter === 'pending') return !c.resolved
    if (filter === 'resolved') return c.resolved
    return true
  })

  const pendingCount = contacts.filter(c => !c.resolved).length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-800">{contacts.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total contactos</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-2xl font-bold text-green-500">{contacts.length - pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Resueltos</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex gap-1">
            {['all', 'pending', 'resolved'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Resueltos'}
              </button>
            ))}
          </div>
          <button onClick={load} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={16} />
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No hay contactos en esta categoría</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(c => (
              <div key={c.id} className={`px-5 py-4 hover:bg-gray-50 transition-colors ${c.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      {c.name && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                          <User size={13} className="text-gray-400" />
                          {c.name}
                        </span>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                          <Mail size={13} />
                          {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm text-green-600 hover:underline">
                          <Phone size={13} />
                          {c.phone}
                        </a>
                      )}
                    </div>

                    {c.message && (
                      <div className="flex items-start gap-1.5">
                        <MessageSquare size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{c.message}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">{timeAgo(c.timestamp)}</p>
                  </div>

                  <button
                    onClick={() => toggleResolved(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                      c.resolved
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {c.resolved
                      ? <><Clock size={12} /> Reabrir</>
                      : <><CheckCircle size={12} /> Marcar resuelto</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
