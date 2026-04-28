import { useState, useEffect } from 'react'
import axios from 'axios'
import { MessageSquare, Trash2, ChevronRight, User, Bot, RefreshCw } from 'lucide-react'

function timeAgo(isoDate) {
  const d = new Date(isoDate)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('es-ES')
}

export default function ConversationsPanel() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const res = await axios.get('/api/conversations')
      setConversations(res.data)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const selectConversation = async (session_id) => {
    setSelected(session_id)
    setLoading(true)
    try {
      const res = await axios.get(`/api/conversations/${session_id}`)
      setMessages(res.data)
    } catch {}
    setLoading(false)
  }

  const deleteConversation = async (session_id, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta conversación?')) return
    await axios.delete(`/api/conversations/${session_id}`)
    if (selected === session_id) { setSelected(null); setMessages([]) }
    load()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Conversaciones ({conversations.length})</h2>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex h-[600px]">
        {/* List */}
        <div className="w-80 border-r border-gray-100 overflow-y-auto flex-shrink-0">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No hay conversaciones aún</div>
          ) : (
            conversations.map(c => (
              <button
                key={c.session_id}
                onClick={() => selectConversation(c.session_id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors group ${
                  selected === c.session_id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400">{c.message_count} mensajes</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{c.preview || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.last_message ? timeAgo(c.last_message) : ''}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(c.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0 mt-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {!selected && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Selecciona una conversación para verla
            </div>
          )}
          {loading && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Cargando…</div>
          )}
          {!loading && messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
              }`}>
                {m.role === 'user'
                  ? <User size={13} className="text-white" />
                  : <Bot size={13} className="text-white" />
                }
              </div>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(m.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
