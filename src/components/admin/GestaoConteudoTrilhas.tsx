// src/components/admin/GestaoConteudoTrilhas.tsx
// Permite importar/editar conteúdo das unidades das trilhas via IA ou manual

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const C = {
  bg: "#F4F6FB", card: "#FFFFFF", primary: "#0A7C4B",
  text: "#1a1a2e", sub: "#64748B", border: "#E2E8F0",
  ok: "#22c55e", erro: "#ef4444",
};

const TRILHAS: { id: string; label: string; emoji: string; materia: string; unidades: { id: string; titulo: string }[] }[] = [
  {
    id: "quimica", label: "Química Geral", emoji: "🧪", materia: "quimica",
    unidades: [
      { id: "introducao", titulo: "Introdução à Química" },
      { id: "estrutura-atomica", titulo: "Estrutura Atômica" },
      { id: "tabela-periodica", titulo: "Tabela Periódica" },
      { id: "ligacoes-quimicas", titulo: "Ligações Químicas" },
      { id: "funcoes-inorganicas", titulo: "Funções Inorgânicas" },
      { id: "reacoes-quimicas", titulo: "Reações Químicas" },
      { id: "estequiometria", titulo: "Estequiometria" },
      { id: "gases", titulo: "Gases" },
      { id: "solucoes", titulo: "Soluções" },
    ],
  },
  {
    id: "organica", label: "Química Orgânica", emoji: "🧬", materia: "organica",
    unidades: [
      { id: "introducao-organica", titulo: "Introdução à Orgânica" },
      { id: "hidrocarbonetos", titulo: "Hidrocarbonetos" },
      { id: "funcoes-organicas", titulo: "Funções Oxigenadas" },
      { id: "funcoes-nitrogenadas", titulo: "Funções Nitrogenadas" },
      { id: "isomeria", titulo: "Isomeria" },
      { id: "reacoes-organicas", titulo: "Reações Orgânicas" },
      { id: "polimeros", titulo: "Polímeros" },
      { id: "bioquimica-organica", titulo: "Bioquímica" },
      { id: "organica-cotidiano", titulo: "Orgânica no Cotidiano" },
    ],
  },
  {
    id: "fisicoquimica", label: "Físico-Química", emoji: "🔥", materia: "fisicoquimica",
    unidades: [
      { id: "introducao-fisicoquimica", titulo: "Introdução" },
      { id: "termoquimica", titulo: "Termoquímica" },
      { id: "cinetica-quimica", titulo: "Cinética Química" },
      { id: "equilibrio-quimico", titulo: "Equilíbrio Químico" },
      { id: "equilibrio-ionico", titulo: "Equilíbrio Iônico" },
      { id: "eletroquimica", titulo: "Eletroquímica" },
      { id: "propriedades-coligativas", titulo: "Prop. Coligativas" },
      { id: "gases-fisicoquimica", titulo: "Gases" },
      { id: "aplicacoes-cotidiano", titulo: "Aplicações" },
    ],
  },
  {
    id: "inorganica", label: "Inorgânica", emoji: "⚗️", materia: "inorganica",
    unidades: [
      { id: "oxidos",           titulo: "Óxidos" },
      { id: "acidos",           titulo: "Ácidos" },
      { id: "bases",            titulo: "Bases" },
      { id: "sais",             titulo: "Sais" },
      { id: "nomenclatura",     titulo: "Nomenclatura Inorgânica" },
      { id: "reacoes-inorg",    titulo: "Reações Inorgânicas" },
      { id: "oxidacao-reducao", titulo: "Oxidação e Redução" },
      { id: "quimica-ambiental",titulo: "Química Ambiental" },
    ],
  },
  {
    id: "analitica", label: "Química Analítica", emoji: "🔬", materia: "analitica",
    unidades: [
      { id: "analise-qualitativa",  titulo: "Análise Qualitativa" },
      { id: "analise-quantitativa", titulo: "Análise Quantitativa" },
      { id: "titulacao",            titulo: "Titulação e Volumetria" },
      { id: "espectroscopia",       titulo: "Espectroscopia" },
      { id: "cromatografia",        titulo: "Cromatografia" },
      { id: "eletroanalise",        titulo: "Eletroanalítica" },
    ],
  },
  {
    id: "bioquimica-q", label: "Bioquímica", emoji: "🧫", materia: "bioquimica_q",
    unidades: [
      { id: "carboidratos",     titulo: "Carboidratos" },
      { id: "lipidios",         titulo: "Lipídios" },
      { id: "proteinas",        titulo: "Proteínas e Enzimas" },
      { id: "acidos-nucleicos", titulo: "Ácidos Nucleicos" },
      { id: "metabolismo",      titulo: "Metabolismo Celular" },
      { id: "vitaminas",        titulo: "Vitaminas e Cofatores" },
    ],
  },
  {
    id: "fisica", label: "Física", emoji: "⚡", materia: "fisica",
    unidades: [
      { id: "introducao-cinematica", titulo: "Introdução à Cinemática" },
      { id: "posicao-deslocamento", titulo: "Posição e Deslocamento" },
      { id: "velocidade", titulo: "Velocidade" },
      { id: "aceleracao", titulo: "Aceleração e MUV" },
      { id: "queda-livre", titulo: "Queda Livre" },
      { id: "movimento-circular", titulo: "Movimento Circular" },
      { id: "lancamento-projeteis", titulo: "Lançamento de Projéteis" },
      { id: "analise-grafica", titulo: "Análise Gráfica" },
      { id: "ondulatoria", titulo: "Ondulatória & Óptica" },
      { id: "eletromagnetismo", titulo: "Eletromagnetismo" },
      { id: "termodinamica", titulo: "Termodinâmica" },
      { id: "fisica-moderna", titulo: "Física Moderna" },
    ],
  },
  {
    id: "biologia", label: "Biologia", emoji: "🧫", materia: "biologia",
    unidades: [
      { id: "citologia", titulo: "Citologia" },
      { id: "bioquimica", titulo: "Bioquímica" },
      { id: "histologia", titulo: "Histologia e Embriologia" },
      { id: "fisiologia-animal", titulo: "Fisiologia Animal" },
      { id: "botanica", titulo: "Botânica" },
      { id: "zoologia", titulo: "Zoologia" },
      { id: "genetica", titulo: "Genética" },
      { id: "evolucao", titulo: "Evolução" },
      { id: "ecologia", titulo: "Ecologia" },
      { id: "saude-doencas", titulo: "Saúde e Doenças" },
    ],
  },
  {
    id: "matematica", label: "Matemática", emoji: "📐", materia: "matematica",
    unidades: [
      { id: "fundamentos-mat", titulo: "Fundamentos" },
      { id: "algebra", titulo: "Álgebra Linear" },
      { id: "geometria", titulo: "Geometria" },
      { id: "probabilidade", titulo: "Probabilidade & Combinatória" },
      { id: "calculo", titulo: "Cálculo" },
      { id: "numeros-complexos", titulo: "Números Complexos" },
    ],
  },
  {
    id: "historia", label: "História", emoji: "🏛️", materia: "historia",
    unidades: [
      { id: "pre-historia",         titulo: "Pré-História e Antiguidade" },
      { id: "idade-media",          titulo: "Idade Média" },
      { id: "idade-moderna",        titulo: "Idade Moderna" },
      { id: "revolucoes",           titulo: "Revoluções e Iluminismo" },
      { id: "brasil-colonial",      titulo: "Brasil Colonial" },
      { id: "brasil-imperio",       titulo: "Brasil Império e República" },
      { id: "guerras-mundiais",     titulo: "Guerras Mundiais" },
      { id: "brasil-republica",     titulo: "Brasil República Moderna" },
      { id: "historia-africa",      titulo: "África e Diáspora Africana" },
      { id: "america-latina",       titulo: "América Latina" },
      { id: "mundo-contemporaneo",  titulo: "Mundo Contemporâneo" },
    ],
  },
  {
    id: "geografia", label: "Geografia", emoji: "🗺️", materia: "geografia",
    unidades: [
      { id: "cartografia",            titulo: "Cartografia e Orientação" },
      { id: "relevo-solo",            titulo: "Relevo e Solos" },
      { id: "clima-meteorologia",     titulo: "Clima e Meteorologia" },
      { id: "hidrografia",            titulo: "Hidrografia" },
      { id: "biomas-vegetacao",       titulo: "Biomas e Vegetação" },
      { id: "populacao",              titulo: "População Mundial e Brasileira" },
      { id: "urbanizacao",            titulo: "Urbanização" },
      { id: "economia-mundial",       titulo: "Economia Mundial" },
      { id: "geopolitica",            titulo: "Geopolítica e Conflitos" },
      { id: "brasil-regionalizacao",  titulo: "Regiões do Brasil" },
      { id: "questoes-ambientais",    titulo: "Questões Ambientais Globais" },
    ],
  },
  {
    id: "filosofia", label: "Filosofia & Sociologia", emoji: "🧠", materia: "filosofia",
    unidades: [
      { id: "filosofia-antiga",        titulo: "Filosofia Antiga" },
      { id: "filosofia-medieval",      titulo: "Filosofia Medieval e Moderna" },
      { id: "contratualistas",         titulo: "Contratualistas e Política" },
      { id: "filosofia-contemporanea", titulo: "Filosofia Contemporânea" },
      { id: "etica-moral",             titulo: "Ética e Moral" },
      { id: "sociologia-classica",     titulo: "Sociologia Clássica" },
      { id: "cultura-identidade",      titulo: "Cultura, Identidade e Diversidade" },
      { id: "desigualdade-social",     titulo: "Desigualdade e Estratificação" },
      { id: "cidadania-direitos",      titulo: "Cidadania e Direitos Humanos" },
      { id: "trabalho-economia",       titulo: "Trabalho e Economia" },
      { id: "midia-comunicacao",       titulo: "Mídia, Comunicação e Tecnologia" },
    ],
  },
  {
    id: "portugues", label: "Português", emoji: "📚", materia: "portugues",
    unidades: [
      { id: "interpretacao", titulo: "Interpretação de Texto" },
      { id: "gramatica", titulo: "Gramática" },
      { id: "literatura", titulo: "Literatura Brasileira" },
      { id: "literatura-portuguesa", titulo: "Literatura Portuguesa" },
      { id: "redacao", titulo: "Redação" },
      { id: "linguistica", titulo: "Linguística" },
    ],
  },
  {
    id: "redacao", label: "Redação", emoji: "✏️", materia: "redacao",
    unidades: [
      { id: "estrutura-dissertacao", titulo: "Estrutura da Dissertação" },
      { id: "introducao", titulo: "Construindo a Introdução" },
      { id: "argumentacao", titulo: "Técnicas de Argumentação" },
      { id: "desenvolvimento", titulo: "Desenvolvendo Parágrafos" },
      { id: "conclusao", titulo: "A Conclusão Propositiva" },
      { id: "competencias-enem", titulo: "5 Competências do ENEM" },
      { id: "repertorio", titulo: "Repertório Sociocultural" },
      { id: "coesao-coerencia", titulo: "Coesão e Coerência" },
      { id: "pratica-temas", titulo: "Temas Recorrentes" },
    ],
  },
  {
    id: "ingles", label: "Inglês", emoji: "🇺🇸", materia: "ingles",
    unidades: [
      { id: "reading-comprehension", titulo: "Reading Comprehension" },
      { id: "grammar", titulo: "Grammar & Structure" },
      { id: "vocabulary", titulo: "Vocabulary & Idioms" },
      { id: "scientific-english", titulo: "Scientific English" },
      { id: "writing", titulo: "Writing & Essay" },
    ],
  },
];

