// src/components/trilha/TrilhaBase.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";
import MapaMental from "@/components/MapaMental";
import ModalUnidade from "@/components/trilha/ModalUnidade";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Unidade {
  id: string;
  numero: number;
  titulo: string;
  emoji: string;
  cor: string;
  bg: string;
  topic: string | null;
  topicos: string[];
  xp: number;
  area_enem?: string;
  competencia?: string;
  habilidade?: string;
}

export interface TrilhaConfig {
  materia: string;         // "fisica", "quimica", etc.
  titulo: string;          // "Trilha de Física"
  emoji: string;           // "⚡"
  subtitulo?: string;      // texto extra no header (ex: "· História · Geografia")
  corVest: (vest: string) => string;
  mapaMentalTitulo: string;
  unidades: Unidade[];
}

// ── Tipos do Simulado Final ───────────────────────────────────────────────────

interface QuestaoFinal {
  id: string;
  enunciado: string;
  texto_base?: string;
  explicacao: string;
  assunto_tag: string;
  alternativas: { id: string; letra: string; texto: string; correta: boolean }[];
  fonte: "mini_simulado" | "questions";
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function TrilhaBase({ config }: { config: TrilhaConfig }) {
  const { vestibular = "ENEM" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const vestUpper = vestibular.toUpperCase();
  const corVest = config.corVest(vestUpper);
  const UNIDADES = config.unidades;

  // ── Estado principal ──────────────────────────────────────────────────────
  const [progresso, setProgresso] = useState<Record<string, any>>({});
  const [unidadeAberta, setUnidadeAberta] = useState<Unidade | null>(null);
  const [mapaMentalAberto, setMapaMentalAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState<{ id: string; titulo: string; descricao: string; tipo: string; url: string; topic: string | null }[]>([]);

  // ── Estado simulado final ─────────────────────────────────────────────────
  const [mostrarBannerSimulado, setMostrarBannerSimulado] = useState(false);
  const [simuladoFinalAtivo, setSimuladoFinalAtivo] = useState(false);
  const [questoesFinal, setQuestoesFinal] = useState<QuestaoFinal[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [simResposta, setSimResposta] = useState<string | null>(null);
  const [simCorreta, setSimCorreta] = useState<boolean | null>(null);
  const [simMostrouFeedback, setSimMostrouFeedback] = useState(false);
  const [simAcertos, setSimAcertos] = useState(0);
  const [simFinalizado, setSimFinalizado] = useState(false);
  const [simTempo, setSimTempo] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { if (user?.id) carregarProgresso(); }, [user?.id]);

  // Timer do simulado final
  useEffect(() => {
    if (simuladoFinalAtivo && !simFinalizado) {
      timerRef.current = setInterval(() => setSimTempo(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [simuladoFinalAtivo, simFinalizado]);

  async function carregarProgresso() {
    const [{ data: prog }, { data: mats }] = await Promise.all([
      supabase.from("trilha_progresso").select("unidade_id, status, xp_ganho")
        .eq("user_id", user!.id).eq("vestibular", vestUpper).eq("materia", config.materia),
      supabase.from("materiais").select("id,titulo,descricao,tipo,url,topic")
        .eq("vestibular", vestUpper).eq("materia", config.materia)
        .eq("ativo", true).order("criado_em", { ascending: false }),
    ]);
    const map: Record<string, any> = {};
    prog?.forEach(p => { map[p.unidade_id] = p; });
    setProgresso(map);
    setMateriais(mats ?? []);
    setLoading(false);
  }

  async function concluirUnidade(unidadeId: string, xp: number) {
    if (!user?.id) return;
    await supabase.from("trilha_progresso").upsert({
      user_id: user.id, vestibular: vestUpper, materia: config.materia,
      unidade_id: unidadeId, status: "concluido", xp_ganho: xp,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "user_id,vestibular,materia,unidade_id" });

    const novoProgresso = { ...progresso, [unidadeId]: { status: "concluido", xp_ganho: xp } };
    setProgresso(novoProgresso);
    // Não fecha o modal aqui — o ModalUnidade controla seu próprio fechamento via onClose

    // Verifica se concluiu todas as unidades
    const totalConcluidas = Object.values(novoProgresso).filter((p: any) => p.status === "concluido").length;
    if (totalConcluidas === UNIDADES.length) {
      setMostrarBannerSimulado(true);
    }
  }

  const totalXP = Object.values(progresso).reduce((acc: number, p: any) => acc + (p.xp_ganho ?? 0), 0);
  const concluidas = Object.values(progresso).filter((p: any) => p.status === "concluido").length;
  const pct = Math.round((concluidas / UNIDADES.length) * 100);

  // Também mostra banner se já estava 100% ao carregar
  useEffect(() => {
    if (!loading && pct === 100) setMostrarBannerSimulado(true);
  }, [loading, pct]);

  // ── Lógica do Simulado Final ──────────────────────────────────────────────

  async function iniciarSimuladoFinal() {
    setSimLoading(true);
    setSimIdx(0); setSimAcertos(0); setSimResposta(null);
    setSimCorreta(null); setSimMostrouFeedback(false);
    setSimFinalizado(false); setSimTempo(0);

    const unidadesConcluidas = UNIDADES.filter(u => progresso[u.id]?.status === "concluido");
    const todasQuestoes: QuestaoFinal[] = [];

    await Promise.all(unidadesConcluidas.map(async (u) => {
      // Fonte 1: questoes_simulado via mini_simulados
      const { data: miniSim } = await supabase
        .from("mini_simulados")
        .select("id")
        .eq("trilha_id", u.id)
        .eq("ativo", true)
        .limit(1)
        .single();

      if (miniSim?.id) {
        const { data: qs } = await supabase
          .from("questoes_simulado")
          .select(`id, enunciado, texto_base, explicacao, assunto_tag, dificuldade,
            alternativas_simulado(id, letra, texto, correta)`)
          .eq("simulado_id", miniSim.id)
          .eq("ativa", true)
          .order("ordem")
          .limit(2);

        if (qs?.length) {
          qs.forEach((q: any) => {
            todasQuestoes.push({
              id: q.id,
              enunciado: q.enunciado,
              texto_base: q.texto_base,
              explicacao: q.explicacao,
              assunto_tag: q.assunto_tag ?? u.titulo,
              alternativas: (q.alternativas_simulado ?? []).sort((a: any, b: any) =>
                a.letra.localeCompare(b.letra)
              ),
              fonte: "mini_simulado",
            });
          });
          return; // já tem questões do mini-simulado, não precisa da outra fonte
        }
      }

      // Fonte 2: tabela questions (fallback)
      if (u.topic) {
        const { data: qs2 } = await supabase
          .from("questions")
          .select("id, question, explanation, answer_index")
          .eq("vestibular", vestUpper)
          .eq("topic", u.topic)
          .limit(2);

        if (qs2?.length) {
          // Busca opções
          const { data: ops } = await supabase
            .from("question_options")
            .select("question_id, option_index, label")
            .in("question_id", qs2.map((q: any) => q.id));

          const opMap: Record<string, any[]> = {};
          ops?.forEach((op: any) => {
            if (!opMap[op.question_id]) opMap[op.question_id] = [];
            opMap[op.question_id][op.option_index] = op;
          });

          qs2.forEach((q: any) => {
            const letras = ["A", "B", "C", "D", "E"];
            const alts = (opMap[q.id] ?? []).map((op: any, i: number) => ({
              id: `${q.id}_${i}`,
              letra: letras[i],
              texto: op.label,
              correta: i === q.answer_index,
            }));
            todasQuestoes.push({
              id: q.id,
              enunciado: q.question,
              explicacao: q.explanation,
              assunto_tag: u.titulo,
              alternativas: alts,
              fonte: "questions",
            });
          });
        }
      }
    }));

    // Embaralha
    const embaralhadas = todasQuestoes.sort(() => Math.random() - 0.5);
    setSimLoading(false);

    if (embaralhadas.length === 0) {
      alert("Não há questões disponíveis para as unidades concluídas ainda.");
      return;
    }

    setQuestoesFinal(embaralhadas);
    setSimuladoFinalAtivo(true);
    setMostrarBannerSimulado(false);
  }

  function responderSimulado(altId: string) {
    if (simMostrouFeedback) return;
    const q = questoesFinal[simIdx];
    const alt = q.alternativas.find(a => a.id === altId);
    const correta = alt?.correta ?? false;
    setSimResposta(altId);
    setSimCorreta(correta);
    if (correta) setSimAcertos(a => a + 1);
    setSimMostrouFeedback(true);
  }

  function proximaSimulado() {
    if (simIdx + 1 >= questoesFinal.length) {
      setSimFinalizado(true);
    } else {
      setSimIdx(i => i + 1);
      setSimResposta(null);
      setSimCorreta(null);
      setSimMostrouFeedback(false);
    }
  }

  function formatTempo(s: number) {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

  const simPct = questoesFinal.length > 0 ? Math.round((simAcertos / questoesFinal.length) * 100) : 0;

  // ── Render: Simulado Final ────────────────────────────────────────────────

  if (simuladoFinalAtivo) {
    if (simFinalizado) {
      return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
          <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}dd)`, padding: "16px 16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => { setSimuladoFinalAtivo(false); setMostrarBannerSimulado(true); }}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
              </button>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>🏆 Resultado Final</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px 90px", textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>
              {simPct === 100 ? "🏆" : simPct >= 70 ? "🎯" : simPct >= 50 ? "👍" : "💪"}
            </div>
            <p style={{ fontSize: 32, fontWeight: 800, color: CORES.text, margin: "0 0 4px" }}>
              {simAcertos}/{questoesFinal.length}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: simPct >= 70 ? "#22c55e" : simPct >= 50 ? "#f59e0b" : "#ef4444", margin: "0 0 4px" }}>
              {simPct >= 70 ? "Excelente domínio!" : simPct >= 50 ? "Bom trabalho!" : "Continue praticando!"}
            </p>
            <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 24px" }}>{simPct}% de aproveitamento</p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: CORES.text, margin: 0 }}>⏱ {formatTempo(simTempo)}</p>
                <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>Tempo total</p>
              </div>
              <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5", margin: 0 }}>📝 {questoesFinal.length}</p>
                <p style={{ fontSize: 11, color: "#6366f1", margin: 0 }}>Questões</p>
              </div>
            </div>

            <button onClick={() => { setSimuladoFinalAtivo(false); setMostrarBannerSimulado(false); }}
              style={{ width: "100%", padding: "14px 0", background: corVest, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
              Voltar para a trilha →
            </button>
            <button onClick={iniciarSimuladoFinal}
              style={{ width: "100%", padding: "12px 0", background: "#f8fafc", color: corVest, border: `1.5px solid ${corVest}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Tentar novamente
            </button>
          </div>
          <BottomNav />
        </div>
      );
    }

    const q = questoesFinal[simIdx];

    if (!q) return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg, alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Carregando questão...</p>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
        {/* Header simulado */}
        <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}dd)`, padding: "14px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button onClick={() => { setSimuladoFinalAtivo(false); setMostrarBannerSimulado(true); }}
              style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>🎓 Simulado Final — {config.titulo.replace("Trilha de ", "")}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Questão {simIdx + 1} de {questoesFinal.length}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>⏱ {formatTempo(simTempo)}</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 99 }}>
            <div style={{ height: "100%", width: `${((simIdx) / questoesFinal.length) * 100}%`, background: "rgba(255,255,255,0.9)", borderRadius: 99, transition: "width 0.4s" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>
          {/* Tag assunto */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 99, background: `${corVest}15`, color: corVest, fontWeight: 700 }}>
              {q.assunto_tag}
            </span>
          </div>

          {/* Texto base */}
          {q.texto_base && (
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>📄 Texto de apoio</p>
              <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>{q.texto_base}</p>
            </div>
          )}

          {/* Enunciado */}
          <div style={{ background: CORES.bgCard, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${corVest}15` }}>
            <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.75, margin: 0, fontFamily: "Georgia, serif" }}>{q.enunciado}</p>
          </div>

