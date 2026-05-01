// src/components/quiz/OpcoesCespe.tsx

interface OpcoesCespeProps {
  assertiva: string;
  gabarito: string | null;
  respostaUsuario: string | null;
  onResponder: (r: string) => void;
}

export default function OpcoesCespe({ assertiva, gabarito, respostaUsuario, onResponder }: OpcoesCespeProps) {
  const respondido = respostaUsuario !== null;

  function classeBtn(opcao: string): "neutro" | "certo" | "errado" {
    if (!respondido) return "neutro";
    const g = (gabarito ?? "").toLowerCase();
    const r = (respostaUsuario ?? "").toLowerCase();
    const o = opcao.toLowerCase();
    if (o === g) return "certo";
    if (o === r) return "errado";
    return "neutro";
  }

  const estilos: Record<string, React.CSSProperties> = {
    neutro: { background: "#fff", borderColor: "rgba(0,0,0,0.15)", color: "#1a1a1a" },
    certo:  { background: "#EAF3DE", borderColor: "#3B6D11", color: "#27500A" },
    errado: { background: "#FCEBEB", borderColor: "#A32D2D", color: "#791F1F" },
  };

  const opcoes = ["certo", "errado"];

  return (
    <div style={{
      background: "#f4f6fb", borderRadius: 8,
      padding: "10px 12px", marginBottom: 10,
    }}>
      <p style={{
        fontSize: 12, color: "#1a1a1a", lineHeight: 1.55,
        margin: "0 0 10px", fontFamily: "Georgia, serif",
      }}>
        {assertiva}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {opcoes.map((op) => (
          <button
            key={op}
            disabled={respondido}
            onClick={() => onResponder(op)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: "0.5px solid",
              fontSize: 13, fontWeight: 500,
              cursor: respondido ? "default" : "pointer",
              transition: "all 0.15s",
              ...estilos[classeBtn(op)],
            }}
          >
            {op === "certo" ? "Certo" : "Errado"}
          </button>
        ))}
      </div>
    </div>
  );
}
