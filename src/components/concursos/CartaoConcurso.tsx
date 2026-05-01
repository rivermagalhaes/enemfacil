// src/components/concursos/CartaoConcurso.tsx
import { useNavigate } from "react-router-dom";
import type { Concurso } from "@/types";
import Badge from "@/components/ui/Badge";

interface Props {
  concurso: Concurso;
  pctAcerto: number;
  totalRespondidas: number;
}

const areaColor: Record<string, "blue" | "purple" | "green" | "amber"> = {
  policial: "blue", judiciario: "purple", federal: "green", estadual: "amber",
};

export default function CartaoConcurso({ concurso, pctAcerto, totalRespondidas }: Props) {
  const navigate = useNavigate();
  const barColor = pctAcerto >= 70 ? "#3B6D11" : pctAcerto >= 50 ? "#185FA5" : "#7F77DD";

  return (
    <div
      onClick={() => navigate(`/concursos/${concurso.id}`)}
      style={{
        background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: 12, marginBottom: 10, padding: 13, cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#0C447C" strokeWidth="1.5">
            <rect x="3" y="4" width="14" height="13" rx="2" />
            <path d="M3 8h14M7 2v4M13 2v4" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a", margin: "0 0 2px" }}>{concurso.nome}</p>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{concurso.banca} · {concurso.nivel_formacao}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        <Badge color={areaColor[concurso.area as string] ?? "blue"}>{concurso.banca}</Badge>
        {concurso.peso_const_pct && (
          <Badge color="green">{concurso.peso_const_pct}% Dir. Const.</Badge>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[
          { val: totalRespondidas, lbl: "respondidas" },
          { val: `${pctAcerto}%`, lbl: "acerto" },
        ].map((s) => (
          <div key={s.lbl} style={{
            flex: 1, background: "#f4f6fb", borderRadius: 6, padding: "6px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#888" }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Progresso</span>
          <span style={{ fontSize: 11, color: "#888" }}>
            {totalRespondidas === 0 ? "Não iniciado" : `${pctAcerto}%`}
          </span>
        </div>
        <div style={{ height: 4, background: "#f4f6fb", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pctAcerto}%`, background: barColor, borderRadius: 99, transition: "width 0.4s" }} />
        </div>
      </div>
    </div>
  );
}