          {/* Alternativas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {q.alternativas.map(alt => {
              const selecionada = simResposta === alt.id;
              let bg = CORES.bgCard, border = `1px solid ${CORES.border}`, cor = CORES.text;
              if (simMostrouFeedback && selecionada) {
                if (simCorreta) { bg = "#EDFAF3"; border = "1.5px solid #22c55e"; cor = "#22c55e"; }
                else { bg = "#FFF1F1"; border = "1.5px solid #ef4444"; cor = "#ef4444"; }
              }
              if (simMostrouFeedback && alt.correta && !selecionada) {
                bg = "#EDFAF3"; border = "1.5px solid #22c55e"; cor = "#22c55e";
              }
              return (
                <button key={alt.id} onClick={() => responderSimulado(alt.id)} disabled={simMostrouFeedback}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", borderRadius: 10, border, background: bg, cursor: simMostrouFeedback ? "default" : "pointer", textAlign: "left" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: selecionada ? corVest : "#e5e7eb", color: selecionada ? "#fff" : "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{alt.letra}</span>
                  <span style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{alt.texto}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {simMostrouFeedback && (
            <div>
              <div style={{ background: simCorreta ? "#EDFAF3" : "#FFF1F1", border: `1px solid ${simCorreta ? "#22c55e" : "#ef4444"}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: simCorreta ? "#22c55e" : "#ef4444", margin: "0 0 4px" }}>
                  {simCorreta ? "✅ Correto!" : "❌ Incorreto"}
                </p>
                {q.explicacao && <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.6 }}>{q.explicacao}</p>}
              </div>
              <button onClick={proximaSimulado}
                style={{ width: "100%", padding: "13px 0", background: corVest, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {simIdx + 1 >= questoesFinal.length ? "Ver resultado 🎉" : "Próxima →"}
              </button>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Render: Trilha Normal ─────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>

      {mapaMentalAberto && (
        <MapaMental
          unidades={UNIDADES}
          titulo={config.mapaMentalTitulo}
          onClose={() => setMapaMentalAberto(false)}
          onSelecionarUnidade={(id) => { const u = UNIDADES.find(u => u.id === id); if (u) setUnidadeAberta(u); }}
          progresso={progresso}
        />
      )}

      {unidadeAberta && (
        <ModalUnidade
          unidade={unidadeAberta}
          vestibular={vestUpper}
          materia={config.materia}
          onClose={() => setUnidadeAberta(null)}
          onConcluir={() => concluirUnidade(unidadeAberta.id, unidadeAberta.xp)}
        />
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}dd)`, padding: "16px 16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{config.emoji} {config.titulo}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{vestUpper}{config.subtitulo ? ` · ${config.subtitulo}` : ""}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>⚡ {totalXP} XP</p>
            <button onClick={() => setMapaMentalAberto(true)} style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 99, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>
              🗺️ Mapa Mental
            </button>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Progresso geral</span>
            <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #fbbf24, #f59e0b)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* Banner Simulado Final */}
        {mostrarBannerSimulado && (
          <div style={{
            background: `linear-gradient(135deg, ${corVest}15, ${corVest}08)`,
            border: `2px solid ${corVest}44`,
            borderRadius: 16, padding: 18, marginBottom: 20,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `${corVest}15` }} />
            <p style={{ fontSize: 18, margin: "0 0 4px" }}>🎓</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: corVest, margin: "0 0 6px" }}>
              Trilha concluída! Parabéns!
            </p>
            <p style={{ fontSize: 12, color: CORES.textSub, margin: "0 0 14px", lineHeight: 1.5 }}>
              Você concluiu todas as {UNIDADES.length} unidades. Quer fazer um simulado final com{" "}
              <strong>{concluidas * 2} questões</strong> cobrindo toda a trilha?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={iniciarSimuladoFinal}
                disabled={simLoading}
                style={{ flex: 1, padding: "11px 0", background: corVest, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: simLoading ? 0.7 : 1 }}>
                {simLoading ? "Preparando..." : "Fazer simulado →"}
              </button>
              <button
                onClick={() => setMostrarBannerSimulado(false)}
                style={{ padding: "11px 16px", background: "transparent", color: CORES.textSub, border: `1px solid ${CORES.border}`, borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
                Agora não
              </button>
            </div>
          </div>
        )}

