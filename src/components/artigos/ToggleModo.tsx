// src/components/artigos/ToggleModo.tsx
interface ToggleModoProps {
  modo: "facil" | "original";
  onChange: (m: "facil" | "original") => void;
}

export default function ToggleModo({ modo, onChange }: ToggleModoProps) {
  return (
    <div style={{
      display: "flex", background: "rgba(255,255,255,0.1)",
      borderRadius: 20, padding: 3, gap: 2, marginTop: 10,
    }}>
      {(["facil", "original"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            flex: 1, padding: "5px 0", borderRadius: 16, border: "none",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: modo === m ? "#fff" : "transparent",
            color: modo === m ? "#1a3a6e" : "rgba(255,255,255,0.75)",
            transition: "all 0.2s",
          }}
        >
          {m === "facil" ? "Linguagem fácil" : "Texto original"}
        </button>
      ))}
    </div>
  );
}
