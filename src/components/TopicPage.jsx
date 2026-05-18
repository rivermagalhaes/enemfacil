const accentColors = {
  violet: "#7C3AED",
  indigo: "#4F46E5",
  blue: "#2563EB",
  sky: "#0284C7",
};

export default function TopicPage({ topic, onBack }) {
  const accent = accentColors[topic.color] || "#6C63FF";

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
      width: "100%", maxWidth: 440, overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)", margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{ background: "#6C63FF", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(255,255,255,0.2)", border: "none",
            color: "#fff", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >←</button>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accent, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>{topic.icon}</div>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{topic.title}</span>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: "20px 24px", maxHeight: 380, overflowY: "auto" }}>
        {topic.sections.map((section, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#6C63FF",
              textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8,
            }}>{section.heading}</div>

            {section.body && (
              <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.65, marginBottom: 8 }}>
                {section.body}
              </p>
            )}

            {section.formula && (
              <div style={{
                background: "#f8f7ff", borderLeft: `4px solid ${accent}`,
                borderRadius: "0 10px 10px 0", padding: "10px 16px",
                fontFamily: "monospace", fontSize: 15, color: "#1f2937",
                margin: "8px 0",
              }}>{section.formula}</div>
            )}

            {section.chips && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {section.chips.map((chip, j) => (
                  <span key={j} style={{
                    fontSize: 12, padding: "5px 12px", borderRadius: 99,
                    background: "#f5f3ff", color: "#5b21b6",
                    border: "1px solid #ddd6fe", fontWeight: 500,
                  }}>{chip}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div style={{
        padding: "16px 24px", borderTop: "1px solid #f3f4f6",
        display: "flex", gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: "11px 0", border: "1px solid #e5e7eb",
            background: "#fff", borderRadius: 12, fontSize: 14,
            color: "#374151", cursor: "pointer", fontWeight: 500,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
        >← Voltar</button>
        <button
          onClick={() => alert(`Abrir chat: ${topic.title}`)}
          style={{
            flex: 1, padding: "11px 0", background: "#6C63FF", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#5a52e0"}
          onMouseLeave={e => e.currentTarget.style.background = "#6C63FF"}
        >💬 Tirar dúvida</button>
      </div>
    </div>
  );
}
