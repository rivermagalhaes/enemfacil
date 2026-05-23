// src/components/admin/GestaoConteudoTrilhas.tsx
// Permite importar/editar conteúdo das unidades das trilhas via IA ou manual

import { useState, useEffect } from "react";
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
    id: "humanas", label: "Humanas", emoji: "🌍", materia: "humanas",
    unidades: [
      { id: "pre-historia", titulo: "Pré-História e Antiguidade" },
      { id: "idade-media", titulo: "Idade Média" },
      { id: "idade-moderna", titulo: "Idade Moderna" },
      { id: "revolucoes", titulo: "Revoluções e Iluminismo" },
      { id: "brasil-colonial", titulo: "Brasil Colonial" },
      { id: "brasil-imperio", titulo: "Brasil Império" },
      { id: "guerras-mundiais", titulo: "Guerras Mundiais" },
      { id: "brasil-republica", titulo: "Brasil República" },
      { id: "geografia-fisica", titulo: "Geografia Física" },
      { id: "geografia-humana", titulo: "Geografia Humana" },
      { id: "filosofia-sociologia", titulo: "Filosofia e Sociologia" },
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

export default function GestaoConteudoTrilhas() {
  const [trilhaSel, setTrilhaSel] = useState(TRILHAS[0]);
  const [unidadeSel, setUnidadeSel] = useState(TRILHAS[0].unidades[0]);
  const [form, setForm] = useState<ConteudoForm>({ titulo: "", conteudo: "", exemplos: "", formulas: "" });
  const [existeId, setExisteId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [statusUnidades, setStatusUnidades] = useState<Record<string, boolean>>({});

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
      const response = await fetch(
        "https://iuziweujszfiaulltzqv.supabase.co/functions/v1/converter-questoes-objetivas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            questoes: [{
              question: `Gere um conteúdo educacional COMPLETO para a unidade "${unidadeSel.titulo}" da matéria "${trilhaSel.label}". Retorne um JSON com: { "options": ["CONTEUDO_PRINCIPAL", "EXEMPLOS_PRATICOS", "FORMULAS_OU_DICAS", "TITULO_CURTO"], "answer_index": 0, "explanation": "" }. CONTEUDO_PRINCIPAL: texto explicativo rico com 400-600 palavras, linguagem clara para ensino médio, cobrindo todos os tópicos da unidade. EXEMPLOS_PRATICOS: 2-3 exemplos concretos e resolvidos. FORMULAS_OU_DICAS: fórmulas principais ou dicas de memorização (pode ser vazio se não aplicável). TITULO_CURTO: título conciso da unidade.`,
              area: "natureza",
              difficulty: "medio",
            }],
          }),
        }
      );
      const data = await response.json();
      const r = data.resultados?.[0];
      if (r?.options?.length >= 3) {
        setForm({
          titulo:   r.options[3] || unidadeSel.titulo,
          conteudo: r.options[0] || "",
          exemplos: r.options[1] || "",
          formulas: r.options[2] || "",
        });
        setMsg({ tipo: "ok", texto: "✅ Conteúdo gerado! Revise e salve." });
      } else {
        throw new Error("Resposta inválida da IA");
      }
    } catch (err: any) {
      setMsg({ tipo: "erro", texto: "Erro ao gerar: " + err.message });
    }
    setGerandoIA(false);
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
          "https://iuziweujszfiaulltzqv.supabase.co/functions/v1/converter-questoes-objetivas",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              questoes: [{
                question: `Gere um conteúdo educacional COMPLETO para a unidade "${unidade.titulo}" da matéria "${trilhaSel.label}". Retorne um JSON com: { "options": ["CONTEUDO_PRINCIPAL", "EXEMPLOS_PRATICOS", "FORMULAS_OU_DICAS", "TITULO_CURTO"], "answer_index": 0, "explanation": "" }. CONTEUDO_PRINCIPAL: texto explicativo rico com 400-600 palavras. EXEMPLOS_PRATICOS: 2-3 exemplos concretos. FORMULAS_OU_DICAS: fórmulas ou dicas (vazio se não aplicável). TITULO_CURTO: título conciso.`,
                area: "natureza",
                difficulty: "medio",
              }],
            }),
          }
        );
        const data = await response.json();
        const r = data.resultados?.[0];
        if (r?.options?.length >= 3) {
          await supabase.from("trilha_conteudos").upsert({
            materia:    trilhaSel.materia,
            unidade_id: unidade.id,
            titulo:     r.options[3] || unidade.titulo,
            conteudo:   r.options[0] || "",
            exemplos:   r.options[1] || "",
            formulas:   r.options[2] || "",
          }, { onConflict: "materia,unidade_id" });
          ok++;
          setStatusUnidades(p => ({ ...p, [unidade.id]: true }));
          setMsg({ tipo: "ok", texto: `⏳ ${ok}/${unidadesSemConteudo.length} unidades geradas...` });
        }
      } catch { /* continua */ }
    }
    setMsg({ tipo: "ok", texto: `✅ ${ok} unidade(s) gerada(s) com sucesso!` });
    carregarStatusTrilha(trilhaSel);
  }

  const totalCom = Object.values(statusUnidades).filter(Boolean).length;
  const totalSem = trilhaSel.unidades.length - totalCom;

  return (
    <div>
      {/* Seletor de trilha */}
      <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>📚 Selecionar Trilha</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TRILHAS.map(t => (
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px", color: C.text }}>{unidadeSel.titulo}</p>
                  <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>{existeId ? "✅ Conteúdo cadastrado" : "⚠️ Sem conteúdo ainda"}</p>
                </div>
                <button onClick={gerarComIA} disabled={gerandoIA}
                  style={{ padding: "8px 14px", background: gerandoIA ? "#e2e8f0" : "linear-gradient(135deg,#6D28D9,#4C1D95)", color: gerandoIA ? C.sub : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: gerandoIA ? "not-allowed" : "pointer" }}>
                  {gerandoIA ? "⏳ Gerando..." : "🤖 Gerar com IA"}
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
