import { useState, useEffect } from 'react'
import axios from 'axios'
import { Save, RotateCcw, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react'

const DEFAULT_INSTRUCTIONS = `Eres un agente de atención al cliente profesional y servicial. Respondes ÚNICAMENTE basándote en la información de los documentos y páginas web proporcionados.

REGLAS IMPORTANTES:
- Responde siempre en el idioma en que te habla el usuario (castellano o inglés)
- NUNCA inventes información que no esté en los documentos
- Si no encuentras la información, dilo claramente: "No tengo información sobre ese tema en mi base de conocimiento"
- Sé conciso, claro y amable
- Si el usuario tiene dudas complejas, ofrécele dejar sus datos de contacto para que el equipo le llame
- Trata al usuario de forma respetuosa y profesional

CUANDO NO SEPAS LA RESPUESTA:
Di algo como: "No tengo esa información en mi base de conocimiento. ¿Quieres dejar tus datos de contacto para que nuestro equipo te ayude directamente?"`

export default function InstructionsPanel() {
  const [instructions, setInstructions] = useState('')
  const [original, setOriginal] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    axios.get('/api/instructions').then(res => {
      setInstructions(res.data.instructions)
      setOriginal(res.data.instructions)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await axios.put('/api/instructions', { instructions })
      setOriginal(instructions)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (confirm('¿Restablecer las instrucciones por defecto?')) {
      setInstructions(DEFAULT_INSTRUCTIONS)
    }
  }

  const hasChanges = instructions !== original

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Lightbulb size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Instrucciones del sistema</p>
          <p>Estas instrucciones definen el comportamiento del agente. Se envían junto con cada conversación. El agente responderá de acuerdo a estas directrices.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Instrucciones del agente</h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={13} /> Guardado
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle size={13} /> {error}
              </span>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded"
            >
              <RotateCcw size={13} />
              Restablecer
            </button>
          </div>
        </div>

        <div className="p-5">
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={20}
            className="w-full font-mono text-sm border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 leading-relaxed bg-gray-50"
            placeholder="Escribe aquí las instrucciones para el agente…"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">{instructions.length} caracteres</p>
            <button
              onClick={save}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={14} />
              {saving ? 'Guardando…' : 'Guardar instrucciones'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Sugerencias de configuración</h3>
        <div className="space-y-2">
          {[
            { label: 'Nombre de empresa', hint: 'Añade "La empresa se llama [NOMBRE]" al inicio de las instrucciones' },
            { label: 'Idioma forzado', hint: 'Añade "Responde SIEMPRE en español" o "Always respond in English"' },
            { label: 'Tono', hint: 'Añade "Usa un tono formal/informal/cercano"' },
            { label: 'Límite de temas', hint: 'Añade "Solo responde preguntas relacionadas con [TEMA]"' },
          ].map((tip, i) => (
            <div key={i} className="flex gap-3 p-2.5 bg-gray-50 rounded-lg">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">{tip.label}</p>
                <p className="text-xs text-gray-500">{tip.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
