// src/components/admin/ModalUploadMaterial.tsx
// Modal para fazer upload de PDF e salvar no banco
//
// Uso:
//   <ModalUploadMaterial
//     open={showModal}
//     onClose={() => setShowModal(false)}
//     onSalvo={(material) => console.log(material)}
//   />

import { useState, useRef } from 'react'
import { uploadMaterial } from '@/hooks/useMateriais'
import type { Material } from '@/hooks/useMateriais'

const TRILHAS = [
  'Química Geral',
  'Química Orgânica',
  'Físico-Química',
  'Inorgânica',
  'Química Analítica',
  'Bioquímica',
  'Física','Biologia','Cinética Química','História','Geografia',
  'Filosofia','Sociologia','Língua Portuguesa','Literatura',
  'Inglês','Artes','Matemática','Surgimento do ser humano',
  'Mesopotâmia e Egito','Grécia Antiga','Roma Antiga',
]

interface Props {
  open: boolean
  onClose: () => void
  onSalvo?: (material: Material) => void
}

export default function ModalUploadMaterial({ open, onClose, onSalvo }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [materia, setMateria] = useState('')
  const [topic, setTopic] = useState('')
  const [vestibular, setVestibular] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  async function handleSalvar() {
    if (!file || !titulo || !materia) {
      setError('Preencha título e matéria, e selecione um arquivo.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const material = await uploadMaterial(file, titulo, materia, topic || undefined, vestibular || undefined)
      onSalvo?.(material)
      onClose()
      // Reset
      setFile(null); setTitulo(''); setMateria(''); setTopic(''); setVestibular('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Salvar material no banco</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Upload */}
          <div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setFile(f); if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, '')) }
              }} />
            <div onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
              {file ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-blue-700 text-sm truncate">{file.name}</p>
                    <p className="text-xs text-blue-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
              ) : (
                <>
                  <p className="text-2xl mb-1">📚</p>
                  <p className="text-sm text-gray-600 font-medium">Clique para selecionar</p>
                  <p className="text-xs text-gray-400">PDF ou imagem</p>
                </>
              )}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Livro de Física — Halliday Vol. 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
          </div>

          {/* Matéria */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Matéria / Trilha *</label>
            <select value={materia} onChange={e => setMateria(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400">
              <option value="">Selecione...</option>
              {TRILHAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Tópico (opcional) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tópico específico <span className="text-gray-400">(opcional)</span></label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Ex: Cinemática"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
          </div>

          {/* Vestibular (opcional) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vestibular <span className="text-gray-400">(opcional)</span></label>
            <input value={vestibular} onChange={e => setVestibular(e.target.value)}
              placeholder="Ex: ENEM, FUVEST, UNICAMP..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={loading || !file || !titulo || !materia}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Salvando...</>
            ) : '💾 Salvar no banco'}
          </button>
        </div>
      </div>
    </div>
  )
}
