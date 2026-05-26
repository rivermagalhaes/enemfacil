// src/pages/admin/GerarConteudoLote.tsx
import { useEffect, useState, useRef } from 'react'
import { useBatchGeneration } from '@/hooks/useContentGeneration'
import SeletorMaterialPDF from '@/components/admin/SeletorMaterialPDF'
import type { Material } from '@/hooks/useMateriais'
import type { TopicItem } from '@/hooks/useContentGeneration'
import { supabase } from '@/lib/supabaseClient'

const STATUS_ICON: Record<string, string> = {
  idle: '○', loading: '⟳', success: '✓', error: '✗',
}
const STATUS_COLOR: Record<string, string> = {
  idle: 'text-gray-400', loading: 'text-blue-500', success: 'text-green-500', error: 'text-red-500',
}

const TRILHAS_CONFIG: Record<string, string[]> = {
  'Física': ['Cinemática','Dinâmica','Leis de Newton','Trabalho e energia','Quantidade de movimento','Gravitação','Hidrostática','Termologia','Calorimetria','Termodinâmica','Óptica geométrica','Ondulatória','Eletrostática','Eletrodinâmica','Magnetismo','Física moderna'],
  'Biologia': ['Citologia','Histologia','Divisão celular','Genética mendeliana','Genética molecular','Evolução','Ecologia','Fisiologia vegetal','Fisiologia animal','Embriologia','Zoologia','Botânica'],
  'Cinética Química': ['Velocidade de reação','Fatores que afetam a velocidade','Catalisadores','Lei da velocidade','Energia de ativação'],
  'Química Geral': ['Introdução à Química','Estrutura Atômica','Tabela Periódica','Ligações Químicas','Funções Inorgânicas','Reações Químicas','Estequiometria','Gases','Soluções'],
  'Química Orgânica': ['Introdução à Orgânica','Hidrocarbonetos','Funções Oxigenadas','Funções Nitrogenadas','Isomeria','Reações Orgânicas','Polímeros','Bioquímica','Orgânica no Cotidiano'],
  'Físico-Química': ['Termoquímica','Cinética Química','Equilíbrio Químico','Equilíbrio Iônico','Eletroquímica','Propriedades Coligativas','Gases'],
  'Inorgânica': ['Óxidos','Ácidos','Bases','Sais','Nomenclatura Inorgânica','Reações Inorgânicas','Oxidação e Redução','Química Ambiental'],
  'Química Analítica': ['Análise Qualitativa','Análise Quantitativa','Titulação e Volumetria','Espectroscopia','Cromatografia','Eletroanalítica'],
  'Bioquímica': ['Carboidratos','Lipídios','Proteínas e Enzimas','Ácidos Nucleicos','Metabolismo Celular','Vitaminas e Cofatores'],
  'História': ['Pré-história','Antiguidade clássica','Idade Média','Renascimento','Reformas religiosas','Expansão marítima','Brasil colonial','Iluminismo','Revoluções burguesas','Brasil imperial','República Velha','Era Vargas','Guerra Fria','Brasil contemporâneo'],
  'Geografia': ['Cartografia','Relevo brasileiro','Hidrografia','Clima','Vegetação','Geopolítica','Urbanização','Industrialização','Agricultura','Globalização','Questões ambientais'],
  'Filosofia': ['Pré-socráticos','Platão e Aristóteles','Filosofia medieval','Filosofia moderna','Iluminismo','Filosofia contemporânea','Ética','Política'],
  'Sociologia': ['Sociologia clássica','Émile Durkheim','Karl Marx','Max Weber','Cultura e sociedade','Movimentos sociais','Globalização e sociedade'],
  'Língua Portuguesa': ['Interpretação de texto','Tipologia textual','Gêneros discursivos','Morfologia','Sintaxe','Semântica','Ortografia','Pontuação','Coesão e coerência','Redação ENEM'],
  'Literatura': ['Trovadorismo','Humanismo','Classicismo','Barroco','Arcadismo','Romantismo','Realismo','Naturalismo','Parnasianismo','Simbolismo','Pré-modernismo','Modernismo','Literatura contemporânea'],
  'Inglês': ['Reading comprehension','Vocabulary in context','Grammar','False cognates','Text types'],
  'Artes': ['História da arte','Arte brasileira','Música','Teatro','Cinema','Artes visuais'],
  'Matemática': ['Conjuntos numéricos','Funções','Função quadrática','Função exponencial','Função logarítmica','Trigonometria','Geometria plana','Geometria espacial','Geometria analítica','Matrizes e determinantes','Sistemas lineares','Progressões','Probabilidade','Estatística','Combinatória'],
  'Surgimento do ser humano': ['Hominização','Paleolítico','Neolítico','Revolução agrícola'],
  'Mesopotâmia e Egito': ['Civilização mesopotâmica','Civilização egípcia','Religião e cultura','Escrita cuneiforme e hieroglífica'],
  'Grécia Antiga': ['Período homérico','Período arcaico','Período clássico','Período helenístico','Democracia ateniense','Cultura grega'],
  'Roma Antiga': ['Monarquia romana','República romana','Império romano','Crise e queda de Roma','Cultura romana'],
}

