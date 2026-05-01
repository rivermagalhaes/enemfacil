// src/components/concursos/QuestaoPreview.tsx
import { useState } from "react";
import type { Questao, Gabarito } from "@/types";
import OpcoesCespe from "@/components/quiz/OpcoesCespe";
import FeedbackQuestao from "@/components/quiz/FeedbackQuestao";

interface Props { questao: Questao }

export default function QuestaoPreview({ questao }: Props) {
  const [resposta, setResposta] = useState<Gabarito | null>(null);

  return (
    <div style={{
      background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
      borderRadius: 12, padding: 13,
    }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 500, background: "#E6F1FB", color: "#0C447C", borderRadius: 99, padding: "2px 8px" }}>
          {questao.banca}
        </span>
        {questao.assunto && (
          <span style={{ fontSize: 10, fontWeight: 500, background: "#EEEDFE", color: "#3C3489", borderRadius: 99, padding: "2px 8px" }}>
            {questao.assunto}
          </span>
        )}
        {questao.ano && (
          <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>{questao.ano}</span>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.55, margin: "0 0 10px", fontFamily: "Georgia, serif" }}>
        {questao.enunciado}
      </p>

      {questao.assertiva && questao.gabarito_cespe && (
        <OpcoesCespe
          assertiva={questao.assertiva}
          gabarito={questao.gabarito_cespe as any}
          respostaUsuario={resposta}
          onResponder={setResposta}
        />
      )}

      {resposta !== null && (
        <FeedbackQuestao
          correta={resposta === questao.gabarito_cespe}
          justificativa={questao.justificativa ?? ""}
        />
      )}
    </div>
  );
}
