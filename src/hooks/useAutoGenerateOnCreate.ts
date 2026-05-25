// src/hooks/useAutoGenerateOnCreate.ts
// Componente 3 — Geração automática ao criar tópico
//
// Uso: chame triggerAutoGenerate() logo após salvar um novo tópico no banco.
//
// Exemplo no seu formulário de criação de tópico:
//
//   const { triggerAutoGenerate, autoStatus } = useAutoGenerateOnCreate()
//
//   async function handleSave() {
//     const { data } = await supabase.from('topicos').insert({ nome, ... }).select().single()
//     await triggerAutoGenerate({
//       id: data.id,
//       nome: data.nome,
//       materia: areaSelecionada,
//       trilha: trilhaSelecionada,
//       trilha_id: trilhaId,
//       content_gerado_em: null,
//     })
//   }

import { useState, useCallback } from 'react'
import { useSingleGeneration } from '@/hooks/useContentGeneration'
import type { TopicItem } from '@/hooks/useContentGeneration'

export function useAutoGenerateOnCreate() {
  const { generate, status, error } = useSingleGeneration()
  const [autoTopico, setAutoTopico] = useState<TopicItem | null>(null)

  const triggerAutoGenerate = useCallback(async (topico: TopicItem) => {
    setAutoTopico(topico)
    try {
      await generate(topico)
    } catch {
      // erro já capturado no hook base
    }
  }, [generate])

  return {
    triggerAutoGenerate,
    autoStatus: status,
    autoTopico,
    autoError: error,
  }
}


// ─────────────────────────────────────────────────────────────
// Toast de progresso — mostra feedback ao usuário após criar tópico
// Coloque este componente no layout raiz (ex: App.tsx) ou na página de criação
// ─────────────────────────────────────────────────────────────

// src/components/admin/AutoGenerateToast.tsx
import type { GenerationStatus } from '@/hooks/useContentGeneration'

interface ToastProps {
  status: GenerationStatus
  topicoNome?: string
  error?: string | null
  onDismiss?: () => void
}

export function AutoGenerateToast({ status, topicoNome, error, onDismiss }: ToastProps) {
  if (status === 'idle') return null

  const configs = {
    loading: {
      bg: 'bg-blue-50 border-blue-200',
      icon: (
        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ),
      title: 'Gerando conteúdo...',
      message: `A IA está criando flashcards, exercícios e questões para "${topicoNome}". Isso leva ~30 segundos.`,
    },
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: (
        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
        </svg>
      ),
      title: 'Conteúdo gerado com sucesso!',
      message: `Flashcards, exercícios e questões ENEM para "${topicoNome}" estão prontos.`,
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: (
        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      title: 'Erro ao gerar conteúdo',
      message: error ?? 'Tente gerar manualmente na página do tópico.',
    },
  }

  const config = configs[status as keyof typeof configs]
  if (!config) return null

  return (
    <div className={`
      fixed bottom-6 right-6 z-50 max-w-sm w-full
      border rounded-xl p-4 shadow-lg
      flex items-start gap-3
      animate-in slide-in-from-bottom-4 duration-300
      ${config.bg}
    `}>
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{config.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{config.message}</p>
      </div>
      {(status === 'success' || status === 'error') && onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}
