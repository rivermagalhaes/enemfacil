// src/components/casos/VeredictoBox.tsx
interface Props { positivo: string; negativo: string }

export default function VeredictoBox({ positivo, negativo }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ background: "#EAF3DE", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#3B6D11", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        </div>
        <p style={{ fontSize: 12, color: "#27500A", lineHeight: 1.5, margin: 0 }}>{positivo}</p>
      </div>
      <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#A32D2D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
          </svg>
        </div>
        <p style={{ fontSize: 12, color: "#791F1F", lineHeight: 1.5, margin: 0 }}>{negativo}</p>
      </div>
    </div>
  );
}
