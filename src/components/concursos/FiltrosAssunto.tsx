// src/components/concursos/FiltrosAssunto.tsx
interface Props {
  assuntos: string[];
  ativo: string;
  onChange: (a: string) => void;
}

export default function FiltrosAssunto({ assuntos, ativo, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "12px 14px 0", flexWrap: "wrap" }}>
      {["Todos", ...assuntos].map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          style={{
            padding: "5px 11px", borderRadius: 99, fontSize: 12, fontWeight: 500,
            cursor: "pointer", border: "0.5px solid",
            background: ativo === a ? "#1a3a6e" : "#fff",
            color: ativo === a ? "#fff" : "#666",
            borderColor: ativo === a ? "#1a3a6e" : "rgba(0,0,0,0.12)",
            transition: "all 0.15s",
          }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
