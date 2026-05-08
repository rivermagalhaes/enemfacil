// src/pages/simulado/Simulado.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { AREAS, CORES, LIMITES_SIMULADO } from "@/styles/theme";
import { addXP, XP } from "@/lib/xpService";
import FeedbackModal from "@/components/ui/FeedbackModal";

const VESTIBULARES_SIMULADO = [
  { id: "ENEM",    nome: "ENEM",    emoji: "🎯", cor: "#0057FF", bg: "#E6EEFF",
    desc: "Exame Nacional do Ensino Médio", foco: "Linguagens · Matemática · Humanas · Natureza",
    questoes: 45, tempo: 45, badge: null },
  { id: "ITA",     nome: "ITA",     emoji: "✈️", cor: "#003D80", bg: "#E6F0FF",
    desc: "Instituto Tecnológico de Aeronáutica", foco: "Matemática · Física · Química · Inglês",
    questoes: 20, tempo: 30, badge: "Top 1" },
  { id: "IME",     nome: "IME",     emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF",
    desc: "Instituto Militar de Engenharia", foco: "Matemática · Física · Química · Desenho",
    questoes: 20, tempo: 30, badge: "Top 2" },
  { id: "FUVEST",  nome: "FUVEST",  emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6",
    desc: "Universidade de São Paulo — USP", foco: "Todas as áreas · Interpretação",
    questoes: 20, tempo: 30, badge: "USP" },
  { id: "UNICAMP", nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF",
    desc: "Universidade Estadual de Campinas", foco: "Interdisciplinar · Contextualizado",
    questoes: 20, tempo: 30, badge: null },
  { id: "UNB",     nome: "UnB",     emoji: "🏛️", cor: "#006400", bg: "#E6FFE6",
    desc: "Universidade de Brasília + PAS", foco: "Atualidades · PAS · Humanas",
    questoes: 15, tempo: 20, badge: "PAS" },
];

interface Questao {
  id: string;
  question: string;
  explanation: string;
  answer_index: number;
  area: string;
  difficulty: string;
  ano?: number;
  options: { id: string; option_index: number; label: string }[];
}

const TRAVA_DIAS = [3, 21, 90];
const TEMPO_TOTAL = 45 * 60;

function useUsoSimulado(userId: string | undefined, plano: string) {
  const limite = LIMITES_SIMULADO[plano] ?? Infinity;
  const [usosHoje, setUsosHoje]     = useState(0);
  const [travadoAte, setTravadoAte] = useState<Date | null>(null);
  const [travaNivel, setTravaNivel] = useState(0);
  const [loading, setLoading]       = useState(true);

  const carregar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const hoje = new Date().toISOString().split("T")[0];
    const [{ data: usos }, { data: trava }] = await Promise.all([
      supabase.from("uso_funcionalidades").select("id").eq("user_id", userId).eq("funcionalidade", "simulado").eq("usado_em", hoje),
      supabase.from("travas_usuario").select("travado_ate, nivel").eq("user_id", userId).eq("funcionalidade", "simulado").maybeSingle(),
    ]);
    setUsosHoje(usos?.length ?? 0);
    setTravadoAte(trava?.travado_ate ? new Date(trava.travado_ate) : null);
    setTravaNivel(trava?.nivel ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => { carregar(); }, [carregar]);

  const registrar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    if (limite >= Infinity) return true;
    const hoje = new Date().toISOString().split("T")[0];
    if (travadoAte && travadoAte > new Date()) return false;
    if (usosHoje >= limite) {
      const proximoNivel = Math.min(travaNivel + 1, TRAVA_DIAS.length);
      const dias = TRAVA_DIAS[proximoNivel - 1] ?? 90;
      const ate = new Date();
      ate.setDate(ate.getDate() + dias);
      await supabase.from("travas_usuario").upsert(
        { user_id: userId, funcionalidade: "simulado", nivel: proximoNivel, travado_ate: ate.toISOString().split("T")[0] },
        { onConflict: "user_id,funcionalidade" }
      );
      await carregar();
      return false;
    }
    await supabase.from("uso_funcionalidades").insert({ user_id: userId, funcionalidade: "simulado", usado_em: hoje });
    await carregar();
    return true;
  }, [userId, limite, usosHoje, travadoAte, travaNivel, carregar]);

  return { usosHoje, limite, travadoAte, loading, registrar };
}

