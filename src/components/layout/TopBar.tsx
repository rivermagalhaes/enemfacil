// src/components/layout/TopBar.tsx
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
  subtitle?: string;
  xp?: number;
  showBack?: boolean;
  showLogo?: boolean;
  right?: React.ReactNode;
  progress?: number; // 0-100
}

export default function TopBar({ title, subtitle, xp, showBack, showLogo, right, progress }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ background: "#0a1628", padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: subtitle ? 6 : 0 }}>
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,255,255,0.12)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
          )}

          {showLogo ? (
            <img src="/logo.png" alt="CFfácil" style={{ height: 32, objectFit: "contain" }} />
          ) : (
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#fff" }}>{title}</span>
          )}

          <div style={{ flex: 1 }} />

          {xp !== undefined && (
            <span style={{
              background: "rgba(255,255,255,0.15)", borderRadius: 99,
              padding: "3px 10px", fontSize: 12, color: "#fff",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f0c040", display: "inline-block" }} />
              {xp} XP
            </span>
          )}
          {right}
        </div>
        {subtitle && (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{subtitle}</span>
        )}
      </div>
      {progress !== undefined && (
        <div style={{ height: 4, background: "rgba(0,0,0,0.06)" }}>
          <div style={{
            height: "100%", background: "#4ece9a",
            width: `${progress}%`, transition: "width 0.3s ease",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>
      )}
    </div>
  );
}
