// src/pages/quiz/QuizSessao.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import TopBar from "@/components/layout/TopBar";
import CartaoQuestao from "@/components/quiz/CartaoQuestao";
import OpcoesCespe from "@/components/quiz/OpcoesCespe";
import FeedbackQuestao from "@/components/quiz/FeedbackQuestao";
import BarraStreakXP from "@/components/quiz/BarraStreakXP";
import AcaoBtn from "@/components/ui/AcaoBtn";
import type { Questao, Gabarito } from "@/types";

const TOTAL_FREE = 5;
const TOTAL_PAGO = 10;

export default function QuizSessao() {
  const { concursoId } = useParams<{ concursoId: string }>();
  const { profile } = useAuth();
  const isFree = !profile || profile.plano === "gratis";
  const TOTAL = isFree ? TOTAL_FREE : TOTAL_PAGO;
  const navigate = useNavigate();

  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [idx, setIdx] = useState(0);
  const [resposta, setResposta] = useState<Gabarito | null>(null);
  const [pontos, setPontos] = useState(0);
  const [sequencia, setSequencia] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inicio] = useState(Date.now());

  useEffect(() => {
    if (!concursoId) return;
    supabase
      .from("questoes")
      .select("*")
      .eq("concurso_id", concursoId)
      .eq("ativo", true)
      .not("assertiva", "is", null)
      .limit(TOTAL)
      .then(({ data }) => {
        setQuestoes(data ?? []);
        setLoading(false);
      });
  }, [concursoId, TOTAL]);

  const questaoAtual = questoes[idx];
  const progresso = Math.round((idx / TOTAL) * 100);

  const handleResponder = useCallback(async (r: Gabarito) => {
    if (!questaoAtual || !profile) return;
    setResposta(r);
    const correta = r === questaoAtual.gabarito_cespe;
    const bonus = correta ? (sequencia >= 2 ? 20 : 10) : 0;

    if (correta) {
      setPontos((p) => p + bonus);
      setSequencia((s) => s + 1);
      setAcertos((a) => a + 1);
    } else {
      setSequencia(0);
    }

    await supabase.from("respostas").insert({
      user_id: profile.id,
      questao_id: questaoAtual.id,
      resposta_cespe: r,
      correta,
      tempo_ms: Date.now() - inicio,
    });
  }, [questaoAtual, profile, sequencia, inicio]);

  function avancar() {
    if (idx + 1 >= questoes.length) {
      navigate(`/quiz/${concursoId}/resultado`, {
        state: { pontos, acertos, total: questoes.length },
      });
    } else {
      setIdx((i) => i + 1);
      setResposta(null);
    }
  }

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Carregando questões...</div>;
  if (!questaoAtual) return <div style={{ padding: 32, textAlign: "center" }}>Nenhuma questão disponível.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <TopBar title="Simulado" showBack progress={progresso} />
      <div style={{ flex: 1, padding: "14px 14px 24px", overflowY: "auto" }}>
        <BarraStreakXP pontos={pontos} sequencia={sequencia} acertos={acertos} total={TOTAL} />

        {isFree && (
          <div style={{ background: "#FFF8E6", borderLeft: "3px solid #f0c040", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎁</span>
            <p style={{ fontSize: 12, color: "#633806", margin: 0 }}>Simulado gratuito — 5 questões. Assine para simulados completos de 10 questões!</p>
          </div>
        )}

        {questaoAtual.assunto && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#EAF3DE", color: "#27500A",
            borderRadius: 99, padding: "4px 12px",
            fontSize: 11, fontWeight: 500, marginBottom: 12,
          }}>
            {questaoAtual.assunto}
          </span>
        )}

        <CartaoQuestao
          numero={idx + 1} total={TOTAL}
          enunciado={questaoAtual.enunciado}
          assunto={questaoAtual.assunto}
          banca={questaoAtual.banca}
          ano={questaoAtual.ano}
        />

        {questaoAtual.assertiva && questaoAtual.gabarito_cespe && (
          <OpcoesCespe
            assertiva={questaoAtual.assertiva}
            gabarito={questaoAtual.gabarito_cespe}
            respostaUsuario={resposta}
            onResponder={handleResponder}
          />
        )}

        {resposta !== null && (
          <FeedbackQuestao
            correta={resposta === (questaoAtual.gabarito_cespe ?? "")}
            justificativa={questaoAtual.justificativa ?? ""}
          />
        )}

        {resposta !== null && (
          <AcaoBtn primary full onClick={avancar}>
            {idx + 1 >= questoes.length ? "Ver resultado" : "Próxima questão"}
          </AcaoBtn>
        )}
      </div>
    </div>
  );
}
