// src/components/artigos/CardInciso.tsx
import type { Inciso } from "@/types";

interface CardIncisoProps {
  inciso: Inciso;
  modo: "facil" | "original";
}

export default function CardInciso({ inciso, modo }: CardIncisoProps) {
  const texto = modo === "facil" && inciso.texto_simples
    ? inciso.texto_simples
    : inciso.texto_original;

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: "9px 11px" }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#185FA5", marginBottom: 3 }}>
        {inciso.identificador}
      </div>
      <p style={{
        fontSize: 12, color: "#1a1a1a", lineHeight: 1.5, margin: 0,
        fontFamily: modo === "original" ? "Georgia, serif" : "inherit",
      }}>
        {texto}
      </p>
    </div>
  );
}
