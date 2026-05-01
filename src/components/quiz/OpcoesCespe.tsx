// src/components/quiz/OpcoesCespe.tsx
import type { Gabarito } from "@/types";

interface OpcoesCespeProps {
  assertiva: string;
  gabarito: Gabarito | null;
  respostaUsuario: Gabarito | null;
  onResponder: (r: Gabarito) => void;
}

export default function OpcoesCespe({ assertiva, gabarito, respostaUsuario, onResponder }: OpcoesCespeProps) {
  const respondido = respostaUsuario !== null;

  function classeBtn(opcao: string) {
    if (!respondido) return "neutro";
    if (opcao === (gabarito ?? "").toLowerCase()) return "certo";
    if (opcao === (respostaUsuario ?? "").toLowerCase()) return "errado";
    return "neutro";
  }

  const estilos: Record<string, React.CSSProperties> = {
    neutro: { background: "#fff", borderColor: "rgba(0,0,0,0.15)", color: "#1a1a1a" },
    certo:  { background: "#EAF3DE", borderColor: "#3B6D11", color: "#27500A" },
    errado: { background: "#FCEBEB", borderColor: "#A32D2D", color: "#791F1F" },
  };

  const opcoes: { valor: Gabarito; label: string }[] = [
    { valor: "certo" as Gabarito, label: "Certo" },
    { valor: "errado" as Gabarito, label: "Errado" },
  ];

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
      <p style={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.55, margin: "0 0 10px", fontFamily: "Georgia, serif" }}>
        {assertiva}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {opcoes.map(({ valor, label }) => (
          <button key={valor} disabled={respondido} onClick={() => onResponder(valor)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "0.5px solid", fontSize: 13, fontWeight: 500, cursor: respondido ? "default" : "pointer", transition: "all 0.15s", ...estilos[classeBtn(valor)] }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
