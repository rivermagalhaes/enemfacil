// src/pages/admin/GeradorQuestoes.tsx
// Tela admin: converte questões discursivas em objetivas via IA
// Rota sugerida: /admin/gerador-questoes

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Alternativa { letra: string; texto: string; correta: boolean }
interface QuestaoGerada {
  modelo: string; enunciado: string; texto_base?: string;
  assunto_tag: string; competencia: string; habilidade: string;
  dificuldade: "facil" | "medio" | "dificil" | "olimpico";
  alternativas: Alternativa[];
  gabarito_justificativa: string; explicacao: string; analise_distratores: string;
}
interface Analise {
  conceito_principal: string; habilidade_cognitiva: string;
  area_tematica: string; competencia: string; habilidade_enem: string;
}

const MODELOS_CONFIG = [
  { nome: "Objetiva direta",  cor: "#3b82f6", bg: "#eff6ff" },
  { nome: "Interpretativa",  cor: "#10b981", bg: "#ecfdf5" },
  { nome: "Aplicação",       cor: "#f59e0b", bg: "#fffbeb" },
  { nome: "Nível olímpico",  cor: "#ef4444", bg: "#fef2f2" },
];

const DIF_CONFIG: Record<string, { label: string; cor: string }> = {
  facil:    { label: "Fácil",    cor: "#22c55e" },
  medio:    { label: "Médio",    cor: "#f59e0b" },
  dificil:  { label: "Difícil",  cor: "#ef4444" },
  olimpico: { label: "Olímpico", cor: "#8b5cf6" },
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function GeradorQuestoes() {
  const [discursiva, setDiscursiva]       = useState("");
  const [respostaEsp, setRespostaEsp]     = useState("");
  const [disciplina, setDisciplina]       = useState("Química");
  const [tema, setTema]                   = useState("");
  const [dificuldade, setDificuldade]     = useState("medio");
  const [contexto, setContexto]           = useState("");
  const [nModelos, setNModelos]           = useState(3);
  const [loading, setLoading]             = useState(false);
  const [loadingMsg, setLoadingMsg]       = useState("");
  const [questoes, setQuestoes]           = useState<QuestaoGerada[]>([]);
  const [analise, setAnalise]             = useState<Analise | null>(null);
  const [erro, setErro]                   = useState<string | null>(null);
  const [salvando, setSalvando]           = useState(false);
  const [salvoMsg, setSalvoMsg]           = useState<string | null>(null);
  const [simuladoId, setSimuladoId]       = useState("");

  const MSGS_LOADING = [
    "Analisando questão discursiva...",
    "Identificando habilidades e competências...",
    "Gerando alternativas inteligentes...",
    "Criando distratores pedagógicos...",
    "Validando coerência das questões...",
  ];

  async function gerar(estiloExtra?: string, difOverride?: string) {
    if (!discursiva.trim()) { setErro("Insira a questão discursiva."); return; }
    setErro(null); setLoading(true); setSalvoMsg(null);

    let msgIdx = 0;
    setLoadingMsg(MSGS_LOADING[0]);
    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % MSGS_LOADING.length;
      setLoadingMsg(MSGS_LOADING[msgIdx]);
    }, 1800);

    try {
      const { data, error } = await supabase.functions.invoke("gerar-objetivas", {
        body: {
          discursiva,
          resposta_esperada: respostaEsp,
          disciplina,
          tema,
          dificuldade: difOverride ?? dificuldade,
          contexto,
          n_modelos: nModelos,
          estilo_extra: estiloExtra ?? null,
          simulado_id: simuladoId || null,
        },
      });

      if (error) throw error;
      if (data.questoes) {
        setQuestoes(data.questoes);
        setAnalise(data.analise);
        if (data.questoes_salvas > 0) setSalvoMsg(`✅ ${data.questoes_salvas} questões salvas no simulado.`);
      }
    } catch (e: any) {
      setErro(e.message ?? "Erro ao gerar questões.");
    } finally {
      clearInterval(msgTimer);
      setLoading(false);
    }
  }

  async function salvarNoBanco() {
    if (!simuladoId.trim()) {
      setErro("Informe o ID do simulado para salvar.");
      return;
    }
    setSalvando(true); setErro(null);

    try {
      for (const q of questoes) {
        const { data: qInserida, error: qErr } = await supabase
          .from("questoes_simulado")
          .insert({
            simulado_id: simuladoId,
            enunciado:   q.enunciado,
            texto_base:  q.texto_base ?? null,
            explicacao:  `${q.explicacao}\n\nDistratores: ${q.analise_distratores}`,
            assunto_tag: q.assunto_tag,
            competencia: q.competencia,
            habilidade:  q.habilidade,
            dificuldade: q.dificuldade,
            fonte:       "ia",
          })
          .select("id")
          .single();

        if (qErr || !qInserida) continue;

        await supabase.from("alternativas_simulado").insert(
          q.alternativas.map((a, idx) => ({
            questao_id: qInserida.id,
            letra: a.letra, texto: a.texto, correta: a.correta, ordem: idx,
          }))
        );
      }
      setSalvoMsg(`✅ ${questoes.length} questões salvas com sucesso!`);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const modeloCfg = (nome: string) =>
    MODELOS_CONFIG.find(m => nome?.toLowerCase().includes(m.nome.toLowerCase().split(" ")[0])) ?? MODELOS_CONFIG[0];

  return (
    <div style={S.page}>
      {/* ── Cabeçalho ── */}
      <div style={S.header}>
        <h1 style={S.h1}>🧠 Gerador de Questões Objetivas</h1>
        <p style={S.headerSub}>Converta questões discursivas em múltiplos modelos objetivos usando IA pedagógica</p>
      </div>

      <div style={S.layout}>
        {/* ── Painel de entrada ── */}
        <div style={S.formPanel}>
          <div style={S.card}>
            <p style={S.sectionLabel}>Questão discursiva</p>
            <textarea
              style={S.textarea}
              rows={4}
              placeholder="Ex: Explique por que o aumento da temperatura acelera as reações químicas."
              value={discursiva}
              onChange={e => setDiscursiva(e.target.value)}
            />

            <p style={{ ...S.sectionLabel, marginTop: 12 }}>Resposta esperada</p>
            <textarea
              style={{ ...S.textarea, minHeight: 60 }}
              rows={3}
              placeholder="Descreva o que se espera que o aluno responda..."
              value={respostaEsp}
              onChange={e => setRespostaEsp(e.target.value)}
            />

            <div style={S.row3}>
              <div>
                <p style={S.fieldLabel}>Disciplina</p>
                <select style={S.select} value={disciplina} onChange={e => setDisciplina(e.target.value)}>
                  {["Química","Física","Biologia","Matemática","História","Geografia","Português","Filosofia","Sociologia"].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <p style={S.fieldLabel}>Dificuldade base</p>
                <select style={S.select} value={dificuldade} onChange={e => setDificuldade(e.target.value)}>
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                  <option value="olimpico">Olímpico</option>
                </select>
              </div>
              <div>
                <p style={S.fieldLabel}>Modelos</p>
                <select style={S.select} value={nModelos} onChange={e => setNModelos(Number(e.target.value))}>
                  <option value={2}>2 modelos</option>
                  <option value={3}>3 modelos</option>
                  <option value={4}>4 modelos</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={S.fieldLabel}>Tema / assunto específico</p>
              <input style={S.input} placeholder="Ex: Cinética química, teoria das colisões" value={tema} onChange={e => setTema(e.target.value)} />
            </div>

            <div style={{ marginTop: 8 }}>
              <p style={S.fieldLabel}>Contexto pedagógico</p>
              <input style={S.input} placeholder="Ex: Turma do 3º ano, foco em ENEM" value={contexto} onChange={e => setContexto(e.target.value)} />
            </div>

            {/* Botão principal */}
            <button style={{ ...S.btnPrimary, marginTop: 16 }} onClick={() => gerar()} disabled={loading}>
              {loading ? "Gerando..." : "🪄 Gerar questões objetivas"}
            </button>

            {/* Botões de estilo */}
            <div style={S.styleButtons}>
              <p style={{ ...S.fieldLabel, marginBottom: 6 }}>Gerar com estilo específico:</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: "Estilo ENEM",     estilo: "ENEM contextualizado com situação-problema real" },
                  { label: "Olímpico",        estilo: "olímpico com raciocínio aprofundado" },
                  { label: "Contextualizada", estilo: "contextualizada com situação do cotidiano" },
                  { label: "+ Difícil",       acao: () => {
                    const ordem = ["facil","medio","dificil","olimpico"];
                    const idx = ordem.indexOf(dificuldade);
                    const nova = ordem[Math.min(idx + 1, 3)];
                    setDificuldade(nova);
                    gerar(undefined, nova);
                  }},
                ].map((btn, i) => (
                  <button
                    key={i}
                    style={S.btnStyle}
                    disabled={loading}
                    onClick={() => btn.acao ? btn.acao() : gerar(btn.estilo)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Salvar no banco */}
            {questoes.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <p style={S.fieldLabel}>ID do simulado para salvar</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...S.input, flex: 1 }} placeholder="UUID do simulado" value={simuladoId} onChange={e => setSimuladoId(e.target.value)} />
                  <button style={S.btnSalvar} onClick={salvarNoBanco} disabled={salvando}>
                    {salvando ? "Salvando..." : "💾 Salvar"}
                  </button>
                </div>
              </div>
            )}

            {erro && <p style={S.erro}>{erro}</p>}
            {salvoMsg && <p style={S.sucesso}>{salvoMsg}</p>}
          </div>

          {/* Análise automática */}
          {analise && (
            <div style={{ ...S.card, marginTop: 12 }}>
              <p style={S.sectionLabel}>📊 Análise automática</p>
              {[
                { label: "Conceito", valor: analise.conceito_principal },
                { label: "Habilidade cognitiva", valor: analise.habilidade_cognitiva },
                { label: "Área temática", valor: analise.area_tematica },
                { label: "Competência", valor: analise.competencia },
                { label: "Habilidade ENEM", valor: analise.habilidade_enem },
              ].map(({ label, valor }) => (
                <div key={label} style={S.analiseRow}>
                  <span style={S.analiseLabel}>{label}</span>
                  <span style={S.analiseValor}>{valor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Painel de resultados ── */}
        <div style={S.resultsPanel}>
          {loading && (
            <div style={S.loadingBox}>
              <div style={S.spinner} />
              <p style={{ color: "#64748b", fontSize: 14 }}>{loadingMsg}</p>
            </div>
          )}

          {!loading && questoes.length === 0 && (
            <div style={S.emptyBox}>
              <span style={{ fontSize: 40 }}>🧬</span>
              <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 12 }}>
                Preencha a questão discursiva e clique em "Gerar questões objetivas"
              </p>
            </div>
          )}

          {!loading && questoes.map((q, i) => {
            const mcfg = modeloCfg(q.modelo);
            const dcfg = DIF_CONFIG[q.dificuldade] ?? DIF_CONFIG.medio;
            return (
              <div key={i} style={{ ...S.qCard, marginBottom: 16 }}>
                {/* Card header */}
                <div style={{ ...S.qHeader, borderBottom: `2px solid ${mcfg.cor}` }}>
                  <span style={{ ...S.modeloBadge, background: mcfg.bg, color: mcfg.cor }}>{q.modelo}</span>
                  <span style={{ ...S.difBadge, color: dcfg.cor }}>{dcfg.label}</span>
                </div>

                <div style={S.qBody}>
                  {/* Texto base */}
                  {q.texto_base && q.texto_base !== "null" && (
                    <div style={S.textoBase}>
                      <p style={S.textoBaseLabel}>📄 Texto de apoio</p>
                      <p style={S.textoBaseTexto}>{q.texto_base}</p>
                    </div>
                  )}

                  {/* Enunciado */}
                  <p style={S.enunciado}>{q.enunciado}</p>

                  {/* Alternativas */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {q.alternativas.map(alt => (
                      <div key={alt.letra} style={{ ...S.alt, ...(alt.correta ? S.altCorreta : {}) }}>
                        <span style={{ ...S.altLetra, ...(alt.correta ? S.altLetraCorreta : {}) }}>{alt.letra}</span>
                        <span style={S.altTexto}>{alt.texto}</span>
                        {alt.correta && <span style={{ marginLeft: "auto", color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>✓</span>}
                      </div>
                    ))}
                  </div>

                  {/* Gabarito */}
                  <div style={S.gabaritoBox}>
                    <p style={S.gabaritoLabel}>Gabarito e justificativa</p>
                    <p style={S.gabaritoTexto}>{q.gabarito_justificativa}</p>
                  </div>

                  {/* Explicação */}
                  <div style={{ ...S.infoBox, marginTop: 8 }}>
                    <p style={S.infoLabel}>Explicação completa</p>
                    <p style={S.infoTexto}>{q.explicacao}</p>
                  </div>

                  {/* Distratores */}
                  {q.analise_distratores && (
                    <div style={{ ...S.infoBox, marginTop: 8, borderLeft: "3px solid #f59e0b" }}>
                      <p style={{ ...S.infoLabel, color: "#92400e" }}>Análise dos distratores</p>
                      <p style={S.infoTexto}>{q.analise_distratores}</p>
                    </div>
                  )}

                  {/* Tags */}
                  <div style={S.tagsRow}>
                    {[q.assunto_tag, q.habilidade, disciplina].filter(Boolean).map(t => (
                      <span key={t} style={S.tag}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page:      { padding: "20px 16px", maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  header:    { marginBottom: 24 },
  h1:        { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 },
  headerSub: { color: "#64748b", fontSize: 13, marginTop: 4 },
  layout:    { display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "flex-start" },
  formPanel: { position: "sticky" as const, top: 16 },
  card:      { background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 },
  fieldLabel: { fontSize: 12, color: "#64748b", marginBottom: 4, margin: 0 },
  textarea:  { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", lineHeight: 1.6, fontFamily: "inherit", resize: "vertical" as const, outline: "none" },
  input:     { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", fontFamily: "inherit", outline: "none" },
  select:    { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", fontFamily: "inherit", background: "#fff", outline: "none" },
  row3:      { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 },
  btnPrimary: { width: "100%", padding: "13px 0", background: "#4f6ef7", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  styleButtons: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" },
  btnStyle:  { padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer", fontFamily: "inherit" },
  btnSalvar: { padding: "8px 14px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const },
  erro:      { color: "#ef4444", fontSize: 12, marginTop: 8, background: "#fef2f2", padding: "8px 12px", borderRadius: 8 },
  sucesso:   { color: "#15803d", fontSize: 12, marginTop: 8, background: "#f0fdf4", padding: "8px 12px", borderRadius: 8 },
  analiseRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f8fafc" },
  analiseLabel: { fontSize: 12, color: "#64748b" },
  analiseValor: { fontSize: 12, color: "#0f172a", fontWeight: 500, textAlign: "right" as const, maxWidth: "60%" },
  resultsPanel: { minHeight: 400 },
  loadingBox: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 60, gap: 12 },
  spinner:   { width: 32, height: 32, borderRadius: "50%", border: "3px solid #f1f5f9", borderTopColor: "#4f6ef7", animation: "spin 0.8s linear infinite" },
  emptyBox:  { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 60, gap: 4, textAlign: "center" as const },
  qCard:     { background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  qHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fafafa" },
  modeloBadge: { fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99 },
  difBadge:  { fontSize: 12, fontWeight: 600 },
  qBody:     { padding: 16 },
  textoBase: { background: "#f8fafc", borderLeft: "3px solid #cbd5e1", padding: "10px 14px", borderRadius: "0 8px 8px 0", marginBottom: 12 },
  textoBaseLabel: { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 4px" },
  textoBaseTexto: { fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0, fontStyle: "italic" as const },
  enunciado: { fontSize: 14, color: "#0f172a", lineHeight: 1.8, marginBottom: 14 },
  alt:       { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", border: "1px solid #f1f5f9", borderRadius: 8 },
  altCorreta: { background: "#f0fdf4", border: "1px solid #86efac" },
  altLetra:  { width: 22, height: 22, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0, color: "#64748b" },
  altLetraCorreta: { background: "#22c55e", color: "#fff" },
  altTexto:  { fontSize: 13, color: "#334155", lineHeight: 1.5 },
  gabaritoBox: { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px" },
  gabaritoLabel: { fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 4px" },
  gabaritoTexto: { fontSize: 13, color: "#166534", lineHeight: 1.6, margin: 0 },
  infoBox:   { background: "#f8fafc", borderRadius: 8, padding: "10px 14px" },
  infoLabel: { fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 4px" },
  infoTexto: { fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 },
  tagsRow:   { display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f8fafc" },
  tag:       { fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" },
};