        {/* Lista de unidades */}
        {loading ? <p style={{ textAlign: "center", color: CORES.textSub, padding: 32 }}>Carregando...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {UNIDADES.map((u, i) => {
              const prog = progresso[u.id];
              const concluida = prog?.status === "concluido";
              const anterior = i === 0 || progresso[UNIDADES[i - 1].id]?.status === "concluido";
              const bloqueada = !anterior && !concluida;
              return (
                <button key={u.id} onClick={() => !bloqueada && setUnidadeAberta(u)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, background: bloqueada ? "#f9fafb" : concluida ? u.bg : CORES.bgCard, border: concluida ? `2px solid ${u.cor}44` : bloqueada ? "1.5px solid #e5e7eb" : `1.5px solid ${u.cor}22`, cursor: bloqueada ? "not-allowed" : "pointer", textAlign: "left", boxShadow: concluida ? `0 2px 12px ${u.cor}20` : "0 1px 4px rgba(0,0,0,0.06)", opacity: bloqueada ? 0.6 : 1 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: bloqueada ? "#f3f4f6" : u.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: `1.5px solid ${bloqueada ? "#e5e7eb" : u.cor + "33"}`, position: "relative" }}>
                    {bloqueada ? "🔒" : u.emoji}
                    {concluida && <div style={{ position: "absolute", bottom: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", border: "2px solid #fff" }}>✓</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: bloqueada ? "#9ca3af" : u.cor, background: bloqueada ? "#f3f4f6" : u.bg, borderRadius: 4, padding: "1px 6px" }}>U{u.numero}</span>
                      {concluida && <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>+{u.xp} XP ✓</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: bloqueada ? "#9ca3af" : CORES.text, margin: "0 0 3px" }}>{u.titulo}</p>
                    <p style={{ fontSize: 11, color: CORES.textSub, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.topicos.slice(0, 2).join(" · ")}</p>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {u.topic ? <span style={{ fontSize: 10, color: bloqueada ? "#9ca3af" : u.cor, fontWeight: 600 }}>📝 questões</span> : <span style={{ fontSize: 10, color: "#9ca3af" }}>teoria</span>}
                    {!bloqueada && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={u.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Botão simulado final se já concluiu e fechou o banner */}
        {!mostrarBannerSimulado && pct === 100 && (
          <button
            onClick={() => setMostrarBannerSimulado(true)}
            style={{ width: "100%", marginTop: 16, padding: "13px 0", background: `${corVest}15`, color: corVest, border: `1.5px solid ${corVest}44`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            🎓 Fazer simulado final da trilha
          </button>
        )}

        {/* Materiais */}
        {materiais.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 10px" }}>
              Materiais {vestUpper}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {materiais.map(m => {
                const icone = m.tipo === "pdf" ? "📄" : m.tipo === "video" ? "🎥" : m.tipo === "ppt" ? "📊" : m.tipo === "excel" ? "📗" : "📦";
                return (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: CORES.bgCard, border: "1px solid " + CORES.border, textDecoration: "none" }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: CORES.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.titulo}</p>
                      {m.descricao && <p style={{ fontSize: 11, color: CORES.textSub, margin: "2px 0 0" }}>{m.descricao}</p>}
                      {m.topic && <span style={{ fontSize: 10, color: corVest, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{m.topic}</span>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={CORES.textSub} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
