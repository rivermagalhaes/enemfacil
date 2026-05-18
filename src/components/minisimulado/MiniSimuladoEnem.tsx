// src/components/MiniSimulado/MiniSimuladoEnem.tsx
// Módulo de Mini Simulados adaptado para o EnemPop
// Diferenças do CFfácil: 5 alternativas (A-E), texto_base, área ENEM, mapa por área

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Alternativa {
  id: string;
  letra: string;
  texto: string;
}

interface Questao {
  id: string;
  enunciado: string;
  texto_base?: string;
  explicacao: string;
  assunto_tag: string;
  competencia?: string;
  habilidade?: string;
  area_enem: string;
  dificuldade: "facil" | "medio" | "dificil";
  alternativas: Alternativa[];
}

interface SimuladoData {
  simulado: { id: string; titulo: string };
  questoes: Questao[];
}

interface RespostaLocal {
  questao_id: string;
  alternativa_id: string;
  correta: boolean;
  tempo_ms: number;
}

interface Resultado {
  acertos: number;
  total: number;
  percentual: number;
  nivel: "dominio" | "bom" | "regular" | "revisar";
  xp_ganho: number;
  area_enem: string;
}

type Fase = "conclusao" | "carregando" | "simulado" | "resultado";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
export const AREAS_ENEM = {
  linguagens:        { label: "Linguagens",       emoji: "📝", cor: "#8b5cf6" },
  matematica:        { label: "Matemática",        emoji: "📐", cor: "#3b82f6" },
  ciencias_natureza: { label: "Ciências da Natureza", emoji: "🔬", cor: "#10b981" },
  ciencias_humanas:  { label: "Ciências Humanas",  emoji: "🌍", cor: "#f59e0b" },
  redacao:           { label: "Redação",           emoji: "✍️", cor: "#ec4899" },
};

