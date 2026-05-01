// src/pages/quiz/Quiz.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { AREAS, CORES, LIMITES_DIA } from "@/styles/theme";

interface Questao {
  id: string;
  question: string;
  explanation: string;
  answer_index: number;
  area: string;
  difficulty: string;
  vestibular: string;
  ano?: number;
  options: { id: string; option_index: number; label: string }[];
}

const TRAVA_DIAS = [3, 21, 90];

const VESTIBULARES_CONFIG: Record<string, { nome: string; emoji: string; cor: string; bg: string; desc: string }> = {
  ITA:     { nome: "ITA",     emoji: "✈️", cor: "#003D80", bg: "#E6F0FF", desc: "Instituto Tecnológico de Aeronáutica" },
  IME:     { nome: "IME",     emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF", desc: "Instituto Militar de Engenharia" },
  FUVEST:  { nome: "FUVEST",  emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6", desc: "Universidade de São Paulo" },
  UNICAMP: { nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF", desc: "Universidade de Campinas" },
  UNB:     { nome: "UnB",     emoji: "🏛️", cor: "#006400", bg: "#E6FFE6", desc: "Universidade de Brasília" },
};

function useUsoQuiz(userId: string | undefined, plano: string) {
  const limite = LIMITES_DIA[plano] ?? 3;
  const [usosHoje, setUsosHoje]     = useState(0);
  const [travadoAte, setTravadoAte] = useState<Date | null>(null);
  const [travaNivel, setTravaNivel] = useState(0);
  const [loading, setLoading]       = useState(true);

  const carregar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const hoje = new Date().toISOString().split("T")[0];
    const [{ data: usos }, { data: trava }] = await Promise.all([
      supabase.from("uso_funcionalidades").select("id").eq("user_id", userId).eq("funcionalidade", "quiz").eq("usado_em", hoje),
      supabase.from("travas_usuario").select("travado_ate, nivel").eq("user_id", userId).eq("funcionalidade", "quiz").maybeSingle(),
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
        { user_id: userId, funcionalidade: "quiz", nivel: proximoNivel, travado_ate: ate.toISOString().split("T")[0] },
        { onConflict: "user_id,funcionalidade" }
      );
      await carregar();
      return false;
    }
    await supabase.from("uso_funcionalidades").insert({ user_id: userId, funcionalidade: "quiz", usado_em: hoje });
    await carregar();
    return true;
  }, [userId, limite, usosHoje, travadoAte, travaNivel, carregar]);

  return { usosHoje, limite, travadoAte, loading, registrar };
}

export default function Quiz() {
  const { area: areaParam, vestibular: vestibularParam } = useParams<{ area?: string; vestibular?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const plano = String((profile as any)?.plan ?? (profile as any)?.plano ?? "free");

  // Modo vestibular ou área
  const modoVestibular = !!vestibularParam;
  const vestConfig = vestibularParam ? VESTIBULARES_CONFIG[vestibularParam] : null;
  const area = AREAS.find(a => a.id === areaParam) ?? AREAS[0];

  // Cores do header dependendo do modo
  const headerCor = modoVestibular && vestConfig ? vestConfig.cor : area.cor;
  const headerBg = modoVestibular && vestConfig ? vestConfig.bg : area.bg;
  const headerEmoji = modoVestibular && vestConfig ? vestConfig.emoji : area.emoji;
  const headerLabel = modoVestibular && vestConfig ? vestConfig.nome : area.label;
  const headerDesc = modoVestibular && vestConfig ? vestConfig.desc : area.sublabel;

  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const { usosHoje, limite, travadoAte, loading: loadingUso, registrar } = useUsoQuiz(profile?.id, plano);

  const travado = travadoAte && travadoAte > new Date();
  const bloqueado = travado || (!loadingUso && limite < Infinity && usosHoje >= limite && !travado);

  useEffect(() => {
    async function carregar() {
      let query = supabase.from("questions").select("id, question, explanation, answer_index, area, difficulty, vestibular, ano");

      if (modoVestibular && vestibularParam) {
        query = query.eq("vestibular", vestibularParam);
      } else if (areaParam) {
        query = query.eq("area", areaParam).eq("vestibular", "ENEM");
      }

      const { data: qs } = await query.limit(10);

      if (!qs || qs.length === 0) { setCarregando(false); return; }

      const ids = qs.map((q: any) => q.id);
      const { data: opts } = await supabase
        .from("question_options")
        .select("id, question_id, option_index, label")
        .in("question_id", ids)
        .order("option_index");

      setQuestoes(qs.map((q: any) => ({
        ...q,
        options: (opts ?? []).filter((o: any) => o.question_id === q.id),
      })));
      setCarregando(false);
    }
    carregar();
  }, [areaParam, vestibularParam, modoVestibular]);

  async function handleResponder(optIndex: number) {
    if (respostas[idx] !== undefined) return;
    const ok = await registrar();
    if (!ok) return;
    setRespostas(prev => ({ ...prev, [idx]: optIndex }));
    setMostrarExplicacao(true);
  }

  function proximaQuestao() {
    if (idx + 1 >= questoes.length) { setFinalizado(true); return; }
    setIdx(i => i + 1);
    setMostrarExplicacao(false);
  }

  const questaoAtual = questoes[idx];
  const acertos = Object.entries(respostas).filter(([i, r]) => questoes[Number(i)]?.answer_index === r).length;
  const total = Object.keys(respostas).length;

  const diffCor = (d: string) => d === "facil" ? CORES.success : d === "medio" ? CORES.warning : CORES.error;
  const diffLabel = (d: string) => d === "facil" ? "Fácil" : d === "medio" ? "Médio" : "Difícil";
  const letras = ["A", "B", "C", "D", "E"];

  const badgeLabel = () => {
    if (!loadingUso) {
      if (travado) { const dias = Math.ceil((travadoAte!.getTime() - Date.now()) / 86400000); return `🔒 ${dias}d`; }
      if (limite >= Infinity) return "∞ ilimitado";
      return `${Math.max(0, limite - usosHoje)}/${limite} hoje`;
    }
    return "...";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: headerCor, padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{headerEmoji} {headerLabel}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{headerDesc}</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, background: bloqueado ? "#fee2e2" : "rgba(255,255,255,0.2)", color: bloqueado ? "#b91c1c" : "#fff", borderRadius: 99, padding: "3px 10px" }}>
            {badgeLabel()}
          </span>
        </div>

        {!finalizado && questoes.length > 0 && (
          <div style={{ display: "flex", gap: 4 }}>
            {questoes.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < idx ? "rgba(255,255,255,0.8)" : i === idx ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.3s" }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* Bloqueado */}
        {bloqueado && (
          <div style={{ background: "#fff1f1", border: "1px solid #fca5a5", borderRadius: 14, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 32, margin: "0 0 8px" }}>🔒</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#b91c1c", margin: "0 0 6px" }}>
              {travado ? `Bloqueado até ${travadoAte!.toLocaleDateString("pt-BR")}` : "Limite diário atingido"}
            </p>
            <button onClick={() => navigate("/assinatura")} style={{ marginTop: 12, padding: "10px 24px", background: CORES.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ver planos →</button>
          </div>
        )}

        {/* Carregando */}
        {carregando && !bloqueado && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <p style={{ fontSize: 32 }}>⟳</p>
            <p style={{ fontSize: 13, color: CORES.textSub }}>Carregando questões...</p>
          </div>
        )}

        {/* Sem questões */}
        {!carregando && !bloqueado && questoes.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>{headerEmoji}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: CORES.text, margin: "0 0 6px" }}>Questões em breve!</p>
            <p style={{ fontSize: 13, color: CORES.textSub }}>Ainda não temos questões de {headerLabel} cadastradas.</p>
          </div>
        )}

        {/* Quiz ativo */}
        {!carregando && !bloqueado && questaoAtual && !finalizado && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: headerBg, color: headerCor, borderRadius: 99, padding: "3px 10px" }}>
                Questão {idx + 1}/{questoes.length}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, background: `${diffCor(questaoAtual.difficulty)}15`, color: diffCor(questaoAtual.difficulty), borderRadius: 99, padding: "3px 10px" }}>
                {diffLabel(questaoAtual.difficulty)}
              </span>
              {questaoAtual.ano && <span style={{ fontSize: 11, color: CORES.textSub }}>{questaoAtual.vestibular} {questaoAtual.ano}</span>}
            </div>

            <div style={{ background: CORES.bgCard, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${headerCor}15`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>
                {questaoAtual.question}
              </p>
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
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: mostrar ? (correta ? CORES.success : CORES.error) : `${headerCor}15`, color: mostrar ? "#fff" : headerCor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                      {letras[opt.option_index] ?? opt.option_index}
                    </span>
                    <span style={{ fontSize: 13, color: cor, lineHeight: 1.5, flex: 1 }}>{opt.label}</span>
                    {mostrar && <span style={{ fontSize: 16, flexShrink: 0 }}>{correta ? "✅" : selecionada ? "❌" : ""}</span>}
                  </button>
                );
              })}
            </div>

            {mostrarExplicacao && questaoAtual.explanation && (
              <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>💡 Explicação</p>
                <p style={{ fontSize: 13, color: CORES.text, lineHeight: 1.6, margin: 0 }}>{questaoAtual.explanation}</p>
              </div>
            )}

            {mostrarExplicacao && (
              <button onClick={proximaQuestao} style={{ width: "100%", padding: "13px 0", background: headerCor, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 14px ${headerCor}40` }}>
                {idx + 1 >= questoes.length ? "Ver resultado 🎉" : "Próxima questão →"}
              </button>
            )}
          </>
        )}

        {/* Resultado */}
        {finalizado && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: acertos >= total * 0.7 ? "#EDFAF3" : "#E6EEFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 40 }}>
              {acertos >= total * 0.7 ? "🏆" : acertos >= total * 0.5 ? "👍" : "💪"}
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: CORES.text, margin: "0 0 4px" }}>{acertos}/{total} acertos</p>
            <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 24px" }}>
              {acertos === total ? "Perfeito! Você domina esse conteúdo!" : acertos >= total / 2 ? "Bom trabalho! Continue praticando." : "Continue estudando, você vai melhorar!"}
            </p>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ height: "100%", width: `${(acertos / Math.max(total, 1)) * 100}%`, background: headerCor, borderRadius: 99 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setIdx(0); setRespostas({}); setFinalizado(false); setMostrarExplicacao(false); }} style={{ flex: 1, padding: "12px 0", background: CORES.bgCard, color: CORES.text, border: `1px solid ${CORES.border}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Repetir
              </button>
              <button onClick={() => navigate("/")} style={{ flex: 1, padding: "12px 0", background: headerCor, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Início →
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
