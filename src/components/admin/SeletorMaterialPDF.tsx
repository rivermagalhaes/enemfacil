// src/components/admin/SeletorMaterialPDF.tsx
// Seletor de PDF salvo no banco — usado na página de lote
//
// Uso:
//   <SeletorMaterialPDF
//     onSelecionar={(material) => setPdfSelecionado(material)}
//     materialSelecionado={pdfSelecionado}
//   />

import { useState } from 'react'
import { useMateriais } from '@/hooks/useMateriais'
import type { Material } from '@/hooks/useMateriais'
import ModalUploadMaterial from '@/components/admin/ModalUploadMaterial'

interface Props {
  onSelecionar: (material: Material | null) => void
  materialSelecionado: Material | null
  filtroMateria?: string
}

export default function SeletorMaterialPDF({ onSelecionar, materialSelecionado, filtroMateria }: Props) {
  const { materiais, loading, reload, deletar } = useMateriais(filtroMateria)
  const [showModal, setShowModal] = useState(false)
  const [showLista, setShowLista] = useState(false)

  return (
    <>
      <ModalUploadMaterial
        open={showModal}
        onClose={() => setShowModal(false)}
        onSalvo={(m) => { reload(); onSelecionar(m); setShowLista(false) }}
      />

      <div className="space-y-3">
        {/* Material selecionado */}
        {materialSelecionado ? (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-800 text-sm truncate">{materialSelecionado.titulo}</p>
              <p className="text-xs text-blue-500">{materialSelecionado.materia} {materialSelecionado.topic ? `· ${materialSelecionado.topic}` : ''}</p>
            </div>
            <button onClick={() => onSelecionar(null)}
              className="text-blue-400 hover:text-blue-600 text-sm px-2 py-1 rounded hover:bg-blue-100">
              Trocar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Selecionar salvo */}
            <button onClick={() => setShowLista(v => !v)}
              className="flex-1 flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-gray-600">
              <span>📚</span>
              {loading ? 'Carregando...' : `Usar PDF salvo (${materiais.length})`}
            </button>
            {/* Upload novo */}
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium transition-all">
              <span>+</span> Salvar novo PDF
            </button>
          </div>
        )}

        {/* Lista de PDFs salvos */}
        {showLista && !materialSelecionado && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {materiais.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Nenhum PDF salvo ainda.<br />
                <button onClick={() => { setShowModal(true); setShowLista(false) }}
                  className="mt-2 text-purple-600 underline text-xs">
                  Salvar o primeiro PDF
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {materiais.map(m => (
                  <div key={m.id}
                    onClick={() => { onSelecionar(m); setShowLista(false) }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <span className="text-xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{m.titulo}</p>
                      <p className="text-xs text-gray-400">
                        {m.materia} {m.topic ? `· ${m.topic}` : ''} · {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={m.url} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-blue-500 hover:underline px-2 py-1 rounded hover:bg-blue-50">
                        Ver
                      </a>
                      <button
                        onClick={async e => { e.stopPropagation(); if (confirm('Remover este material?')) await deletar(m.id, m.url) }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
