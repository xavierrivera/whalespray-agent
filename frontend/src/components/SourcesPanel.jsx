import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { Upload, Globe, Trash2, RefreshCw, FileText, CheckCircle, XCircle, Clock, Loader, Database } from 'lucide-react'

const statusIcon = {
  pending: <Clock size={14} className="text-yellow-500" />,
  processing: <Loader size={14} className="text-blue-500 animate-spin" />,
  indexed: <CheckCircle size={14} className="text-green-500" />,
  error: <XCircle size={14} className="text-red-500" />,
}

const statusLabel = {
  pending: 'Pendiente',
  processing: 'Procesando…',
  indexed: 'Indexado',
  error: 'Error',
}

export default function SourcesPanel() {
  const [sources, setSources] = useState([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [addingUrl, setAddingUrl] = useState(false)
  const [uploadProgress, setUploadProgress] = useState([])

  const loadSources = async () => {
    try {
      const res = await axios.get('/api/sources')
      setSources(res.data.sources)
      setTotalChunks(res.data.total_chunks)
    } catch {}
  }

  useEffect(() => {
    loadSources()
    const interval = setInterval(loadSources, 3000)
    return () => clearInterval(interval)
  }, [])

  const onDrop = useCallback(async (files) => {
    setUploading(true)
    const progress = files.map(f => ({ name: f.name, status: 'uploading' }))
    setUploadProgress(progress)

    await Promise.all(
      files.map(async (file, i) => {
        const fd = new FormData()
        fd.append('file', file)
        try {
          await axios.post('/api/sources/pdf', fd)
          setUploadProgress(prev => prev.map((p, j) => j === i ? { ...p, status: 'done' } : p))
        } catch (err) {
          setUploadProgress(prev => prev.map((p, j) => j === i ? { ...p, status: 'error' } : p))
        }
      })
    )
    setUploading(false)
    loadSources()
    setTimeout(() => setUploadProgress([]), 3000)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  })

  const addUrl = async () => {
    if (!url.trim()) return
    setAddingUrl(true)
    try {
      await axios.post('/api/sources/url', { url: url.trim() })
      setUrl('')
      loadSources()
    } catch (err) {
      alert('Error al añadir la URL: ' + (err.response?.data?.detail || err.message))
    } finally {
      setAddingUrl(false)
    }
  }

  const deleteSource = async (id) => {
    if (!confirm('¿Eliminar esta fuente y todos sus datos indexados?')) return
    try {
      await axios.delete(`/api/sources/${id}`)
      loadSources()
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm">Base de conocimiento</p>
          <p className="text-2xl font-bold mt-0.5">{totalChunks.toLocaleString()} fragmentos indexados</p>
        </div>
        <Database size={32} className="text-blue-300 opacity-80" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload PDFs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            Subir PDFs
          </h2>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            {isDragActive ? (
              <p className="text-sm text-blue-600 font-medium">Suelta los PDFs aquí</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 font-medium">Arrastra PDFs o haz clic</p>
                <p className="text-xs text-gray-400 mt-1">Puedes subir múltiples archivos a la vez</p>
              </>
            )}
          </div>

          {uploadProgress.length > 0 && (
            <div className="mt-3 space-y-1">
              {uploadProgress.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  {p.status === 'uploading' && <Loader size={12} className="animate-spin text-blue-500" />}
                  {p.status === 'done' && <CheckCircle size={12} className="text-green-500" />}
                  {p.status === 'error' && <XCircle size={12} className="text-red-500" />}
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add URL */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Globe size={16} className="text-blue-600" />
            Añadir página web
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL de la página</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUrl()}
                placeholder="https://ejemplo.com/pagina"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={addUrl}
              disabled={addingUrl || !url.trim()}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {addingUrl ? <Loader size={14} className="animate-spin" /> : <Globe size={14} />}
              {addingUrl ? 'Añadiendo…' : 'Añadir y indexar'}
            </button>
            <p className="text-xs text-gray-400">
              La página se descargará automáticamente y su contenido se indexará.
            </p>
          </div>
        </div>
      </div>

      {/* Sources list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Fuentes indexadas ({sources.length})</h2>
          <button onClick={loadSources} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No hay fuentes aún. Sube PDFs o añade URLs para comenzar.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sources.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {s.source_type === 'pdf'
                    ? <FileText size={16} className="text-red-400 flex-shrink-0" />
                    : <Globe size={16} className="text-blue-400 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {statusIcon[s.status]}
                      <span className="text-xs text-gray-400">{statusLabel[s.status]}</span>
                      {s.chunks_count > 0 && (
                        <span className="text-xs text-gray-400">• {s.chunks_count} fragmentos</span>
                      )}
                      {s.error_message && (
                        <span className="text-xs text-red-500 truncate">{s.error_message.slice(0, 60)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteSource(s.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-3 flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
