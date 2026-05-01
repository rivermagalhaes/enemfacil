// src/components/artigos/ArtigosRelacionados.tsx
import { useNavigate } from "react-router-dom";
import type { Artigo } from "@/types";

interface Props { artigos: Pick<Artigo, "id" | "numero" | "ementa">[] }

export default function ArtigosRelacionados({ artigos }: Props) {
  const navigate = useNavigate();
  if (!artigos.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
        Artigos relacionados
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {artigos.map((a) => (
          <div
            key={a.id}
            onClick={() => navigate(`/artigos/${a.id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", background: "#f4f6fb",
              borderRadius: 8, cursor: "pointer",
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 500, background: "#E6F1FB",
              color: "#0C447C", borderRadius: 6, padding: "2px 7px", flexShrink: 0,
            }}>
              Art. {a.numero}º
            </span>
            <span style={{ fontSize: 12, color: "#1a1a1a" }}>{a.ementa}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