const NIVEL_CONFIG = {
  dominio:  { label: "Domínio Total",    cor: "#22c55e", emoji: "🏆", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)" },
  bom:      { label: "Bom Domínio",     cor: "#84cc16", emoji: "🎯", bg: "rgba(132,204,22,0.08)", border: "rgba(132,204,22,0.25)" },
  regular:  { label: "Em Evolução",     cor: "#f59e0b", emoji: "📈", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  revisar:  { label: "Precisa Revisar", cor: "#ef4444", emoji: "📚", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)" },
};

function formatTempo(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── HOOK PRINCIPAL ───────────────────────────────────────────────────────────
function useMiniSimuladoEnem(trilhaId: string) {
  const [fase, setFase] = useState<Fase>("conclusao");
  const [simuladoData, setSimuladoData] = useState<SimuladoData | null>(null);
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [respostas, setRespostas] = useState<RespostaLocal[]>([]);
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [tentativaId, setTentativaId] = useState<string | null>(null);
  const [tempoTotal, setTempoTotal] = useState(0);
  const [streakAtual, setStreakAtual] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inicioQuestaoRef = useRef<number>(Date.now());

  useEffect(() => {
    if (fase === "simulado") {
      timerRef.current = setInterval(() => setTempoTotal((t) => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fase]);

  const carregarSimulado = useCallback(async () => {
    setFase("carregando");
    setErro(null);
    setRespostas([]);
    setQuestaoAtual(0);

    try {
      const { data, error } = await supabase.rpc("get_simulado_completo", {
        p_trilha_id: trilhaId,
      });

      if (error) throw error;
      if (!data) throw new Error("Simulado não encontrado");

      // Fallback IA se questões insuficientes
      if ((data.questoes ?? []).length < 5) {
        const { data: trilha } = await supabase
          .from("trilhas")
          .select("area_enem, titulo, competencia, habilidade")
          .eq("id", trilhaId)
          .single();

        await supabase.functions.invoke("gerar-questoes-enem", {
          body: {
            trilha_id:   trilhaId,
            area_enem:   trilha?.area_enem ?? "ciencias_humanas",
            assunto:     trilha?.titulo ?? "Conteúdo ENEM",
            competencia: trilha?.competencia,
            habilidade:  trilha?.habilidade,
          },
        });

        // Recarrega
        const { data: data2, error: err2 } = await supabase.rpc(
          "get_simulado_completo",
          { p_trilha_id: trilhaId }
        );
        if (err2) throw err2;
        setSimuladoData(data2);
      } else {
        setSimuladoData(data);
      }

      // Inicia tentativa
      const { data: tentId, error: tentErr } = await supabase.rpc(
        "iniciar_tentativa_simulado",
        { p_simulado_id: data.simulado.id }
      );
      if (tentErr) throw tentErr;
      setTentativaId(tentId);

      // Carrega streak
      const { data: { user } } = await supabase.auth.getUser();
      const { data: gamif } = await supabase
        .from("gamificacao_usuario")
        .select("streak_dias")
        .eq("user_id", user?.id)
        .single();
      setStreakAtual(gamif?.streak_dias ?? 0);

      setTempoTotal(0);
      setFase("simulado");
    } catch (e: any) {
      setErro(e.message ?? "Erro ao carregar simulado");
      setFase("conclusao");
    }
  }, [trilhaId]);

  const responder = useCallback(
    async (alternativaId: string) => {
      if (mostrarFeedback || !simuladoData || !tentativaId) return;

      const questao = simuladoData.questoes[questaoAtual];
      const tempoMs = Date.now() - inicioQuestaoRef.current;

      const { data: alt } = await supabase
        .from("alternativas_simulado")
        .select("correta")
        .eq("id", alternativaId)
        .single();

      const correta = alt?.correta ?? false;

      await supabase.from("respostas_simulado").insert({
        tentativa_id:   tentativaId,
        questao_id:     questao.id,
        alternativa_id: alternativaId,
        correta,
        tempo_ms:       tempoMs,
      });

      setRespostaSelecionada(alternativaId);
      setRespostas((prev) => [...prev, { questao_id: questao.id, alternativa_id: alternativaId, correta, tempo_ms: tempoMs }]);
      setMostrarFeedback(true);
    },
    [mostrarFeedback, simuladoData, questaoAtual, tentativaId]
  );

  const proximaQuestao = useCallback(async () => {
    if (!simuladoData) return;
    const isUltima = questaoAtual >= simuladoData.questoes.length - 1;

    if (isUltima) {
      const { data: res, error } = await supabase.rpc("finalizar_tentativa_simulado", {
        p_tentativa_id:   tentativaId,
        p_tempo_segundos: tempoTotal,
      });
      if (!error && res) setResultado(res);
      setFase("resultado");
    } else {
      inicioQuestaoRef.current = Date.now();
      setQuestaoAtual((q) => q + 1);
      setRespostaSelecionada(null);
      setMostrarFeedback(false);
    }
  }, [simuladoData, questaoAtual, tentativaId, tempoTotal]);

  return {
    fase, simuladoData, questaoAtual, respostas,
    respostaSelecionada, mostrarFeedback, resultado,
    tempoTotal, streakAtual, erro,
    carregarSimulado, responder, proximaQuestao,
  };
}

// ─── TELA 1: CONCLUSÃO ────────────────────────────────────────────────────────
function TelaConclusao({
  trilhaTitulo,
  areaTrilha,
  onIniciar,
  erro,
}: {
  trilhaTitulo: string;
  areaTrilha?: string;
  onIniciar: () => void;
  erro: string | null;
}) {
  const area = areaTrilha ? AREAS_ENEM[areaTrilha as keyof typeof AREAS_ENEM] : null;

  return (
    <div style={S.col}>
      <div style={{ ...S.successRing, borderColor: area?.cor ?? "#22c55e", boxShadow: `0 0 32px ${area?.cor ?? "#22c55e"}33` }}>
        <span style={{ fontSize: 44 }}>✅</span>
      </div>
      <h2 style={S.h2}>Trilha Concluída!</h2>
      {area && (
        <span style={{ ...S.areaChip, background: area.cor + "22", color: area.cor, border: `1px solid ${area.cor}44` }}>
          {area.emoji} {area.label}
        </span>
      )}
      <p style={S.subtitle}>{trilhaTitulo}</p>

      <div style={S.divider} />

      <div style={S.promo}>
        <span style={{ fontSize: 28 }}>🎯</span>
        <div>
          <p style={S.promoTitle}>Mini Simulado ENEM Liberado</p>
          <p style={S.promoSub}>
            Teste seus conhecimentos com <strong style={{ color: "#f1f5f9" }}>5 questões no estilo ENEM</strong> sobre este conteúdo.
          </p>
        </div>
      </div>

      {erro && <p style={S.erro}>{erro}</p>}
      <button style={S.btnPrimary} onClick={onIniciar}>Iniciar Mini Simulado →</button>
      <button style={S.btnGhost}>Fazer depois</button>
    </div>
  );
}

// ─── TELA 2: QUESTÃO ──────────────────────────────────────────────────────────
function TelaQuestao({
  questao,
  questaoAtual,
  totalQuestoes,
  respostaSelecionada,
  mostrarFeedback,
  respostas,
  onResponder,
  onProxima,
}: {
  questao: Questao;
  questaoAtual: number;
  totalQuestoes: number;
  respostaSelecionada: string | null;
  mostrarFeedback: boolean;
  respostas: RespostaLocal[];
  onResponder: (id: string) => void;
  onProxima: () => void;
}) {
  const [tempo, setTempo] = useState(0);
  const area = AREAS_ENEM[questao.area_enem as keyof typeof AREAS_ENEM];
  const ultimaResposta = respostas[respostas.length - 1];

  useEffect(() => {
    if (mostrarFeedback) return;
    setTempo(0);
    const t = setInterval(() => setTempo((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [questaoAtual, mostrarFeedback]);

  const progresso = (questaoAtual / totalQuestoes) * 100;

  function altStyle(alt: Alternativa): React.CSSProperties {
    if (!mostrarFeedback) {
      return alt.id === respostaSelecionada
        ? { ...S.alt, background: "#1e3a5f", borderColor: "#4f6ef7" }
        : S.alt;
    }
    if (ultimaResposta?.correta && alt.id === respostaSelecionada) {
      return { ...S.alt, background: "rgba(34,197,94,0.08)", borderColor: "#22c55e" };
    }
    if (!ultimaResposta?.correta && alt.id === respostaSelecionada) {
      return { ...S.alt, background: "rgba(239,68,68,0.08)", borderColor: "#ef4444" };
    }
    return { ...S.alt, opacity: 0.5 };
  }

  return (
    <div style={S.col}>
      {/* Header */}
      <div style={S.row}>
        <div style={S.col} >
          <span style={S.qCount}>Questão {questaoAtual + 1}<span style={{ color: "#475569" }}>/5</span></span>
          {area && (
            <span style={{ ...S.areaChip, background: area.cor + "22", color: area.cor, border: `1px solid ${area.cor}44`, fontSize: 10 }}>
              {area.emoji} {area.label}
            </span>
          )}
        </div>
        <span style={S.qTimer}>⏱ {formatTempo(tempo)}</span>
      </div>

      {/* Progresso */}
      <div style={S.progressBar}>
        <div style={{ ...S.progressFill, width: `${progresso}%`, background: area?.cor ?? "#4f6ef7" }} />
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={tagDifStyle(questao.dificuldade)}>{questao.dificuldade}</span>
        {questao.assunto_tag && <span style={S.tagAssunto}>{questao.assunto_tag}</span>}
        {questao.habilidade && <span style={S.tagHab}>{questao.habilidade}</span>}
      </div>

      {/* Texto base (apoio) */}
      {questao.texto_base && (
        <div style={S.textoBase}>
          <p style={S.textoBaseLabel}>📄 Texto de apoio</p>
          <p style={S.textoBaseConteudo}>{questao.texto_base}</p>
        </div>
      )}

      {/* Enunciado */}
      <p style={S.enunciado}>{questao.enunciado}</p>

      {/* Alternativas A-E */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        {questao.alternativas.map((alt) => (
          <button
            key={alt.id}
            style={altStyle(alt)}
            onClick={() => !mostrarFeedback && onResponder(alt.id)}
            disabled={mostrarFeedback}
          >
            <span style={{
              ...S.altLetra,
              color: mostrarFeedback && ultimaResposta?.correta && alt.id === respostaSelecionada ? "#22c55e"
                   : mostrarFeedback && !ultimaResposta?.correta && alt.id === respostaSelecionada ? "#ef4444"
                   : "#94a3b8",
            }}>
              {alt.letra}
            </span>
            <span style={S.altTexto}>{alt.texto}</span>
            {mostrarFeedback && ultimaResposta?.correta && alt.id === respostaSelecionada && (
              <span style={{ marginLeft: "auto", color: "#22c55e", fontWeight: 700 }}>✓</span>
            )}
            {mostrarFeedback && !ultimaResposta?.correta && alt.id === respostaSelecionada && (
              <span style={{ marginLeft: "auto", color: "#ef4444", fontWeight: 700 }}>✗</span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {mostrarFeedback && (
        <div style={{
          ...S.feedback,
          borderColor: ultimaResposta?.correta ? "#22c55e" : "#ef4444",
          background: ultimaResposta?.correta ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
        }}>
          <p style={{ ...S.feedbackTit, color: ultimaResposta?.correta ? "#22c55e" : "#ef4444" }}>
            {ultimaResposta?.correta ? "✅ Correto!" : "❌ Incorreto"}
          </p>
          {questao.explicacao && <p style={S.feedbackExp}>{questao.explicacao}</p>}
          <button style={{ ...S.btnProxima, background: area?.cor ?? "#4f6ef7" }} onClick={onProxima}>
            {questaoAtual + 1 >= totalQuestoes ? "Ver Resultado →" : "Próxima →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TELA 3: RESULTADO ────────────────────────────────────────────────────────
function TelaResultado({
  resultado,
  tempoTotal,
  streakAtual,
  questoes,
  respostas,
  onReiniciar,
  onFechar,
}: {
  resultado: Resultado;
  tempoTotal: number;
  streakAtual: number;
  questoes: Questao[];
  respostas: RespostaLocal[];
  onReiniciar: () => void;
  onFechar: () => void;
}) {
  const cfg = NIVEL_CONFIG[resultado.nivel];
  const area = AREAS_ENEM[resultado.area_enem as keyof typeof AREAS_ENEM];
  const [xpAnim, setXpAnim] = useState(0);

  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 3;
      if (n >= resultado.xp_ganho) { setXpAnim(resultado.xp_ganho); clearInterval(t); }
      else setXpAnim(n);
    }, 20);
    return () => clearInterval(t);
  }, [resultado.xp_ganho]);

  const erros = respostas
    .filter((r) => !r.correta)
    .map((r) => questoes.find((q) => q.id === r.questao_id)?.assunto_tag)
    .filter(Boolean) as string[];
  const errosUnicos = [...new Set(erros)];

  return (
    <div style={S.col}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>{cfg.emoji}</div>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 2 }}>resultado</div>
      </div>

      {area && (
        <span style={{ ...S.areaChip, background: area.cor + "22", color: area.cor, border: `1px solid ${area.cor}44`, alignSelf: "center" }}>
          {area.emoji} {area.label}
        </span>
      )}

      <div style={{ ...S.placar, background: cfg.bg, borderColor: cfg.border }}>
        <p style={{ ...S.placarNum, color: cfg.cor }}>
          {resultado.acertos}<span style={{ fontSize: 24, color: "#475569" }}>/5</span>
        </p>
        <p style={{ ...S.placarLabel, color: cfg.cor }}>{cfg.label}</p>
        <div style={S.placarBar}>
          <div style={{ ...S.placarBarFill, width: `${resultado.percentual}%`, background: cfg.cor }} />
        </div>
        <p style={S.placarPct}>{resultado.percentual}% de aproveitamento</p>
      </div>

      <div style={S.metricas}>
        <div style={S.metItem}>
          <span style={S.metVal}>⏱ {formatTempo(tempoTotal)}</span>
          <span style={S.metLbl}>Tempo</span>
        </div>
        <div style={{ ...S.metItem, borderColor: "#4f6ef7" }}>
          <span style={{ ...S.metVal, color: "#818cf8" }}>⚡ +{xpAnim} XP</span>
          <span style={S.metLbl}>XP Ganho</span>
        </div>
        {streakAtual > 1 && (
          <div style={S.metItem}>
            <span style={S.metVal}>🔥 {streakAtual}d</span>
            <span style={S.metLbl}>Sequência</span>
          </div>
        )}
      </div>

      {errosUnicos.length > 0 && (
        <div style={S.revisao}>
          <p style={S.revisaoTit}>📚 Revise estes tópicos:</p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {errosUnicos.map((t) => (
              <span key={t} style={S.revisaoTag}>{t}</span>
            ))}
          </div>
        </div>
      )}

      <button style={S.btnPrimary} onClick={onFechar}>Continuar →</button>
      <button style={S.btnGhost} onClick={onReiniciar}>Tentar novamente</button>
    </div>
  );
}

// ─── MAPA DE DOMÍNIO POR ÁREA ─────────────────────────────────────────────────
export function MapaDominioEnem({ userId }: { userId: string }) {
  const [mapa, setMapa] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("mapa_dominio")
      .select("status, melhor_percentual, area_enem, trilhas(titulo, icone)")
      .eq("user_id", userId)
      .then(({ data }: { data: any[] | null }) => { if (data) setMapa(data); });
  }, [userId]);

  const STATUS_CFG = {
    dominado:     { emoji: "🟢", label: "Dominado",    cor: "#22c55e" },
    evolucao:     { emoji: "🟡", label: "Em evolução", cor: "#f59e0b" },
    revisar:      { emoji: "🔴", label: "Revisar",     cor: "#ef4444" },
    nao_iniciado: { emoji: "⚪", label: "Não iniciado",cor: "#475569" },
  };

  // Agrupa por área
  const porArea = Object.entries(AREAS_ENEM).map(([key, areaCfg]) => {
    const trilhasArea = mapa.filter((m) => m.area_enem === key);
    const dominadas = trilhasArea.filter((m) => m.status === "dominado").length;
    const media = trilhasArea.length
      ? Math.round(trilhasArea.reduce((acc, m) => acc + m.melhor_percentual, 0) / trilhasArea.length)
      : 0;
    return { key, areaCfg, trilhasArea, dominadas, media };
  }).filter((a) => a.trilhasArea.length > 0);

  if (porArea.length === 0) {
    return <p style={{ color: "#475569", textAlign: "center", padding: 32, fontSize: 14 }}>
      Conclua trilhas para ver seu mapa de domínio 🗺️
    </p>;
  }

  return (
    <div>
      <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🗺️ Mapa de Domínio ENEM</h3>
      {porArea.map(({ key, areaCfg, trilhasArea, dominadas, media }) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{areaCfg.emoji}</span>
            <span style={{ color: areaCfg.cor, fontWeight: 700, fontSize: 14 }}>{areaCfg.label}</span>
            <span style={{ marginLeft: "auto", color: "#475569", fontSize: 12 }}>
              {dominadas}/{trilhasArea.length} dominadas · {media}% média
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            {trilhasArea.map((item, i) => {
              const cfg = STATUS_CFG[item.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.nao_iniciado;
              return (
                <div key={i} style={{ ...S.mapaCard, borderColor: cfg.cor + "33" }}>
                  <span style={{ fontSize: 16 }}>{(item.trilhas as any)?.icone ?? "📚"}</span>
                  <p style={{ flex: 1, color: "#cbd5e1", fontSize: 13, margin: 0, fontWeight: 500 }}>
                    {(item.trilhas as any)?.titulo}
                  </p>
                  <span style={{ ...S.mapaPct, color: cfg.cor }}>{item.melhor_percentual}%</span>
                  <span style={{ fontSize: 12 }}>{cfg.emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function MiniSimuladoEnem({
  trilhaId,
  trilhaTitulo,
  areaTrilha,
  onFechar,
}: {
  trilhaId: string;
  trilhaTitulo: string;
  areaTrilha?: string;
  onFechar: () => void;
}) {
  const {
    fase, simuladoData, questaoAtual, respostas,
    respostaSelecionada, mostrarFeedback, resultado,
    tempoTotal, streakAtual, erro,
    carregarSimulado, responder, proximaQuestao,
  } = useMiniSimuladoEnem(trilhaId);

  if (fase === "conclusao") {
    return (
      <div style={S.overlay}>
        <div style={S.card}>
          <TelaConclusao trilhaTitulo={trilhaTitulo} areaTrilha={areaTrilha} onIniciar={carregarSimulado} erro={erro} />
        </div>
      </div>
    );
  }

  if (fase === "carregando") {
    return (
      <div style={S.overlay}>
        <div style={{ ...S.card, alignItems: "center", gap: 12 }}>
          <div style={S.spinner} />
          <p style={S.subtitle}>Preparando seu simulado ENEM...</p>
        </div>
      </div>
    );
  }

  if (fase === "simulado" && simuladoData) {
    return (
      <div style={S.overlay}>
        <div style={{ ...S.card, maxWidth: 560 }}>
          <TelaQuestao
            questao={simuladoData.questoes[questaoAtual]}
            questaoAtual={questaoAtual}
            totalQuestoes={simuladoData.questoes.length}
            respostaSelecionada={respostaSelecionada}
            mostrarFeedback={mostrarFeedback}
            respostas={respostas}
            onResponder={responder}
            onProxima={proximaQuestao}
          />
        </div>
      </div>
    );
  }

  if (fase === "resultado" && resultado && simuladoData) {
    return (
      <div style={S.overlay}>
        <div style={S.card}>
          <TelaResultado
            resultado={resultado}
            tempoTotal={tempoTotal}
            streakAtual={streakAtual}
            questoes={simuladoData.questoes}
            respostas={respostas}
            onReiniciar={carregarSimulado}
            onFechar={onFechar}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
function tagDifStyle(d: string): React.CSSProperties {
  return {
    fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.5px",
    ...(d === "facil"  ? { background: "rgba(34,197,94,0.1)",  color: "#22c55e" } :
        d === "medio"  ? { background: "rgba(245,158,11,0.1)", color: "#f59e0b" } :
                         { background: "rgba(239,68,68,0.1)",  color: "#ef4444" }),
  };
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(8px)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16,
    overflowY: "auto",
  },
  card: {
    background: "#0a1628", border: "1px solid #1e293b",
    borderRadius: 20, padding: "28px 24px",
    width: "100%", maxWidth: 500,
    display: "flex", flexDirection: "column", gap: 14,
    boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
    maxHeight: "90vh", overflowY: "auto",
  },
  col: { display: "flex", flexDirection: "column", gap: 14, width: "100%" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" },
  successRing: {
    width: 80, height: 80, borderRadius: "50%", border: "2px solid",
    display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center",
  },
  areaChip: {
    display: "inline-block", fontSize: 11, padding: "3px 12px",
    borderRadius: 99, fontWeight: 700, letterSpacing: "0.3px",
  },
  h2: { color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: 0, textAlign: "center" },
  subtitle: { color: "#64748b", textAlign: "center", margin: 0, fontSize: 13 },
  divider: { height: 1, background: "#1e293b" },
  promo: {
    display: "flex", gap: 14, alignItems: "flex-start",
    background: "#0d1f38", border: "1px solid #1e3a5f",
    borderRadius: 14, padding: "14px 16px",
  },
  promoTitle: { color: "#e2e8f0", fontWeight: 700, margin: 0, fontSize: 14 },
  promoSub: { color: "#64748b", margin: "4px 0 0", fontSize: 12, lineHeight: 1.6 },
  erro: { color: "#ef4444", fontSize: 12, background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: 8, textAlign: "center" },
  btnPrimary: {
    width: "100%", background: "linear-gradient(135deg, #4f6ef7, #6366f1)",
    color: "#fff", border: "none", borderRadius: 12,
    padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", boxShadow: "0 4px 20px rgba(79,110,247,0.3)",
  },
  btnGhost: {
    background: "transparent", color: "#475569", border: "none",
    padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  qCount: { color: "#f1f5f9", fontWeight: 700, fontSize: 15 },
  qTimer: { color: "#475569", fontSize: 13 },
  progressBar: { height: 5, background: "#1e293b", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  tagAssunto: { fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#0d1f38", color: "#60a5fa", fontWeight: 600 },
  tagHab: { fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(139,92,246,0.1)", color: "#a78bfa", fontWeight: 600 },
  textoBase: { background: "#0d1520", border: "1px solid #1e2d40", borderRadius: 10, padding: "12px 14px" },
  textoBaseLabel: { color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 6px" },
  textoBaseConteudo: { color: "#94a3b8", fontSize: 13, lineHeight: 1.7, margin: 0, fontStyle: "italic" as const },
  enunciado: { color: "#e2e8f0", fontSize: 14, lineHeight: 1.8, margin: 0 },
  alt: {
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "#0d1829", border: "1px solid #1e293b",
    borderRadius: 10, padding: "11px 13px", cursor: "pointer",
    textAlign: "left", width: "100%", transition: "all 0.15s",
    fontFamily: "inherit",
  },
  altLetra: { fontWeight: 800, fontSize: 12, minWidth: 20, textAlign: "center", paddingTop: 1 },
  altTexto: { color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 },
  feedback: {
    border: "1px solid", borderRadius: 12, padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  feedbackTit: { fontWeight: 700, fontSize: 14, margin: 0 },
  feedbackExp: { color: "#94a3b8", fontSize: 12, lineHeight: 1.65, margin: 0 },
  btnProxima: {
    color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    alignSelf: "flex-end", fontFamily: "inherit",
  },
  placar: {
    width: "100%", border: "1px solid",
    borderRadius: 16, padding: "20px 24px", textAlign: "center",
  },
  placarNum: { fontSize: 52, fontWeight: 900, margin: 0, lineHeight: 1 },
  placarLabel: { fontWeight: 700, fontSize: 15, margin: "4px 0 12px" },
  placarBar: { height: 5, background: "#1e293b", borderRadius: 99, margin: "0 0 8px" },
  placarBarFill: { height: "100%", borderRadius: 99, transition: "width 1s ease" },
  placarPct: { color: "#64748b", fontSize: 12, margin: 0 },
  metricas: { display: "flex", gap: 8, justifyContent: "center" },
  metItem: {
    flex: 1, background: "#0d1829", border: "1px solid #1e293b",
    borderRadius: 10, padding: "10px 12px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  },
  metVal: { color: "#f1f5f9", fontWeight: 700, fontSize: 13 },
  metLbl: { color: "#475569", fontSize: 10 },
  revisao: {
    background: "#1a1000", border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 12, padding: 14,
    display: "flex", flexDirection: "column", gap: 8,
  },
  revisaoTit: { color: "#f59e0b", fontWeight: 700, fontSize: 13, margin: 0 },
  revisaoTag: {
    display: "inline-block", background: "rgba(245,158,11,0.1)",
    color: "#fbbf24", fontSize: 11, padding: "3px 10px",
    borderRadius: 99, border: "1px solid rgba(245,158,11,0.15)", fontWeight: 600,
  },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid #1e293b", borderTopColor: "#4f6ef7",
    animation: "spin 0.8s linear infinite",
  },
  mapaCard: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#0a1628", border: "1px solid",
    borderRadius: 10, padding: "10px 12px",
  },
  mapaPct: { fontWeight: 700, fontSize: 14 },
};
