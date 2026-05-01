// src/components/quiz/FeedbackQuestao.tsx
interface FeedbackQuestaoProps {
  correta: boolean;
  justificativa: string;
}

export default function FeedbackQuestao({ correta, justificativa }: FeedbackQuestaoProps) {
  return (
    <div style={{
      borderRadius: 8, padding: "10px 12px", marginBottom: 14,
      background: correta ? "#EAF3DE" : "#FCEBEB",
      color: correta ? "#27500A" : "#791F1F",
    }}>
      <p style={{ fontWeight: 500, margin: "0 0 3px", fontSize: 13 }}>
        {correta ? "Muito bem!" : "Quase!"}
      </p>
      <p style={{ fontSize: 12, lineHeight: 1.55, margin: 0 }}>{justificativa}</p>
    </div>
  );
}