interface ConteudoForm {
  titulo: string;
  conteudo: string;
  exemplos: string;
  formulas: string;
}

interface Props {
  areasProf?: string[] | null;
  onSalvarAreas?: (areas: string[]) => void;
  salvandoAreas?: boolean;
}

const AREAS_LISTA = [
  { id: "quimica",       label: "⚗️ Química Geral" },
  { id: "organica",      label: "🧬 Orgânica" },
  { id: "fisicoquimica", label: "🔥 Físico-Química" },
  { id: "fisica",        label: "⚡ Física" },
  { id: "biologia",      label: "🧫 Biologia" },
  { id: "matematica",    label: "📐 Matemática" },
  { id: "historia",      label: "🏛️ História" },
  { id: "geografia",     label: "🗺️ Geografia" },
  { id: "filosofia",     label: "🧠 Filosofia & Sociol." },
  { id: "portugues",     label: "📚 Português" },
  { id: "redacao",       label: "✏️ Redação" },
  { id: "ingles",        label: "🇺🇸 Inglês" },
  { id: "inorganica",    label: "⚗️ Inorgânica" },
  { id: "analitica",     label: "🔬 Analítica" },
  { id: "bioquimica-q",  label: "🧫 Bioquímica" },
];

export default function GestaoConteudoTrilhas({ areasProf, onSalvarAreas, salvandoAreas }: Props = {}) {
  const [seletorAberto, setSeletorAberto] = useState(false);
  // Filtra trilhas pelas áreas de atuação do professor (admin vê todas)
  const trilhasVisiveis = areasProf && areasProf.length > 0
    ? TRILHAS.filter(t => areasProf.includes(t.id))
    : TRILHAS;
  const [trilhaSel, setTrilhaSel] = useState(trilhasVisiveis[0] ?? TRILHAS[0]);
  const [unidadeSel, setUnidadeSel] = useState(TRILHAS[0].unidades[0]);
  const [form, setForm] = useState<ConteudoForm>({ titulo: "", conteudo: "", exemplos: "", formulas: "" });
  const [existeId, setExisteId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [statusUnidades, setStatusUnidades] = useState<Record<string, boolean>>({});
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarStatusTrilha(trilhaSel);
  }, [trilhaSel]);

  useEffect(() => {
    carregarConteudo();
  }, [unidadeSel]);

  async function carregarStatusTrilha(trilha: typeof TRILHAS[0]) {
    const ids = trilha.unidades.map(u => u.id);
    const { data } = await supabase
      .from("trilha_conteudos")
      .select("unidade_id")
      .eq("materia", trilha.materia)
      .in("unidade_id", ids);
    const mapa: Record<string, boolean> = {};
    (data || []).forEach((d: any) => { mapa[d.unidade_id] = true; });
    setStatusUnidades(mapa);
  }

  async function carregarConteudo() {
    setCarregando(true);
    setExisteId(null);
    setForm({ titulo: "", conteudo: "", exemplos: "", formulas: "" });

    const { data } = await supabase
      .from("trilha_conteudos")
      .select("id, titulo, conteudo, exemplos, formulas")
      .eq("materia", trilhaSel.materia)
      .eq("unidade_id", unidadeSel.id)
      .maybeSingle();

    if (data) {
      setExisteId((data as any).id);
      setForm({
        titulo:   (data as any).titulo   || "",
        conteudo: (data as any).conteudo || "",
        exemplos: (data as any).exemplos || "",
        formulas: (data as any).formulas || "",
      });
    } else {
      setForm({ titulo: unidadeSel.titulo, conteudo: "", exemplos: "", formulas: "" });
    }
    setCarregando(false);
  }

  async function salvar() {
    if (!form.conteudo.trim()) { setMsg({ tipo: "erro", texto: "Conteúdo é obrigatório." }); return; }
    setSalvando(true); setMsg(null);

    const payload = {
      materia:    trilhaSel.materia,
      unidade_id: unidadeSel.id,
      titulo:     form.titulo || unidadeSel.titulo,
      conteudo:   form.conteudo,
      exemplos:   form.exemplos || null,
      formulas:   form.formulas || null,
    };

    const { error } = existeId
      ? await supabase.from("trilha_conteudos").update(payload).eq("id", existeId)
      : await supabase.from("trilha_conteudos").insert(payload);

    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao salvar: " + error.message });
    } else {
      setMsg({ tipo: "ok", texto: "✅ Conteúdo salvo com sucesso!" });
      setStatusUnidades(p => ({ ...p, [unidadeSel.id]: true }));
      if (!existeId) {
        const { data } = await supabase.from("trilha_conteudos").select("id").eq("materia", trilhaSel.materia).eq("unidade_id", unidadeSel.id).maybeSingle();
        if (data) setExisteId((data as any).id);
      }
    }
    setSalvando(false);
    setTimeout(() => setMsg(null), 4000);
  }

  async function gerarComIA() {
    setGerandoIA(true); setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setMsg({ tipo: "ok", texto: "⏳ Gerando pacote completo com IA... isso pode levar ~40 segundos." });
      const response = await fetch(
        "https://iuziweujszfiaulltzqv.supabase.co/functions/v1/generate-topic-content",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            materia: trilhaSel.label,
            trilha: trilhaSel.label,
            topico: unidadeSel.titulo,
            topico_id: null,
            trilha_id: null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Erro na geração");
      const c = data.content;
      if (c?.resumo) {
        setForm({
          titulo:   c.topico || unidadeSel.titulo,
          conteudo: c.resumo.explicacao || c.resumo.introducao || "",
          exemplos: Array.isArray(c.resumo.conceitos_principais) ? c.resumo.conceitos_principais.join("\n") : "",
          formulas: Array.isArray(c.resumo.dicas_enem) ? c.resumo.dicas_enem.join("\n") : "",
        });
      }
      const fc = data.distribuicao?.flashcards?.inserted ?? 0;
      const qe = data.distribuicao?.questoes_enem?.inserted ?? 0;
      setMsg({ tipo: "ok", texto: `✅ Gerado! ${fc} flashcards · ${qe} questões ENEM · mapa mental · revisão. Revise e salve.` });
    } catch (err: any) {
      setMsg({ tipo: "erro", texto: "Erro ao gerar: " + err.message });
    }
    setGerandoIA(false);
  }

  async function importarPdfConteudo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const tiposAceitos = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!tiposAceitos.includes(file.type)) {
      setMsg({ tipo: "erro", texto: "Formatos aceitos: PDF, JPG, PNG, WEBP." });
      return;
    }
    const maxSize = file.type === "application/pdf" ? 20 : 10;
    if (file.size > maxSize * 1024 * 1024) {
      setMsg({ tipo: "erro", texto: `Arquivo muito grande. Máximo ${maxSize} MB.` });
      return;
    }

    setImportandoPdf(true);
    setMsg({ tipo: "ok", texto: "⏳ Extraindo conteúdo do arquivo..." });

    try {
      const base64Data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("Erro ao ler arquivo"));
        r.readAsDataURL(file);
      });

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        "https://iuziweujszfiaulltzqv.supabase.co/functions/v1/extrair-conteudo-pdf",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            base64Data,
            mimeType: file.type || "application/pdf",
            unidadeTitulo: unidadeSel.titulo,
            materia: trilhaSel.label,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Erro na extração");

      const c = data.conteudo;
      setForm({
        titulo:   c.titulo   || unidadeSel.titulo,
        conteudo: c.conteudo || "",
        exemplos: c.exemplos || "",
        formulas: c.formulas || "",
      });

      const cobertura = c.cobertura ? ` — ${c.cobertura}` : "";
      setMsg({ tipo: "ok", texto: `✅ Conteúdo extraído do arquivo${cobertura}. Revise e salve.` });
    } catch (err: any) {
      setMsg({ tipo: "erro", texto: "Erro ao extrair: " + err.message });
    }

    setImportandoPdf(false);
    if (pdfRef.current) pdfRef.current.value = "";
  }

  async function gerarTodaATrilha() {
    const unidadesSemConteudo = trilhaSel.unidades.filter(u => !statusUnidades[u.id]);
    if (unidadesSemConteudo.length === 0) {
      setMsg({ tipo: "ok", texto: "✅ Todas as unidades já têm conteúdo!" });
      return;
    }
    setMsg({ tipo: "ok", texto: `⏳ Gerando conteúdo para ${unidadesSemConteudo.length} unidade(s)... isso pode levar alguns minutos.` });

    let ok = 0;
    for (const unidade of unidadesSemConteudo) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          "https://iuziweujszfiaulltzqv.supabase.co/functions/v1/generate-topic-content",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              materia: trilhaSel.label,
              trilha: trilhaSel.label,
              topico: unidade.titulo,
              topico_id: null,
              trilha_id: null,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error);
        const c = data.content;
        if (c?.resumo) {
          await supabase.from("trilha_conteudos").upsert({
            materia:    trilhaSel.materia,
            unidade_id: unidade.id,
            titulo:     c.topico || unidade.titulo,
            conteudo:   c.resumo.explicacao || c.resumo.introducao || "",
            exemplos:   Array.isArray(c.resumo.conceitos_principais) ? c.resumo.conceitos_principais.join("\n") : "",
            formulas:   Array.isArray(c.resumo.dicas_enem) ? c.resumo.dicas_enem.join("\n") : "",
          }, { onConflict: "materia,unidade_id" });
        }
        ok++;
        setStatusUnidades(p => ({ ...p, [unidade.id]: true }));
      } catch (err: any) {
        console.error("Erro em", unidade.titulo, err.message);
      }
    }
    setGerandoIA(false);
    setMsg({ tipo: "ok", texto: `✅ ${ok}/${unidadesSemConteudo.length} unidade(s) gerada(s) com pacote completo!` });
    carregarStatusTrilha(trilhaSel);
  }

  const totalCom = Object.values(statusUnidades).filter(Boolean).length;
  const totalSem = trilhaSel.unidades.length - totalCom;

  return (
    <div>
      {/* Seletor de áreas de atuação */}
      {onSalvarAreas && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden" }}>
          <button
            onClick={() => setSeletorAberto(p => !p)}
            style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: C.text }}>🎯 Minhas áreas de atuação</p>
              <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>
                {areasProf && areasProf.length > 0
                  ? `${areasProf.length} área(s) selecionada(s) — clique para alterar`
                  : "Nenhuma selecionada — mostrando todas as trilhas"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {salvandoAreas && <span style={{ fontSize: 11, color: C.sub }}>Salvando...</span>}
              <span style={{ fontSize: 16, color: C.sub, transform: seletorAberto ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </div>
          </button>
          {seletorAberto && (
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {AREAS_LISTA.map(a => {
                  const sel = (areasProf ?? []).includes(a.id);
                  return (
                    <button key={a.id}
                      onClick={() => {
                        const atual = areasProf ?? [];
                        const novas = sel ? atual.filter(x => x !== a.id) : [...atual, a.id];
                        onSalvarAreas(novas);
                      }}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                        background: sel ? C.primary : "#F1F5F9", color: sel ? "#fff" : C.sub }}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
              {(!areasProf || areasProf.length === 0) && (
                <p style={{ fontSize: 11, color: "#92400e", margin: "10px 0 0", background: "#fffbeb", padding: "6px 10px", borderRadius: 6 }}>
                  ⚠️ Selecione suas áreas para filtrar o painel
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Seletor de trilha */}
      <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>📚 Selecionar Trilha</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {trilhasVisiveis.map(t => (
            <button key={t.id} onClick={() => { setTrilhaSel(t); setUnidadeSel(t.unidades[0]); }}
              style={{
                padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: trilhaSel.id === t.id ? C.primary : "#F1F5F9",
                color: trilhaSel.id === t.id ? "#fff" : C.sub,
              }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status da trilha + botão gerar tudo */}
      <div style={{ background: C.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}`, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 4px", color: C.text }}>
            {trilhaSel.emoji} {trilhaSel.label}
          </p>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ fontSize: 11, background: "#EDFAF3", color: "#15803d", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>✅ {totalCom} com conteúdo</span>
            {totalSem > 0 && <span style={{ fontSize: 11, background: "#FFF8E6", color: "#92400e", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>⚠️ {totalSem} sem conteúdo</span>}
          </div>
        </div>
        {totalSem > 0 && (
          <button onClick={gerarTodaATrilha} disabled={gerandoIA}
            style={{ padding: "8px 14px", background: gerandoIA ? "#e2e8f0" : "linear-gradient(135deg,#0057FF,#0A7C4B)", color: gerandoIA ? C.sub : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: gerandoIA ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
            {gerandoIA ? "⏳ Gerando..." : `🤖 Gerar ${totalSem} faltando`}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12 }}>
        {/* Lista de unidades */}
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", margin: 0, padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            Unidades
          </p>
          {trilhaSel.unidades.map(u => (
            <button key={u.id} onClick={() => setUnidadeSel(u)}
              style={{
                width: "100%", padding: "9px 12px", textAlign: "left", border: "none",
                borderBottom: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                background: unidadeSel.id === u.id ? "#E6EEFF" : "transparent",
                color: unidadeSel.id === u.id ? C.primary : C.text,
              }}>
              <span style={{ fontSize: 8, color: statusUnidades[u.id] ? C.ok : "#d1d5db" }}>●</span>
              <span style={{ fontSize: 12, fontWeight: unidadeSel.id === u.id ? 600 : 400, lineHeight: 1.3 }}>{u.titulo}</span>
            </button>
          ))}
        </div>

        {/* Editor de conteúdo */}
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          {carregando ? (
            <p style={{ color: C.sub, fontSize: 13, textAlign: "center", padding: 32 }}>Carregando...</p>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px", color: C.text }}>{unidadeSel.titulo}</p>
                    <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>{existeId ? "✅ Conteúdo cadastrado" : "⚠️ Sem conteúdo ainda"}</p>
                  </div>
                  <button onClick={gerarComIA} disabled={gerandoIA || importandoPdf}
                    style={{ padding: "8px 14px", background: gerandoIA ? "#e2e8f0" : "linear-gradient(135deg,#6D28D9,#4C1D95)", color: gerandoIA ? C.sub : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: gerandoIA ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                    {gerandoIA ? "⏳ Gerando..." : "🤖 Gerar com IA"}
                  </button>
                </div>
                {/* Importar de PDF/imagem */}
                <input ref={pdfRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={importarPdfConteudo} style={{ display: "none" }} />
                <button
                  onClick={() => pdfRef.current?.click()}
                  disabled={importandoPdf || gerandoIA}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 8, border: `1.5px dashed ${C.border}`,
                    background: importandoPdf ? "#F8FAFC" : "#FAFBFF",
                    color: importandoPdf ? C.sub : C.primary,
                    fontSize: 12, fontWeight: 600, cursor: importandoPdf ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  {importandoPdf
                    ? "⏳ Extraindo conteúdo..."
                    : "📄 Importar PDF, imagem, PPT ou Word"}
                </button>
              </div>

              {msg && (
                <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: msg.tipo === "ok" ? "#EDFAF3" : "#FFF1F1", border: `1px solid ${msg.tipo === "ok" ? C.ok : C.erro}`, color: msg.tipo === "ok" ? "#15803d" : "#b91c1c", fontSize: 12, fontWeight: 600 }}>
                  {msg.texto}
                </div>
              )}

              <div style={{ marginBottom: 10 }}>
                <p style={sLabel}>Título da unidade</p>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  style={sInput} placeholder="Ex: Estrutura Atômica" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <p style={sLabel}>Conteúdo principal *</p>
                <textarea rows={8} value={form.conteudo} onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
                  placeholder="Texto explicativo da unidade, conceitos, teorias e definições..."
                  style={{ ...sInput, resize: "vertical" as const, lineHeight: 1.6 }} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <p style={sLabel}>Exemplos práticos</p>
                <textarea rows={4} value={form.exemplos} onChange={e => setForm(p => ({ ...p, exemplos: e.target.value }))}
                  placeholder="Exemplos resolvidos, situações do cotidiano, casos práticos..."
                  style={{ ...sInput, resize: "vertical" as const }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={sLabel}>Fórmulas / Dicas de memorização</p>
                <textarea rows={3} value={form.formulas} onChange={e => setForm(p => ({ ...p, formulas: e.target.value }))}
                  placeholder="Fórmulas principais, macetes, regras mnemônicas..."
                  style={{ ...sInput, resize: "vertical" as const }} />
              </div>

              <button onClick={salvar} disabled={salvando}
                style={{ width: "100%", padding: "11px 0", background: salvando ? "#e2e8f0" : C.primary, color: salvando ? C.sub : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer" }}>
                {salvando ? "Salvando..." : existeId ? "💾 Atualizar conteúdo" : "💾 Salvar conteúdo"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const sLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#64748B",
  textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px",
};
const sInput: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: "1px solid #E2E8F0", borderRadius: 7,
  fontSize: 13, color: "#1a1a2e", fontFamily: "inherit",
  outline: "none", boxSizing: "border-box" as const,
};
