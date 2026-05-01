import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // ajuste o caminho

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_study_days: number;
  total_xp: number;
  last_7_days: boolean[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getLastSevenDayLabels(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return DAYS[d.getDay()];
  });
}

function FlameIcon({ size = 20, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-2.5-1.5-5-2.5-6.5C13.5 8.5 13 10 13 11c0 .55-.45 1-1 1s-1-.45-1-1c0-1.5.8-3.5 1-4.5-.7 1-2 3-2 5.5a3 3 0 006 0c0-3-2-7-4-9z"
        fill={lit ? "#EF9F27" : "#374151"}
        fillOpacity={lit ? 1 : 0.5}
      />
    </svg>
  );
}

export default function StreakWidget() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStreak, setNewStreak] = useState(false);

  const dayLabels = getLastSevenDayLabels();

  useEffect(() => {
    fetchStreak();
  }, []);

  async function fetchStreak() {
    setLoading(true);
    const { data: row, error } = await supabase
      .from("my_streak")
      .select("*")
      .maybeSingle();

    if (!error && row) setData(row as StreakData);
    setLoading(false);
  }

  async function handleStudyNow() {
    const { data: result, error } = await supabase.rpc("register_study_activity", {
      p_xp: 10,
      p_articles: 1,
      p_quizzes: 0,
    });

    if (!error && result) {
      if (result.is_new_day) {
        setNewStreak(true);
        setTimeout(() => setNewStreak(false), 2500);
      }
      fetchStreak();
    }
  }

  const studiedToday = data?.last_activity_date === new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.04)", borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "1.5rem", width: "100%", maxWidth: 360,
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 140,
      }}>
        <div style={{ color: "#4B5563", fontFamily: "system-ui", fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{
      background: "linear-gradient(145deg, #111827 0%, #0d1117 100%)",
      borderRadius: 20,
      border: newStreak ? "1px solid rgba(239,159,39,0.6)" : "1px solid rgba(255,255,255,0.08)",
      padding: "1.5rem",
      width: "100%",
      maxWidth: 360,
      position: "relative",
      overflow: "hidden",
      transition: "border-color 0.3s",
      boxSizing: "border-box",
    }}>
      {/* Glow de fundo ao acender streak */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 140, height: 140, borderRadius: "50%",
        background: newStreak ? "rgba(239,159,39,0.12)" : "rgba(83,74,183,0.08)",
        transition: "background 0.5s",
        pointerEvents: "none",
      }} />

      {/* Streak principal */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            animation: newStreak ? "pulse 0.6s ease" : undefined,
          }}>
            <FlameIcon size={36} lit={studiedToday} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{
                fontSize: 36, fontWeight: "normal", fontFamily: "Georgia, serif",
                color: studiedToday ? "#EF9F27" : "#4B5563",
                transition: "color 0.4s",
              }}>
                {data.current_streak}
              </span>
              <span style={{ fontSize: 15, color: "#6B7280", fontFamily: "system-ui" }}>
                {data.current_streak === 1 ? "dia" : "dias"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#4B5563", fontFamily: "system-ui" }}>
              streak atual
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: "#AFA9EC", fontFamily: "Georgia, serif" }}>
            {data.total_xp} XP
          </div>
          <div style={{ fontSize: 12, color: "#4B5563", fontFamily: "system-ui" }}>
            recorde: {data.longest_streak}d
          </div>
        </div>
      </div>

      {/* 7 dias */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: "1.25rem",
      }}>
        {dayLabels.map((day, i) => {
          const active = data.last_7_days?.[i] ?? false;
          const isToday = i === 6;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: active
                  ? "rgba(239,159,39,0.15)"
                  : isToday ? "rgba(255,255,255,0.04)" : "transparent",
                border: isToday
                  ? "1.5px solid rgba(255,255,255,0.15)"
                  : active ? "1.5px solid rgba(239,159,39,0.4)" : "1.5px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                <FlameIcon size={16} lit={active} />
              </div>
              <span style={{
                fontSize: 10, fontFamily: "system-ui",
                color: isToday ? "#9CA3AF" : "#4B5563",
                fontWeight: isToday ? 500 : 400,
              }}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats pequenos */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, marginBottom: "1.25rem",
      }}>
        {[
          { label: "Dias estudados", value: data.total_study_days },
          { label: "Recorde", value: `${data.longest_streak}d` },
        ].map((s, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10, padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 18, color: "#D1D5DB", fontFamily: "Georgia, serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#4B5563", fontFamily: "system-ui", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!studiedToday && (
        <button
          onClick={handleStudyNow}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(90deg, #BA7517, #EF9F27)",
            color: "#fff", fontSize: 15, cursor: "pointer",
            fontFamily: "system-ui", fontWeight: 500,
            boxShadow: "0 4px 20px rgba(239,159,39,0.25)",
          }}
        >
          Estudar hoje — manter streak
        </button>
      )}

      {studiedToday && (
        <div style={{
          textAlign: "center", padding: "10px 0",
          fontSize: 14, color: "#5DCAA5", fontFamily: "system-ui",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#5DCAA5" strokeWidth="1.2"/>
            <path d="M5 8l2 2 4-4" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Você já estudou hoje!
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
