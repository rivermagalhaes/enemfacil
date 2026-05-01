// src/components/ui/ResultadoScreen.tsx
interface ResultadoScreenProps {
  acertos: number;
  total: number;
  pontos: number;
  xpGanho: number;
  onReiniciar: () => void;
}

export default function ResultadoScreen({ acertos, total, pontos, xpGanho, onReiniciar }: ResultadoScreenProps) {
  const pct = Math.round((acertos / total) * 100);
  const passou = pct >= 70;

  return (
    <div style={{ textAlign: "center", padding: "24px 16px" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: passou ? "#EAF3DE" : "#FAEEDA",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px",
      }}>
        {passou ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#27500A" strokeWidth="2" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#633806" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01" />
          </svg>
        )}
      </div>

      <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px" }}>
        {passou ? "Parabéns!" : "Continue praticando!"}
      </p>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>
        Você acertou {pct}% das questões
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24 }}>
        {[
          { val: `${acertos}/${total}`, lbl: "acertos" },
          { val: pontos, lbl: "pontos" },
          { val: `+${xpGanho}`, lbl: "XP" },
        ].map((s) => (
          <div key={s.lbl} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onReiniciar}
        style={{
          padding: "10px 28px", background: "#1a3a6e", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
      >
        Jogar novamente
      </button>
    </div>
  );
}