// ── Converte File para base64 ─────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Chama Edge Function com PDF ───────────────────────────────
async function generateFromPdf(
  topico: TopicItem,
  pdfBase64: string,
  mimeType: string,
  token: string,
  supabaseUrl: string
): Promise<{ questoes: number; conteudo: boolean }> {

  // 1. Extrai conteúdo do PDF
  const conteudoRes = await fetch(`${supabaseUrl}/functions/v1/extrair-conteudo-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      base64Data: pdfBase64,
      mimeType,
      unidadeTitulo: topico.nome,
      materia: topico.trilha,
    }),
  })
  const conteudoData = await conteudoRes.json()
  if (!conteudoRes.ok) throw new Error(conteudoData.error ?? 'Erro ao extrair conteúdo')

  // 2. Extrai questões do PDF
  const questoesRes = await fetch(`${supabaseUrl}/functions/v1/extrair-questoes-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ base64Data: pdfBase64, mimeType }),
  })
  const questoesData = await questoesRes.json()
  if (!questoesRes.ok) throw new Error(questoesData.error ?? 'Erro ao extrair questões')

  // 3. Salva conteúdo extraído em topicos.resumo_gerado
  if (topico.id && !topico.id.startsWith('virtual:') && conteudoData.conteudo) {
    await supabase.from('topicos').update({
      resumo_gerado: {
        introducao: conteudoData.conteudo.titulo,
        explicacao: conteudoData.conteudo.conteudo,
        conceitos_principais: [conteudoData.conteudo.exemplos],
        erros_comuns: [],
        dicas_enem: conteudoData.conteudo.formulas ? [conteudoData.conteudo.formulas] : [],
      },
      content_gerado_em: new Date().toISOString(),
    }).eq('id', topico.id)
  }

  // 4. Salva questões extraídas em questoes_simulado
  const questoes = questoesData.questoes ?? []
  if (questoes.length > 0) {
    // Busca ou cria mini_simulado para a trilha
    let simuladoId: string | null = null
    if (topico.trilha_id) {
      const { data: simExistente } = await supabase
        .from('mini_simulados')
        .select('id')
        .eq('trilha_id', topico.trilha_id)
        .eq('area_enem', topico.materia)
        .maybeSingle()

      if (simExistente) {
        simuladoId = simExistente.id
      } else {
        const { data: novoSim } = await supabase
          .from('mini_simulados')
          .insert({ trilha_id: topico.trilha_id, area_enem: topico.materia, ativo: true })
          .select('id').single()
        simuladoId = novoSim?.id ?? null
      }
    }

    if (simuladoId) {
      // Remove questões antigas deste tópico geradas por PDF
      await supabase.from('questoes_simulado')
        .delete()
        .eq('simulado_id', simuladoId)
        .eq('assunto_tag', `pdf:${topico.id}`)

      const questoesData2 = questoes.map((q: any, i: number) => ({
        simulado_id: simuladoId,
        enunciado: q.question,
        area_enem: q.area ?? topico.materia,
        habilidade: q.topic ?? topico.nome,
        assunto_tag: `pdf:${topico.id}`,
        dificuldade: q.difficulty ?? 'medio',
        ordem: i,
        ativa: true,
      }))

      const { data: inseridas } = await supabase
        .from('questoes_simulado')
        .insert(questoesData2)
        .select('id')

      // Salva alternativas
      if (inseridas?.length) {
        const alternativas: any[] = []
        inseridas.forEach((q: any, i: number) => {
          const original = questoes[i]
          ;(original.options ?? []).forEach((opt: string, idx: number) => {
            alternativas.push({
              questao_id: q.id,
              letra: ['A','B','C','D','E'][idx],
              texto: opt,
              correta: original.answer_index === idx,
            })
          })
        })
        if (alternativas.length) {
          await supabase.from('alternativas_simulado').insert(alternativas)
        }
      }
    }
  }

  return { questoes: questoes.length, conteudo: !!conteudoData.conteudo }
}

