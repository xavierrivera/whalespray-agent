import { useState, useEffect } from 'react'
import axios from 'axios'
import { Save, RotateCcw, CheckCircle, AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp, Brain, Plus, Trash2 } from 'lucide-react'

const DEFAULT_INSTRUCTIONS = `Eres un agente de atención al cliente profesional y servicial. Respondes ÚNICAMENTE basándote en la información de los documentos y páginas web proporcionados.

REGLAS IMPORTANTES:
- Responde siempre en el idioma en que te habla el usuario (castellano o inglés)
- NUNCA inventes información que no esté en los documentos
- Si no encuentras la información, dilo claramente: "No tengo información sobre ese tema en mi base de conocimiento"
- Sé conciso, claro y amable
- Si el usuario tiene dudas complejas, ofrécele dejar sus datos de contacto para que el equipo le llame
- Trata al usuario de forma respetuosa y profesional
- Cuando menciones un producto que tiene URL en la base de conocimiento, INCLUYE SIEMPRE el enlace clickable en formato Markdown: [nombre del producto](URL)

CUANDO NO SEPAS LA RESPUESTA:
Di algo como: "No tengo esa información en mi base de conocimiento. ¿Quieres dejar tus datos de contacto para que nuestro equipo te ayude directamente?"`

const SNIPPETS = [
  {
    group: 'Identidad',
    items: [
      { label: 'Nombre de empresa', text: 'La empresa se llama [NOMBRE DE LA EMPRESA]. ' },
      { label: 'Nombre del agente', text: 'Tu nombre es [NOMBRE DEL AGENTE]. ' },
      { label: 'Sector / industria', text: 'La empresa se dedica a [SECTOR/ACTIVIDAD]. ' },
    ]
  },
  {
    group: 'Idioma y tono',
    items: [
      { label: 'Siempre en español', text: 'Responde SIEMPRE en español, independientemente del idioma del usuario. ' },
      { label: 'Siempre en inglés', text: 'Always respond in English, regardless of the language used by the user. ' },
      { label: 'Tono formal', text: 'Usa un tono formal y profesional en todo momento. Trata al usuario de usted. ' },
      { label: 'Tono cercano', text: 'Usa un tono cercano y amigable. Trata al usuario de tú. ' },
    ]
  },
  {
    group: 'Comportamiento',
    items: [
      { label: 'Incluir URLs siempre', text: 'Cuando menciones cualquier producto o página, incluye SIEMPRE el enlace en formato [texto](URL). ' },
      { label: 'Ofrecer contacto siempre', text: 'Al final de cada respuesta, recuerda al usuario que puede dejar sus datos de contacto si necesita más ayuda. ' },
      { label: 'Respuestas cortas', text: 'Sé muy conciso. Responde en máximo 3 frases. ' },
      { label: 'Respuestas detalladas', text: 'Sé detallado y exhaustivo en tus respuestas, explicando todos los aspectos relevantes. ' },
      { label: 'Limitar temas', text: 'Solo responde preguntas relacionadas con [TEMA]. Para cualquier otro tema, indica que no puedes ayudar. ' },
    ]
  },
  {
    group: 'Horario y contacto',
    items: [
      { label: 'Horario de atención', text: 'El horario de atención es de lunes a viernes de [HORA INICIO] a [HORA FIN]. ' },
      { label: 'Teléfono de contacto', text: 'El teléfono de contacto es [TELÉFONO]. ' },
      { label: 'Email de contacto', text: 'El email de contacto es [EMAIL]. ' },
    ]
  },
]