export default function Simulado() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const plano = String((profile as any)?.plan ?? (profile as any)?.plano ?? "free");

  const [vestSelecionado, setVestSelecionado] = useState(VESTIBULARES_SIMULADO[0]);
  const [etapa, setEtapa] = useState<"inicio" | "quiz" | "resultado">("inicio");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [tempo, setTempo] = useState(TEMPO_TOTAL);
  const [carregando, setCarregando] = useState(false);
  const [feedbackAberto, setFeedbackAberto] = useState(false);

  const { usosHoje, limite, travadoAte, loading: loadingUso, registrar } = useUsoSimulado(profile?.id, plano);
  const travado = travadoAte && travadoAte > new Date();
  const bloqueado = travado || (!loadingUso && limite < Infinity && usosHoje >= limite && !travado);

  // Cronômetro
  useEffect(() => {
    if (etapa !== "quiz") return;
    if (tempo <= 0) { setEtapa("resultado"); return; }
    const t = setInterval(() => setTempo(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [etapa, tempo]);

  // Abre feedback automaticamente após entrar no resultado
  useEffect(() => {
    if (etapa === "resultado") {
      const timer = setTimeout(() => setFeedbackAberto(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [etapa]);

  const TEMPO_VEST = vestSelecionado.tempo * 60;
  const minutos = Math.floor(tempo / 60).toString().padStart(2, "0");
  const segundos = (tempo % 60).toString().padStart(2, "0");
  const tempoPerc = (tempo / TEMPO_VEST) * 100;
  const tempoCor = tempo < 300 ? CORES.error : tempo < 600 ? CORES.warning : CORES.success;

  async function iniciarSimulado() {
    const ok = await registrar();
    if (!ok) return;
    setCarregando(true);

    const todasQuestoes: Questao[] = [];
    const isEnem = vestSelecionado.id === "ENEM";

    if (isEnem) {
      for (const area of AREAS.slice(0, 4)) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id, question, explanation, answer_index, area, difficulty, ano")
          .eq("area", area.id).eq("vestibular", "ENEM").limit(9);
        if (qs?.length) {
          const ids = qs.map((q: any) => q.id);
          const { data: opts } = await supabase.from("question_options").select("id, question_id, option_index, label").in("question_id", ids).order("option_index");
          todasQuestoes.push(...qs.map((q: any) => ({ ...q, options: (opts ?? []).filter((o: any) => o.question_id === q.id) })));
        }
      }
    } else {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, question, explanation, answer_index, area, difficulty, ano")
        .eq("vestibular", vestSelecionado.id)
        .limit(vestSelecionado.questoes);
      if (qs?.length) {
        const ids = qs.map((q: any) => q.id);
        const { data: opts } = await supabase.from("question_options").select("id, question_id, option_index, label").in("question_id", ids).order("option_index");
        todasQuestoes.push(...qs.map((q: any) => ({ ...q, options: (opts ?? []).filter((o: any) => o.question_id === q.id) })));
      }
    }

    const embaralhadas = todasQuestoes.sort(() => Math.random() - 0.5);
    setQuestoes(embaralhadas);
    setIdx(0);
    setRespostas({});
    setTempo(vestSelecionado.tempo * 60);
    setEtapa("quiz");
    setCarregando(false);
  }

  function handleResponder(optIndex: number) {
    if (respostas[idx] !== undefined) return;
    setRespostas(prev => ({ ...prev, [idx]: optIndex }));
  }

  async function proximaQuestao() {
    if (idx + 1 >= questoes.length) {
      setEtapa("resultado");
      if (profile?.id) {
        const totalAcertos = Object.entries(respostas).filter(
          ([i, r]) => questoes[Number(i)]?.answer_index === r
        ).length;
        const xpTotal = XP.SIMULADO_CONCLUIR + (totalAcertos * XP.SIMULADO_BONUS);
        await addXP(profile.id, xpTotal);
      }
      return;
    }
    setIdx(i => i + 1);
  }

  const questaoAtual = questoes[idx];
  const acertos = Object.entries(respostas).filter(([i, r]) => questoes[Number(i)]?.answer_index === r).length;
  const respondidas = Object.keys(respostas).length;

  const porArea = AREAS.map(area => {
    const qs = questoes.filter(q => q.area === area.id);
    const acertosArea = qs.filter((q, _i) => respostas[questoes.indexOf(q)] === q.answer_index).length;
    return { ...area, total: qs.length, acertos: acertosArea };
  }).filter(a => a.total > 0);

  const letras = ["A", "B", "C", "D", "E"];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${etapa === "quiz" ? vestSelecionado.cor : CORES.bgDark}, ${etapa === "quiz" ? vestSelecionado.cor + "dd" : "#0D1F3C"})`, padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: etapa === "quiz" ? 12 : 0 }}>
          <button onClick={() => etapa === "quiz" ? setEtapa("inicio") : etapa === "resultado" ? setEtapa("inicio") : navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>📝 Simulado {vestSelecionado.nome}</p>
            {etapa === "quiz" && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Questão {idx + 1}/{questoes.length} · {respondidas} respondidas</p>}
          </div>
          {etapa === "quiz" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99, padding: "6px 12px" }}>
              <span style={{ fontSize: 14 }}>⏱️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: tempo < 300 ? "#f87171" : "#fff" }}>{minutos}:{segundos}</span>
            </div>
          )}
        </div>

        {etapa === "quiz" && (
          <>
            <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${(idx / questoes.length) * 100}%`, background: CORES.primary, borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${tempoPerc}%`, background: tempoCor, borderRadius: 99, transition: "width 1s linear" }} />
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* INÍCIO */}
        {etapa === "inicio" && (
          <div>
            {bloqueado && (
              <div style={{ background: "#fff1f1", border: "1px solid #fca5a5", borderRadius: 14, padding: 20, textAlign: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 32, margin: "0 0 8px" }}>🔒</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#b91c1c", margin: "0 0 6px" }}>
                  {travado ? `Bloqueado até ${travadoAte!.toLocaleDateString("pt-BR")}` : "Limite diário atingido"}
                </p>
                <button onClick={() => navigate("/assinatura")} style={{ marginTop: 12, padding: "10px 24px", background: CORES.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ver planos →</button>
              </div>
            )}

            <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Escolha o simulado</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {VESTIBULARES_SIMULADO.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVestSelecionado(v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 16,
                    background: vestSelecionado.id === v.id ? v.bg : CORES.bgCard,
                    border: vestSelecionado.id === v.id ? `2px solid ${v.cor}` : `1.5px solid ${CORES.border}`,
                    cursor: "pointer", textAlign: "left",
                    boxShadow: vestSelecionado.id === v.id ? `0 4px 16px ${v.cor}25` : "0 1px 4px rgba(0,0,0,0.06)",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: vestSelecionado.id === v.id ? v.cor : v.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {vestSelecionado.id === v.id ? <span style={{ filter: "brightness(10)" }}>{v.emoji}</span> : v.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: vestSelecionado.id === v.id ? v.cor : CORES.text, margin: 0 }}>{v.nome}</p>
                      {v.badge && <span style={{ fontSize: 9, fontWeight: 700, background: v.cor, color: "#fff", borderRadius: 4, padding: "1px 6px" }}>{v.badge}</span>}
                    </div>
                    <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.foco}</p>
                    <p style={{ fontSize: 10, color: v.cor, margin: 0, fontWeight: 500 }}>{v.questoes} questões · {v.tempo} min</p>
                  </div>
                  {vestSelecionado.id === v.id && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: v.cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={iniciarSimulado}
              disabled={bloqueado || carregando}
              style={{ width: "100%", padding: "13px 0", background: bloqueado ? "#ccc" : vestSelecionado.cor, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bloqueado ? "not-allowed" : "pointer", boxShadow: bloqueado ? "none" : `0 4px 16px ${vestSelecionado.cor}40`, marginBottom: 12 }}
            >
              {carregando ? "Preparando simulado..." : bloqueado ? "🔒 Bloqueado" : `Iniciar simulado ${vestSelecionado.nome} →`}
            </button>

            {!loadingUso && !bloqueado && (
              <p style={{ fontSize: 12, color: CORES.textSub, textAlign: "center" }}>
                {limite >= Infinity ? "✓ Simulados ilimitados" : `${Math.max(0, limite - usosHoje)} simulado${Math.max(0, limite - usosHoje) !== 1 ? "s" : ""} restante${Math.max(0, limite - usosHoje) !== 1 ? "s" : ""} hoje`}
              </p>
            )}
          </div>
        )}

        {/* QUIZ */}
        {etapa === "quiz" && questaoAtual && (
          <>
            <button
              onClick={() => setEtapa("inicio")}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: CORES.textSub, fontSize: 13, cursor: "pointer", padding: "0 0 14px", fontWeight: 500 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
              Escolher outro simulado
            </button>

            {(() => {
              const area = AREAS.find(a => a.id === questaoAtual.area);
              return area ? (
                <span style={{ fontSize: 11, fontWeight: 600, background: area.bg, color: area.cor, borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 12 }}>
                  {area.emoji} {area.label}
                </span>
              ) : null;
            })()}

            <div style={{ background: CORES.bgCard, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${CORES.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>{questaoAtual.question}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {questaoAtual.options.map(opt => {
                const respondida = respostas[idx] !== undefined;
                const selecionada = respostas[idx] === opt.option_index;
                const correta = questaoAtual.answer_index === opt.option_index;
                const mostrar = respondida && (selecionada || correta);

                let bg = CORES.bgCard, border = `1px solid ${CORES.border}`, cor = CORES.text;
                if (mostrar) {
                  if (correta) { bg = "#EDFAF3"; border = `1.5px solid ${CORES.success}`; cor = CORES.success; }
                  else if (selecionada) { bg = "#FFF1F1"; border = `1.5px solid ${CORES.error}`; cor = CORES.error; }
                }

                return (
                  <button key={opt.id} onClick={() => handleResponder(opt.option_index)} disabled={respondida}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 12, border, background: bg, cursor: respondida ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: mostrar ? (correta ? CORES.success : CORES.error) : `${CORES.primary}15`, color: mostrar ? "#fff" : CORES.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                      {letras[opt.option_index] ?? opt.option_index}
                    </span>
                    <span style={{ fontSize: 13, color: cor, lineHeight: 1.5, flex: 1 }}>{opt.label}</span>
                    {mostrar && <span style={{ fontSize: 16, flexShrink: 0 }}>{correta ? "✅" : selecionada ? "❌" : ""}</span>}
                  </button>
                );
              })}
            </div>

            {respostas[idx] !== undefined && (
              <button onClick={proximaQuestao} style={{ width: "100%", padding: "13px 0", background: CORES.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 14px ${CORES.primary}40` }}>
                {idx + 1 >= questoes.length ? "Ver resultado 🎉" : "Próxima →"}
              </button>
            )}

            {respostas[idx] === undefined && (
              <button onClick={proximaQuestao} style={{ width: "100%", padding: "10px 0", background: "transparent", border: "none", fontSize: 12, color: CORES.textSub, cursor: "pointer" }}>
                Pular questão
              </button>
            )}
          </>
        )}

        {/* RESULTADO */}
        {etapa === "resultado" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: acertos >= respondidas * 0.7 ? "#EDFAF3" : acertos >= respondidas * 0.5 ? "#E6EEFF" : "#FFF1F1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 40 }}>
                {acertos >= respondidas * 0.7 ? "🏆" : acertos >= respondidas * 0.5 ? "👍" : "💪"}
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: CORES.text, margin: "0 0 4px" }}>{acertos}/{respondidas}</p>
              <p style={{ fontSize: 14, color: CORES.textSub, margin: "0 0 4px" }}>
                {((acertos / Math.max(respondidas, 1)) * 100).toFixed(0)}% de acerto
              </p>
              <p style={{ fontSize: 12, color: CORES.textSub, margin: 0 }}>
                Tempo usado: {Math.floor((TEMPO_TOTAL - tempo) / 60)}min {((TEMPO_TOTAL - tempo) % 60)}s
              </p>
            </div>

            <div style={{ height: 10, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${(acertos / Math.max(respondidas, 1)) * 100}%`, background: acertos >= respondidas * 0.7 ? CORES.success : acertos >= respondidas * 0.5 ? CORES.primary : CORES.warning, borderRadius: 99 }} />
            </div>

            {porArea.length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Desempenho por área</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {porArea.map(area => (
                    <div key={area.id} style={{ background: CORES.bgCard, borderRadius: 12, padding: "12px 14px", border: `1px solid ${area.cor}22` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{area.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: area.cor }}>{area.label}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: area.cor }}>{area.acertos}/{area.total}</span>
                      </div>
                      <div style={{ height: 6, background: `${area.cor}20`, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(area.acertos / area.total) * 100}%`, background: area.cor, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Botão manual para abrir feedback */}
            <button
              onClick={() => setFeedbackAberto(true)}
              style={{
                width: "100%", padding: "11px 0", marginBottom: 10,
                background: "#f4f6fb", color: CORES.textSub,
                border: `1px solid ${CORES.border}`, borderRadius: 10,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              ⭐ Avaliar o simulado
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEtapa("inicio")} style={{ flex: 1, padding: "12px 0", background: CORES.bgCard, color: CORES.text, border: `1px solid ${CORES.border}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Novo simulado
              </button>
              <button onClick={() => navigate("/")} style={{ flex: 1, padding: "12px 0", background: CORES.primary, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Início →
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Modal de feedback */}
      <FeedbackModal
        isOpen={feedbackAberto}
        onClose={() => setFeedbackAberto(false)}
        contexto={`simulado_${vestSelecionado.id}`}
      />
    </div>
  );
}
