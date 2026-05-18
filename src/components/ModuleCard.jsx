import { module } from "../data/topics";

const numberColors = ["#7C3AED", "#4F46E5", "#2563EB", "#0284C7"];

export default function ModuleCard({ onSelectTopic, onComplete }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #e5e7eb", width: "100%", maxWidth: 440,
      overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", margin: "0 auto",
    }}>
      <div style={{ background: "#6C63FF", padding: "20px 24px 24px" }}>
        <div style={{ height: 5, background: "rgba(255,255,255,0.25)", borderRadius: 99, marginBottom: 16 }}>
          <div style={{ height: "100%", width: "30%", background: "#fff", borderRadius: 99 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>📚</div>
          <div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>{module.title}</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 }}>
              ⚡ {module.xp} XP ao concluir
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={{
            fontSize: 12, color: "rgba(255,255,255,0.9)",
            background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: 99,
          }}>Tópicos</span>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#f97316",
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 16,
        }}>📖 O que você vai aprender</div>

        {module.topics.map((topic, i) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e7eb",
              background: "#fff", cursor: "pointer", marginBottom: 10, textAlign: "left",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: "50%",
              background: numberColors[i] || "#6C63FF", color: "#fff",
              fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{topic.number}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#1f2937" }}>{topic.title}</span>
            <span style={{ color: "#9ca3af", fontSize: 20 }}>›</span>
          </button>
        ))}

        <button
          onClick={onComplete}
          style={{
            width: "100%", padding: 14, background: "#6C63FF", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginTop: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#5a52e0"}
          onMouseLeave={e => e.currentTarget.style.background = "#6C63FF"}
        >
          Marcar como concluída ✓
        </button>
      </div>
    </div>
  );
}
