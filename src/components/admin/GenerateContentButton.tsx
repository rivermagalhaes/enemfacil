// src/components/admin/GenerateContentButton.tsx
// Componente 1 — Botão na página do tópico
//
// Uso:
//   import GenerateContentButton from '@/components/admin/GenerateContentButton'
//
//   <GenerateContentButton
//     topico={{
//       id: topico.id,
//       nome: topico.nome,
//       materia: 'Química',
//       trilha: 'Química Geral',
//       trilha_id: trilha.id,
//       content_gerado_em: topico.content_gerado_em,
//     }}
//     onSuccess={() => refetch()}
//   />

import { useState } from 'react'
import { useSingleGeneration } from '@/hooks/useContentGeneration'
import type { TopicItem } from '@/hooks/useContentGeneration'

interface Props {
  topico: TopicItem
  onSuccess?: () => void
  className?: string
}

export default function GenerateContentButton({ topico, onSuccess, className = '' }: Props) {
  const { generate, status, result, error, reset } = useSingleGeneration()
  const [showDetails, setShowDetails] = useState(false)

  const jaGerado = !!topico.content_gerado_em
  const isLoading = status === 'loading'

  async function handleClick() {
    if (isLoading) return
    if (status === 'success' || status === 'error') reset()
    try {
      await generate(topico)
      onSuccess?.()
    } catch {}
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 disabled:cursor-not-allowed
            ${status === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : status === 'error'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : jaGerado
              ? 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
              : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
            }
            ${isLoading ? 'opacity-70' : ''}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Gerando conteúdo...
            </>
          ) : status === 'success' ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Conteúdo gerado!
            </>
          ) : status === 'error' ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Erro — tentar novamente
            </>
          ) : jaGerado ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Regenerar conteúdo
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Gerar conteúdo com IA
            </>
          )}
        </button>

        {/* Badge — já gerado */}
        {jaGerado && status === 'idle' && (
          <span className="text-xs text-gray-400">
            Gerado em {new Date(topico.content_gerado_em!).toLocaleDateString('pt-BR')}
          </span>
        )}

        {/* Detalhes após sucesso */}
        {status === 'success' && result && (
          <button
            onClick={() => setShowDetails(v => !v)}
            className="text-xs text-gray-400 underline"
          >
            {showDetails ? 'ocultar detalhes' : 'ver detalhes'}
          </button>
        )}
      </div>

      {/* Mensagem de erro */}
      {status === 'error' && error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Detalhes de sucesso */}
      {status === 'success' && result && showDetails && (
        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg flex gap-4">
          <span>⚡ {(result.duracao_ms / 1000).toFixed(1)}s</span>
          <span>🔤 {result.tokens_usados?.toLocaleString()} tokens</span>
        </div>
      )}

      {/* Loading — mensagem de espera */}
      {isLoading && (
        <p className="text-xs text-gray-400 animate-pulse">
          Isso pode levar até 40 segundos...
        </p>
      )}
    </div>
  )
}
