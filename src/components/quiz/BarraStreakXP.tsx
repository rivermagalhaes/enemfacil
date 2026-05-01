// src/components/quiz/BarraStreakXP.tsx
interface BarraStreakXPProps {
  pontos: number;
  sequencia: number;
  acertos: number;
  total: number;
}

export default function BarraStreakXP({ pontos, sequencia, acertos, total }: BarraStreakXPProps) {
  const items = [
    { val: pontos, lbl: "pontos" },
    { val: sequencia, lbl: "sequência" },
    { val: `${acertos}/${total}`, lbl: "acertos" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      {items.map((i) => (
        <div key={i.lbl} style={{
          flex: 1, background: "#f4f6fb", borderRadius: 8, padding: "8px 10px",
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#1a1a1a" }}>{i.val}</div>
          <div style={{ fontSize: 11, color: "#888" }}>{i.lbl}</div>
        </div>
      ))}
    </div>
  );
}