export default function InstructionsPanel() {
  const [instructions, setInstructions] = useState('')
  const [original, setOriginal] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [openGroup, setOpenGroup] = useState(null)

  // Memory state
  const [memory, setMemory] = useState('')
  const [originalMemory, setOriginalMemory] = useState('')
  const [newNote, setNewNote] = useState('')
  const [memorySaved, setMemorySaved] = useState(false)

  useEffect(() => {
    axios.get('/api/instructions').then(res => {
      setInstructions(res.data.instructions)
      setOriginal(res.data.instructions)
    })
    axios.get('/api/memory').then(res => {
      setMemory(res.data.memory)
      setOriginalMemory(res.data.memory)
    })
  }, [])

  const save = async () => {
    setSaving(true); setError(null); setSaved(false)
    try {
      await axios.put('/api/instructions', { instructions })
      setOriginal(instructions); setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  const saveMemory = async (newMemory) => {
    await axios.put('/api/memory', { memory: newMemory })
    setMemory(newMemory); setOriginalMemory(newMemory)
    setMemorySaved(true)
    setTimeout(() => setMemorySaved(false), 2000)
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    const updated = memory ? `${memory}\n- ${newNote.trim()}` : `- ${newNote.trim()}`
    await saveMemory(updated)
    setNewNote('')
  }

  const deleteNote = async (line) => {
    const lines = memory.split('\n').filter(l => l !== line)
    await saveMemory(lines.join('\n'))
  }

  const reset = () => {
    if (confirm('¿Restablecer las instrucciones por defecto?')) setInstructions(DEFAULT_INSTRUCTIONS)
  }

  const insertSnippet = (text) => {
    setInstructions(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + text)
  }

  const memoryLines = memory.split('\n').filter(l => l.trim())
  const hasChanges = instructions !== original

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-xl p-5 text-white flex items-start gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Configuración del agente</h2>
          <p className="text-violet-200 text-sm mt-0.5">
            Define cómo debe comportarse el agente. Los cambios se aplican de inmediato a todos los chats.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">

        {/* Editor — 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Instrucciones del sistema</h3>
              <div className="flex items-center gap-3">
                {saved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={13} /> Guardado</span>}
                {error && <span className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={13} /> {error}</span>}
                <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  <RotateCcw size={12} /> Restablecer
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={18}
                className="w-full font-mono text-sm border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none text-gray-800 leading-relaxed bg-gray-50"
                placeholder="Escribe aquí las instrucciones para el agente…"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">{instructions.length} caracteres</p>
                <button
                  onClick={save}
                  disabled={!hasChanges || saving}
                  className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Save size={14} />
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

          {/* Memory panel */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-violet-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Memoria del agente</h3>
                {memorySaved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} /> Guardado</span>}
              </div>
              <span className="text-xs text-gray-400">{memoryLines.length} nota{memoryLines.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">
                Correcciones y reglas aprendidas que se aplican a <strong>todos los chats</strong>.
                Añade aquí errores corregidos para que el agente no los repita.
              </p>

              {/* Existing notes */}
              {memoryLines.length > 0 ? (
                <div className="space-y-1.5">
                  {memoryLines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2 bg-violet-50 rounded-lg px-3 py-2 group">
                      <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                      <span className="text-sm text-gray-700 flex-1">{line.replace(/^-\s*/, '')}</span>
                      <button
                        onClick={() => deleteNote(line)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin notas aún. Añade correcciones que el agente debe recordar.</p>
              )}

              {/* Add new note */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                  placeholder="Ej: Siempre incluir el enlace del producto mencionado"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <button
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="flex items-center gap-1 bg-violet-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Snippets — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Bloques rápidos</h3>
              <p className="text-xs text-gray-400 mt-0.5">Haz clic para añadir al final de las instrucciones</p>
            </div>
            <div className="divide-y divide-gray-100">
              {SNIPPETS.map(group => (
                <div key={group.group}>
                  <button
                    onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {group.group}
                    {openGroup === group.group ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>
                  {openGroup === group.group && (
                    <div className="px-3 pb-2 space-y-1">
                      {group.items.map(item => (
                        <button
                          key={item.label}
                          onClick={() => insertSnippet(item.text)}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors border border-transparent hover:border-violet-200"
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
            <p className="font-semibold">Consejos</p>
            <p>• Las instrucciones definen el comportamiento base</p>
            <p>• La memoria guarda correcciones permanentes entre chats</p>
            <p>• El agente incluirá URLs de productos automáticamente</p>
            <p>• Guarda los cambios para que se apliquen al instante</p>
          </div>
        </div>
      </div>
    </div>
  )
}
