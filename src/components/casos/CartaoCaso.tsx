// src/components/casos/CartaoCaso.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CasoDiaDia } from "@/types";
import Badge from "@/components/ui/Badge";
import VeredictoBox from "./VeredictoBox";

const catColor: Record<string, "blue" | "green" | "amber" | "purple"> = {
  escola: "green", trabalho: "blue", saude: "amber",
  policia: "purple", familia: "blue", consumidor: "amber",
};

interface Props { caso: CasoDiaDia }

export default function CartaoCaso({ caso }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{
      background: "#fff",
      border: `0.5px solid ${open ? "#B5D4F4" : "rgba(0,0,0,0.08)"}`,
      borderRadius: 12, marginBottom: 10, overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ padding: "12px 13px", display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", margin: "0 0 3px", lineHeight: 1.35 }}>
            {caso.titulo}
          </p>
          <p style={{ fontSize: 12, color: "#666", margin: "0 0 6px" }}>{caso.pergunta}</p>
          <div style={{ display: "flex", gap: 5 }}>
            <Badge color={catColor[caso.categoria] ?? "blue"}>{caso.categoria}</Badge>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="#888" strokeWidth="1.5"
          style={{ flexShrink: 0, marginTop: 2, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </div>

      {open && (
        <div style={{ padding: "0 13px 13px" }}>
          <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 10, marginBottom: 10 }}>
            <div style={{
              fontSize: 12, color: "#1a1a1a", lineHeight: 1.6,
              padding: "9px 11px", background: "#f4f6fb", borderRadius: 8,
            }}>
              <strong>Situação:</strong> {caso.situacao}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: "#888", margin: "0 0 6px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>O que a CF garante</p>
            <p style={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.55, margin: 0 }}>{caso.resposta}</p>
          </div>
          <VeredictoBox positivo={caso.veredicto_positivo ?? ""} negativo={caso.veredicto_negativo ?? ""} />
          <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
            <button
              onClick={() => navigate(`/artigos/${caso.artigo_id}`)}
              style={{
                flex: 1, padding: "7px 0", border: "0.5px solid rgba(0,0,0,0.12)",
                background: "#fff", borderRadius: 8, fontSize: 12,
                fontWeight: 500, cursor: "pointer", color: "#1a1a1a",
              }}
            >
              Ver artigo
            </button>
            <button
              onClick={() => navigate(`/casos/${caso.id}`)}
              style={{
                flex: 1, padding: "7px 0", border: "none",
                background: "#1a3a6e", borderRadius: 8, fontSize: 12,
                fontWeight: 500, cursor: "pointer", color: "#fff",
              }}
            >
              Fazer quiz ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
