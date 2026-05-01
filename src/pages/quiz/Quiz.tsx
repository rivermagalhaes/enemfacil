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
  ano?: number;
  options: { id: string; option_index: number; label: string }[];
}

const TRAVA_DIAS = [3, 21, 90];

function useUsoQuiz(userId: string | undefined, plano: string) {
  const limite = LIMITES_DIA[plano] ?? 3;
  const [usosHoje, setUsosHoje] = useState(0);
  const [travadoAte, setTravadoAte] = useState<Date | null>(null);
  const [travaNivel, setTravaNivel] = useState(0);
  const [loading, setLoading] = useState(true);

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
  const { area: areaParam } = useParams<{ area: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const plano = String(profile?.plano ?? "free");
  const area = AREAS.find(a => a.id === areaParam) ?? AREAS[0];

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
      const { data: qs } = await supabase
        .from("questions")
        .select("id, question, explanation, answer_index, area, difficulty, ano")
        .eq("area", areaParam)
        .eq("vestibular", "ENEM")
        .limit(10);

      if (!qs || qs.length === 0) { setCarregando(false); return; }

      const ids = qs.map(q => q.id);
      const { data: opts } = await supabase
        .from("question_options")
        .select("id, question_id, option_index, label")
        .in("question_id", ids)
        .order("option_index");

      const questoesCompletas = qs.map(q => ({
        ...q,
        options: (opts ?? []).filter(o => o.question_id === q.id).sort((a, b) => a.option_index - b.option_index),
      }));

      setQuestoes(questoesCompletas);
      setCarregando(false);
    }
    carregar();
  }, [areaParam]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: area.cor, padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{area.emoji} {area.label}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{area.sublabel}</p>
          </div>
          {/* Badge uso */}
          <span style={{ fontSize: 10, fontWeight: 700, background: bloqueado ? "#fee2e2" : "rgba(255,255,255,0.2)", color: bloqueado ? "#b91c1c" : "#fff", borderRadius: 99, padding: "3px 10px" }}>
            {loadingUso ? "..." : bloqueado && travado ? `🔒 bloqueado` : limite >= Infinity ? "∞ ilimitado" : `${Math.max(0, limite - usosHoje)}/${limite} hoje`}
          </span>
        </div>

        {/* Barra de progresso */}
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
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
              {travado ? "Você ultrapassou o limite várias vezes." : "Volte amanhã ou faça upgrade."}
            </p>
            <button onClick={() => navigate("/assinatura")} style={{ padding: "10px 24px", background: CORES.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Ver planos →
            </button>
          </div>
        )}

        {/* Carregando */}
        {carregando && !bloqueado && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <p style={{ fontSize: 32, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</p>
            <p style={{ fontSize: 13, color: CORES.textSub }}>Carregando questões...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Sem questões */}
        {!carregando && !bloqueado && questoes.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>{area.emoji}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: CORES.text, margin: "0 0 6px" }}>Questões em breve!</p>
            <p style={{ fontSize: 13, color: CORES.textSub }}>Ainda não temos questões de {area.label} cadastradas.</p>
          </div>
        )}

        {/* Quiz ativo */}
        {!carregando && !bloqueado && questaoAtual && !finalizado && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: area.bg, color: area.cor, borderRadius: 99, padding: "3px 10px" }}>
                Questão {idx + 1}/{questoes.length}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, background: `${diffCor(questaoAtual.difficulty)}15`, color: diffCor(questaoAtual.difficulty), borderRadius: 99, padding: "3px 10px" }}>
                {diffLabel(questaoAtual.difficulty)}
              </span>
              {questaoAtual.ano && <span style={{ fontSize: 11, color: CORES.textSub }}>ENEM {questaoAtual.ano}</span>}
            </div>

            {/* Enunciado */}
            <div style={{ background: CORES.bgCard, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${area.cor}15`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>
                {questaoAtual.question}
              </p>
            </div>

            {/* Alternativas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {questaoAtual.options.map((opt) => {
                const respondida = respostas[idx] !== undefined;
                const selecionada = respostas[idx] === opt.option_index;
                const correta = questaoAtual.answer_index === opt.option_index;
                const mostrar = respondida && (selecionada || correta);

                let bg = CORES.bgCard;
                let border = `1px solid ${CORES.border}`;
                let cor = CORES.text;

                if (mostrar) {
                  if (correta) { bg = "#EDFAF3"; border = `1.5px solid ${CORES.success}`; cor = CORES.success; }
                  else if (selecionada) { bg = "#FFF1F1"; border = `1.5px solid ${CORES.error}`; cor = CORES.error; }
                }

                const letras = ["A", "B", "C", "D", "E"];

                return (
                  <button key={opt.id} onClick={() => handleResponder(opt.option_index)} disabled={respondida}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 12, border, background: bg, cursor: respondida ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: mostrar ? (correta ? CORES.success : CORES.error) : `${area.cor}15`, color: mostrar ? "#fff" : area.cor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                      {letras[opt.option_index] ?? opt.option_index}
                    </span>
                    <span style={{ fontSize: 13, color: cor, lineHeight: 1.5, flex: 1 }}>{opt.label}</span>
                    {mostrar && (
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{correta ? "✅" : selecionada ? "❌" : ""}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explicação */}
            {mostrarExplicacao && questaoAtual.explanation && (
              <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>💡 Explicação</p>
                <p style={{ fontSize: 13, color: CORES.text, lineHeight: 1.6, margin: 0 }}>{questaoAtual.explanation}</p>
              </div>
            )}

            {mostrarExplicacao && (
              <button onClick={proximaQuestao} style={{ width: "100%", padding: "13px 0", background: area.cor, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 14px ${area.cor}40` }}>
                {idx + 1 >= questoes.length ? "Ver resultado 🎉" : "Próxima questão →"}
              </button>
            )}
          </>
        )}

        {/* Resultado */}
        {finalizado && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: acertos === total ? "#EDFAF3" : acertos >= total / 2 ? "#E6EEFF" : "#FFF1F1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 40 }}>
              {acertos === total ? "🏆" : acertos >= total / 2 ? "👍" : "💪"}
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: CORES.text, margin: "0 0 4px" }}>
              {acertos}/{total} acertos
            </p>
            <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 24px" }}>
              {acertos === total ? "Perfeito! Você domina esse conteúdo!" : acertos >= total / 2 ? "Bom trabalho! Continue praticando." : "Continue estudando, você vai melhorar!"}
            </p>

            {/* Barra de acerto */}
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ height: "100%", width: `${(acertos / total) * 100}%`, background: acertos === total ? CORES.success : acertos >= total / 2 ? CORES.primary : CORES.warning, borderRadius: 99, transition: "width 0.8s" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setIdx(0); setRespostas({}); setFinalizado(false); setMostrarExplicacao(false); }} style={{ flex: 1, padding: "12px 0", background: CORES.bgCard, color: CORES.text, border: `1px solid ${CORES.border}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Repetir
              </button>
              <button onClick={() => navigate("/")} style={{ flex: 1, padding: "12px 0", background: area.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
