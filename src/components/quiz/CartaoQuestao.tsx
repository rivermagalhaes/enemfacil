// src/components/quiz/CartaoQuestao.tsx
interface CartaoQuestaoProps {
  numero: number;
  total: number;
  enunciado: string;
  assunto?: string | null;
  banca?: string;
  ano?: number | null;
}

export default function CartaoQuestao({ numero, total, enunciado, assunto, banca, ano }: CartaoQuestaoProps) {
  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid rgba(0,0,0,0.08)",
      borderRadius: 12, padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {banca && (
          <span style={{ fontSize: 10, fontWeight: 500, background: "#E6F1FB", color: "#0C447C", borderRadius: 99, padding: "2px 8px" }}>
            {banca}
          </span>
        )}
        {assunto && (
          <span style={{ fontSize: 10, fontWeight: 500, background: "#EEEDFE", color: "#3C3489", borderRadius: 99, padding: "2px 8px" }}>
            {assunto}
          </span>
        )}
        <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>
          {ano ? `${ano} · ` : ""}Questão {numero} de {total}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", margin: 0, lineHeight: 1.5 }}>
        {enunciado}
      </p>
    </div>
  );
}
