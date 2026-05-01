// src/components/concursos/DistribuicaoEdital.tsx
import type { ConcursoAssunto } from "@/types";

const CORES = ["#185FA5", "#3B6D11", "#7F77DD", "#EF9F27", "#B4B2A9"];

interface Props { assuntos: ConcursoAssunto[] }

export default function DistribuicaoEdital({ assuntos }: Props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
        Distribuição no edital
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {assuntos.map((a, i) => (
          <div key={a.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", background: "#f4f6fb", borderRadius: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: CORES[i % CORES.length], flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: "#1a1a1a" }}>{a.assunto}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: CORES[i % CORES.length] }}>{a.peso_pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
