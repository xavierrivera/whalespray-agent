import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Send, User, Bot, Phone, X, CheckCircle, FileText, Globe, ExternalLink } from 'lucide-react'

const SESSION_KEY = 'chat_session_id'

function getSession() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = uuidv4()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-600' : 'bg-gray-700'
      }`}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-white" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
      }`}>
        <div className="prose-chat text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{children}</a>,
              p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
              li: ({children}) => <li className="mb-0.5">{children}</li>,
            }}
          >{msg.content}</ReactMarkdown>
        </div>
        {msg.product_cards && msg.product_cards.length > 0 && (
          <ProductCards cards={msg.product_cards} />
        )}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
            {msg.sources.slice(0, 3).map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                {s.type === 'pdf' ? <FileText size={10} /> : <Globe size={10} />}
                {s.source.length > 30 ? s.source.slice(0, 30) + '…' : s.source}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCards({ cards }) {
  if (!cards || cards.length === 0) return null
  return (
    <div className="mt-3 grid grid-cols-1 gap-2">
      {cards.map((card, i) => (
        <a
          key={i}
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 bg-blue-50 border border-blue-100 hover:border-blue-300 hover:bg-blue-100 rounded-xl px-3 py-2.5 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-800 truncate leading-tight">{card.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{card.snippet}</p>
          </div>
          <ExternalLink size={13} className="text-blue-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5 transition-colors" />
        </a>
      ))}
    </div>
  )
}

function ContactModal({ sessionId, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/contact', { session_id: sessionId, ...form })
      setSent(true)
    } catch (err) {
      alert('Error al enviar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Déjanos tus datos</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800 mb-1">¡Datos recibidos!</p>
            <p className="text-gray-500 text-sm">Nuestro equipo se pondrá en contacto contigo pronto.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <p className="text-gray-500 text-sm">Rellena los campos y te contactaremos a la mayor brevedad.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nombre"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+34 600 000 000"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje (opcional)</label>
              <textarea
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="¿En qué te podemos ayudar?"
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={loading || (!form.email && !form.phone)}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Enviando…' : 'Enviar datos de contacto'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy el asistente virtual. Estoy aquí para ayudarte. ¿En qué puedo ayudarte hoy?\n\nHello! I\'m the virtual assistant. I\'m here to help. How can I assist you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const sessionId = getSession()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await axios.post('/api/chat', { session_id: sessionId, message: text })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        sources: res.data.sources,
        product_cards: res.data.product_cards || []
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo. / Sorry, an error occurred. Please try again.'
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const quickActions = [
    '¿Cómo puedo contactaros?',
    '¿Cuáles son vuestros servicios?',
    'I need help',
  ]

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-56px)] flex flex-col p-4">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <Bot size={15} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="flex gap-2 flex-wrap pb-3">
          {quickActions.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Contact button */}
      <div className="pb-2 flex justify-end">
        <button
          onClick={() => setShowContact(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
        >
          <Phone size={12} />
          Dejar datos de contacto
        </button>
      </div>

      {/* Input area */}
      <div className="flex gap-2 items-end bg-white border border-gray-200 rounded-2xl shadow-sm px-3 py-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje… / Type your message…"
          className="flex-1 resize-none text-sm focus:outline-none bg-transparent py-1"
          style={{ minHeight: '24px', maxHeight: '128px', overflowY: 'auto' }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">
        Las respuestas se basan únicamente en información verificada
      </p>

      {showContact && (
        <ContactModal sessionId={sessionId} onClose={() => setShowContact(false)} />
      )}
    </div>
  )
}
