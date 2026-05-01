// src/pages/simulado/Simulado.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
const TEMPO_TOTAL = 45 * 60; // 45 minutos em segundos

function useUsoSimulado(userId: string | undefined, plano: string) {
  const limite = LIMITES_DIA[plano] ?? 3;
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

  const [etapa, setEtapa] = useState<"inicio" | "quiz" | "resultado">("inicio");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [tempo, setTempo] = useState(TEMPO_TOTAL);
  const [carregando, setCarregando] = useState(false);

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

  const minutos = Math.floor(tempo / 60).toString().padStart(2, "0");
  const segundos = (tempo % 60).toString().padStart(2, "0");
  const tempoPerc = (tempo / TEMPO_TOTAL) * 100;
  const tempoCor = tempo < 300 ? CORES.error : tempo < 600 ? CORES.warning : CORES.success;

  async function iniciarSimulado() {
    const ok = await registrar();
    if (!ok) return;
    setCarregando(true);

    // Busca 9 questões por área (5 áreas × 9 = 45)
    const todasQuestoes: Questao[] = [];
    for (const area of AREAS.slice(0, 4)) { // 4 áreas × 9 = 36 + redação separada
      const { data: qs } = await supabase
        .from("questions")
        .select("id, question, explanation, answer_index, area, difficulty, ano")
        .eq("area", area.id)
        .eq("vestibular", "ENEM")
        .limit(9);

      if (qs && qs.length > 0) {
        const ids = qs.map((q: any) => q.id);
        const { data: opts } = await supabase
          .from("question_options")
          .select("id, question_id, option_index, label")
          .in("question_id", ids)
          .order("option_index");

        todasQuestoes.push(...qs.map((q: any) => ({
          ...q,
          options: (opts ?? []).filter((o: any) => o.question_id === q.id),
        })));
      }
    }

    // Embaralha
    const embaralhadas = todasQuestoes.sort(() => Math.random() - 0.5).slice(0, 45);
    setQuestoes(embaralhadas);
    setIdx(0);
    setRespostas({});
    setTempo(TEMPO_TOTAL);
    setEtapa("quiz");
    setCarregando(false);
  }

  function handleResponder(optIndex: number) {
    if (respostas[idx] !== undefined) return;
    setRespostas(prev => ({ ...prev, [idx]: optIndex }));
  }

  function proximaQuestao() {
    if (idx + 1 >= questoes.length) { setEtapa("resultado"); return; }
    setIdx(i => i + 1);
  }

  const questaoAtual = questoes[idx];
  const acertos = Object.entries(respostas).filter(([i, r]) => questoes[Number(i)]?.answer_index === r).length;
  const respondidas = Object.keys(respostas).length;

  // Acertos por área
  const porArea = AREAS.map(area => {
    const qs = questoes.filter(q => q.area === area.id);
    const acertosArea = qs.filter((q, _i) => respostas[questoes.indexOf(q)] === q.answer_index).length;
    return { ...area, total: qs.length, acertos: acertosArea };
  }).filter(a => a.total > 0);

  const letras = ["A", "B", "C", "D", "E"];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${CORES.bgDark}, #0D1F3C)`, padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: etapa === "quiz" ? 12 : 0 }}>
          <button onClick={() => etapa === "quiz" ? setEtapa("resultado") : navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>📝 Simulado ENEM</p>
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

            <div style={{ background: CORES.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${CORES.border}` }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: CORES.text, margin: "0 0 8px" }}>Simulado Completo</p>
              <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 16px", lineHeight: 1.6 }}>
                45 questões do ENEM divididas entre as 4 áreas do conhecimento. Tempo total: 45 minutos.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {AREAS.slice(0, 4).map(area => (
                  <div key={area.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: area.bg }}>
                    <span style={{ fontSize: 16 }}>{area.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: area.cor, margin: 0 }}>{area.label}</p>
                    </div>
                    <span style={{ fontSize: 11, color: area.cor, fontWeight: 600 }}>~9 questões</span>
                  </div>
                ))}
              </div>

              <button
                onClick={iniciarSimulado}
                disabled={bloqueado || carregando}
                style={{ width: "100%", padding: "13px 0", background: bloqueado ? "#ccc" : CORES.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bloqueado ? "not-allowed" : "pointer", boxShadow: bloqueado ? "none" : `0 4px 16px ${CORES.primary}40` }}
              >
                {carregando ? "Preparando simulado..." : bloqueado ? "🔒 Bloqueado" : "Iniciar simulado →"}
              </button>
            </div>

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
            {/* Badge de área */}
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

            {/* Barra geral */}
            <div style={{ height: 10, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${(acertos / Math.max(respondidas, 1)) * 100}%`, background: acertos >= respondidas * 0.7 ? CORES.success : acertos >= respondidas * 0.5 ? CORES.primary : CORES.warning, borderRadius: 99 }} />
            </div>

            {/* Por área */}
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
    </div>
  );
}