export default function GerarConteudoLote() {
  const [topicos, setTopicos] = useState<TopicItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'todos' | 'sem_conteudo'>('sem_conteudo')
  const [loadingTopicos, setLoadingTopicos] = useState(true)
  const [filterTrilha, setFilterTrilha] = useState<string>('Todas')
  const [modo, setModo] = useState<'prompt' | 'pdf'>('prompt')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [materialSelecionado, setMaterialSelecionado] = useState<Material | null>(null)
  const [pdfStatus, setPdfStatus] = useState<Record<string, { status: string; questoes?: number; error?: string }>>({})
  const [pdfRunning, setPdfRunning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { startBatch, items, running, done, total, success, errors, progress } = useBatchGeneration()

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

  useEffect(() => {
    async function load() {
      setLoadingTopicos(true)
      const { data: trilhasData } = await supabase.from('trilhas').select('id, titulo, area_enem').eq('ativa', true)
      const { data: topicosData } = await supabase.from('topicos').select('id, titulo, content_gerado_em')
      const topicoMap = new Map((topicosData ?? []).map((t: any) => [t.titulo, t]))
      const trilhaMap = new Map((trilhasData ?? []).map((t: any) => [t.titulo, t]))
      const mapped: TopicItem[] = []
      Object.entries(TRILHAS_CONFIG).forEach(([trilhaTitulo, topicosLista]) => {
        const trilha = trilhaMap.get(trilhaTitulo)
        topicosLista.forEach(topicoNome => {
          const existente = topicoMap.get(topicoNome)
          mapped.push({
            id: existente?.id ?? `virtual:${trilhaTitulo}:${topicoNome}`,
            nome: topicoNome,
            materia: trilha?.area_enem ?? trilhaTitulo,
            trilha: trilhaTitulo,
            trilha_id: trilha?.id ?? '',
            content_gerado_em: existente?.content_gerado_em ?? null,
          })
        })
      })
      setTopicos(mapped)
      setLoadingTopicos(false)
    }
    load()
  }, [])

  const trilhas = ['Todas', ...Object.keys(TRILHAS_CONFIG)]
  const filtered = topicos
    .filter(t => filterTrilha === 'Todas' || t.trilha === filterTrilha)
    .filter(t => filter === 'todos' || !t.content_gerado_em)

  const semConteudo = topicos.filter(t => (filterTrilha === 'Todas' || t.trilha === filterTrilha) && !t.content_gerado_em).length
  const todosCount = topicos.filter(t => filterTrilha === 'Todas' || t.trilha === filterTrilha).length

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll() { setSelected(new Set(filtered.map(t => t.id))) }
  function selectNone() { setSelected(new Set()) }

  // ── Gerar via Prompt ─────────────────────────────────────────
  async function handleStartPrompt() {
    const toGenerate = filtered.filter(t => selected.has(t.id))
    if (!toGenerate.length) return
    await startBatch(toGenerate)
  }

  // ── Gerar via PDF ─────────────────────────────────────────────
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function handleStartPdf() {
    if (!pdfFile || selected.size === 0) return
    setPdfRunning(true)

    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) { setPdfRunning(false); return }

    let pdfBase64: string
    let mimeType: string

    if (materialSelecionado) {
      // Usa PDF salvo no banco
      const res = await fetch(materialSelecionado.url)
      const blob = await res.blob()
      pdfBase64 = await blobToBase64(blob)
      mimeType = blob.type || 'application/pdf'
    } else if (pdfFile) {
      // Usa PDF do upload temporário
      pdfBase64 = await fileToBase64(pdfFile)
      mimeType = pdfFile.type || 'application/pdf'
    } else {
      setPdfRunning(false)
      return
    }
    const toGenerate = filtered.filter(t => selected.has(t.id))

    for (const topico of toGenerate) {
      setPdfStatus(prev => ({ ...prev, [topico.id]: { status: 'loading' } }))
      try {
        const result = await generateFromPdf(topico, pdfBase64, mimeType, token, SUPABASE_URL)
        setPdfStatus(prev => ({ ...prev, [topico.id]: { status: 'success', questoes: result.questoes } }))
      } catch (err: any) {
        setPdfStatus(prev => ({ ...prev, [topico.id]: { status: 'error', error: err.message } }))
      }
    }

    setPdfRunning(false)
  }

  const itemMap = new Map(items.map(i => [i.topico.id, i]))
  const isRunning = modo === 'prompt' ? running : pdfRunning

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerar conteúdo em lote</h1>
        <p className="text-gray-500 mt-1">Selecione os tópicos e a fonte de geração.</p>
      </div>

      {/* Seletor de modo */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setModo('prompt')}
          className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${modo === 'prompt' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${modo === 'prompt' ? 'bg-purple-100' : 'bg-gray-100'}`}>⚡</div>
          <div>
            <div className="font-medium text-gray-800 text-sm">Gerar por IA</div>
            <div className="text-xs text-gray-500">Claude gera todo o conteúdo do zero</div>
          </div>
        </button>
        <button onClick={() => setModo('pdf')}
          className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${modo === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${modo === 'pdf' ? 'bg-blue-100' : 'bg-gray-100'}`}>📄</div>
          <div>
            <div className="font-medium text-gray-800 text-sm">Gerar por PDF</div>
            <div className="text-xs text-gray-500">Extrai questões inéditas do livro/apostila</div>
          </div>
        </button>
      </div>

      {/* Seletor PDF — salvo no banco ou upload temporário */}
      {modo === 'pdf' && (
        <div className="mb-6 space-y-3">
          <SeletorMaterialPDF
            onSelecionar={(m) => { setMaterialSelecionado(m); if (m) setPdfFile(null) }}
            materialSelecionado={materialSelecionado}
            filtroMateria={filterTrilha !== 'Todas' ? filterTrilha : undefined}
          />
          <div className="text-center text-xs text-gray-400">ou</div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
            onChange={e => { setPdfFile(e.target.files?.[0] ?? null); setMaterialSelecionado(null) }} />
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              pdfFile ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
            }`}>
            {pdfFile ? (
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-medium text-blue-700 text-sm truncate">{pdfFile.name}</p>
                  <p className="text-xs text-blue-400">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB — upload temporário</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setPdfFile(null) }}
                  className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Upload temporário (não salva no banco)</p>
            )}
          </div>
        </div>
      )}

      {/* Progresso prompt */}
      {modo === 'prompt' && total > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">{running ? `Gerando ${done} de ${total}...` : `Concluído — ${done} de ${total}`}</span>
            <span className="text-gray-400">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-6 mt-3 text-xs">
            <span className="text-green-600">✓ {success} gerados</span>
            {errors > 0 && <span className="text-red-500">✗ {errors} erros</span>}
            {running && <span className="text-blue-500 animate-pulse">⟳ processando...</span>}
          </div>
        </div>
      )}

      {/* Filtro por trilha */}
      <div className="flex flex-wrap gap-2 mb-4">
        {trilhas.map(t => (
          <button key={t} onClick={() => { setFilterTrilha(t); selectNone() }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterTrilha === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button onClick={() => setFilter('sem_conteudo')}
            className={`px-4 py-2 ${filter === 'sem_conteudo' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Sem conteúdo ({semConteudo})
          </button>
          <button onClick={() => setFilter('todos')}
            className={`px-4 py-2 border-l border-gray-200 ${filter === 'todos' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Todos ({todosCount})
          </button>
        </div>
        <button onClick={selectAll} className="text-sm text-purple-600 hover:underline">Selecionar todos</button>
        <button onClick={selectNone} className="text-sm text-gray-400 hover:underline">Limpar seleção</button>
        <div className="ml-auto">
          <button
            onClick={modo === 'prompt' ? handleStartPrompt : handleStartPdf}
            disabled={selected.size === 0 || isRunning || (modo === 'pdf' && !pdfFile && !materialSelecionado)}
            className={`px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all ${modo === 'pdf' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
            {isRunning ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processando...</>
            ) : modo === 'pdf' ? (
              <><span>📄</span>{!pdfFile ? 'Selecione um PDF' : selected.size > 0 ? `Extrair para ${selected.size} tópico${selected.size > 1 ? 's' : ''}` : 'Selecione tópicos'}</>
            ) : (
              <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>{selected.size > 0 ? `Gerar ${selected.size} tópico${selected.size > 1 ? 's' : ''}` : 'Gerar selecionados'}</>
            )}
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loadingTopicos ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando tópicos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {filter === 'sem_conteudo' ? 'Todos os tópicos já têm conteúdo gerado! 🎉' : 'Nenhum tópico encontrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => e.target.checked ? selectAll() : selectNone()}
                    className="rounded border-gray-300 text-purple-600" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tópico</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trilha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(topico => {
                const batchItem = itemMap.get(topico.id)
                const batchStatus = batchItem?.status ?? 'idle'
                const pdfItem = pdfStatus[topico.id]

                return (
                  <tr key={topico.id} onClick={() => !isRunning && toggleSelect(topico.id)}
                    className={`cursor-pointer transition-colors ${selected.has(topico.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(topico.id)}
                        onChange={() => toggleSelect(topico.id)} disabled={isRunning}
                        className="rounded border-gray-300 text-purple-600"
                        onClick={e => e.stopPropagation()} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{topico.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{topico.trilha}</td>
                    <td className="px-4 py-3">
                      {/* Status PDF */}
                      {modo === 'pdf' && pdfItem ? (
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[pdfItem.status]}`}>
                          <span className={pdfItem.status === 'loading' ? 'inline-block animate-spin' : ''}>{STATUS_ICON[pdfItem.status]}</span>
                          {pdfItem.status === 'loading' && 'Extraindo do PDF...'}
                          {pdfItem.status === 'success' && `${pdfItem.questoes} questões extraídas`}
                          {pdfItem.status === 'error' && (pdfItem.error?.slice(0, 40) ?? 'Erro')}
                        </span>
                      ) : modo === 'prompt' && batchItem ? (
                        <span className={`flex items-center gap-1.5 font-medium ${STATUS_COLOR[batchStatus]}`}>
                          <span className={batchStatus === 'loading' ? 'inline-block animate-spin' : ''}>{STATUS_ICON[batchStatus]}</span>
                          {batchStatus === 'loading' && 'Gerando...'}
                          {batchStatus === 'success' && `Gerado · ${batchItem.tokens?.toLocaleString()} tokens`}
                          {batchStatus === 'error' && (batchItem.error ?? 'Erro')}
                        </span>
                      ) : topico.content_gerado_em ? (
                        <span className="text-green-600 text-xs">✓ {new Date(topico.content_gerado_em).toLocaleDateString('pt-BR')}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">Sem conteúdo</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
