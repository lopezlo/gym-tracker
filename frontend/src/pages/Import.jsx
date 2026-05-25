import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'

const FIELDS = [
  { key: 'date', label: 'Fecha', required: false, hint: 'ej. 2024-01-15 o 15/01/2024' },
  { key: 'exercise', label: 'Ejercicio', required: true, hint: 'nombre del ejercicio' },
  { key: 'weight', label: 'Peso (kg)', required: false, hint: 'número, puede estar vacío' },
  { key: 'reps', label: 'Repeticiones', required: false, hint: 'número entero' },
  { key: 'duration', label: 'Duración (seg)', required: false, hint: 'segundos, para ejercicios de tiempo' },
]

export default function Import() {
  const { user } = useApp()
  const fileRef = useRef(null)
  const [step, setStep] = useState('upload') // upload | map | confirm | done
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    setError('')
    setLoading(true)
    try {
      const data = await api.previewCSV(f)
      setPreview(data)
      // Auto-map columns by name similarity
      const autoMap = {}
      data.headers.forEach(h => {
        const hl = h.toLowerCase()
        if (hl.includes('fecha') || hl.includes('date') || hl.includes('dia') || hl === 'día') autoMap.date = h
        else if (hl.includes('ejercicio') || hl.includes('exercise') || hl.includes('nombre') || hl === 'name') autoMap.exercise = h
        else if (hl.includes('peso') || hl.includes('weight') || hl === 'kg') autoMap.weight = h
        else if (hl.includes('rep') || hl.includes('reps') || hl.includes('repeticion')) autoMap.reps = h
        else if (hl.includes('dur') || hl.includes('tiempo') || hl.includes('seg') || hl.includes('time')) autoMap.duration = h
      })
      setMapping(autoMap)
      setStep('map')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
  }

  const handleImport = async () => {
    if (!mapping.exercise) { setError('Debes mapear la columna de ejercicio'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.executeImport(file, user.id, mapping)
      setResult(res)
      setStep('done')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const reset = () => {
    setStep('upload'); setFile(null); setPreview(null)
    setMapping({}); setResult(null); setError('')
  }

  return (
    <div className="h-full scrollable no-scrollbar px-4 pt-6 pb-4 space-y-6">
      <div className="flex items-center gap-2">
        <Upload size={20} className="text-indigo-400" />
        <h1 className="text-white font-bold text-xl">Importar CSV</h1>
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm leading-relaxed">
            Sube un fichero CSV con tus sesiones anteriores. No hace falta que tenga todos los campos,
            luego podrás mapear las columnas.
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
          >
            <Upload size={32} className="text-slate-500 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
            <p className="text-slate-300 font-semibold">Arrastra tu CSV aquí</p>
            <p className="text-slate-500 text-sm mt-1">o toca para seleccionar</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          {loading && <div className="flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}
          {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
        </div>
      )}

      {step === 'map' && preview && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-indigo-400" />
              <p className="text-white font-semibold text-sm">{file.name}</p>
            </div>
            <p className="text-slate-400 text-xs">{preview.total} filas · {preview.headers.length} columnas</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm">Mapear columnas</h2>
            <p className="text-slate-400 text-xs">Indica qué columna de tu CSV corresponde a cada campo.</p>
            {FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium">
                    {f.label}
                    {f.required && <span className="text-red-400 ml-1">*</span>}
                  </p>
                  <p className="text-slate-500 text-xs">{f.hint}</p>
                </div>
                <div className="relative">
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value || undefined }))}
                    className="appearance-none bg-slate-700 text-white text-sm rounded-xl pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[130px]"
                  >
                    <option value="">— ignorar —</option>
                    {preview.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Sample preview */}
          {preview.sample.length > 0 && (
            <div className="bg-slate-800 rounded-2xl p-4">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Muestra de datos</h3>
              <div className="overflow-x-auto">
                <table className="text-xs text-slate-300 w-full">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700">
                      {preview.headers.map(h => <th key={h} className="text-left pb-2 pr-4 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.slice(0, 4).map((row, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        {preview.headers.map(h => <td key={h} className="py-1.5 pr-4">{row[h] ?? '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={reset} className="py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !mapping.exercise}
              className="py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4 text-center">
          <CheckCircle size={56} className="text-emerald-400 mx-auto" />
          <div>
            <h2 className="text-white font-bold text-xl">¡Importación completada!</h2>
            <p className="text-slate-400 text-sm mt-1">Tus datos históricos ya están disponibles.</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-5 space-y-3 text-left">
            {[
              { label: 'Sesiones creadas', value: result.sessions_created },
              { label: 'Series importadas', value: result.imported },
              { label: 'Filas ignoradas', value: result.skipped },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-white font-bold">{value}</span>
              </div>
            ))}
          </div>
          <button onClick={reset} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors">
            Importar otro fichero
          </button>
        </div>
      )}
    </div>
  )
}
