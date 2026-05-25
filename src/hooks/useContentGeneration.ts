// src/hooks/useContentGeneration.ts
// Hook central — usado pelos 3 componentes

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GenerationResult {
  topico_id: string
  tokens_usados: number
  duracao_ms: number
  ok: boolean
}

export interface TopicItem {
  id: string
  nome: string
  materia: string
  trilha: string
  trilha_id: string
  content_gerado_em: string | null
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-topic-content`

// ── Função base de geração ────────────────────────────────────
async function callGenerate(
  topico: TopicItem,
  token: string
): Promise<GenerationResult> {
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      materia: topico.materia,
      trilha: topico.trilha,
      topico: topico.nome,
      topico_id: topico.id,
      trilha_id: topico.trilha_id,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao gerar conteúdo')
  }

  return res.json()
}

// ── Hook: gerar um único tópico ───────────────────────────────
export function useSingleGeneration() {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (topico: TopicItem) => {
    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) throw new Error('Não autenticado')

      const res = await callGenerate(topico, token)
      setResult(res)
      setStatus('success')
      return res
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { generate, status, result, error, reset }
}

// ── Hook: geração em lote ─────────────────────────────────────
export interface BatchItem {
  topico: TopicItem
  status: GenerationStatus
  error?: string
  tokens?: number
}

export function useBatchGeneration() {
  const [items, setItems] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)

  const updateItem = (id: string, patch: Partial<BatchItem>) =>
    setItems(prev => prev.map(i => i.topico.id === id ? { ...i, ...patch } : i))

  const startBatch = useCallback(async (topicos: TopicItem[]) => {
    setRunning(true)
    setDone(0)
    setItems(topicos.map(t => ({ topico: t, status: 'idle' })))

    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) { setRunning(false); return }

    // Processa 3 em paralelo para não sobrecarregar
    const CONCURRENCY = 3
    const queue = [...topicos]

    const worker = async () => {
      while (queue.length > 0) {
        const topico = queue.shift()!
        updateItem(topico.id, { status: 'loading' })
        try {
          const res = await callGenerate(topico, token)
          updateItem(topico.id, { status: 'success', tokens: res.tokens_usados })
        } catch (err: any) {
          updateItem(topico.id, { status: 'error', error: err.message })
        }
        setDone(d => d + 1)
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setRunning(false)
  }, [])

  const total = items.length
  const success = items.filter(i => i.status === 'success').length
  const errors = items.filter(i => i.status === 'error').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return { startBatch, items, running, done, total, success, errors, progress }
}
