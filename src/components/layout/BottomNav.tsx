// src/components/layout/BottomNav.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const CSS = `
@keyframes navpulse {
  0%,100%{transform:translateY(0) scale(1)}
  50%{transform:translateY(-4px) scale(1.06)}
}
@keyframes navring {
  0%,100%{box-shadow:0 4px 12px var(--nc)}
  50%{box-shadow:0 6px 22px var(--nc),0 0 0 5px rgba(0,0,0,0.04)}
}
@keyframes lockbounce {
  0%,100%{transform:translateY(0)}
  40%{transform:translateY(-5px)}
  70%{transform:translateY(-2px)}
}
@keyframes badgepop {
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.25)}
}
.nav-circle{animation:navpulse 2.8s ease-in-out infinite,navring 2.8s ease-in-out infinite}
.nav-circle:hover{animation:none!important;transform:scale(1.08)!important;transition:transform .15s}
.nav-lock{animation:lockbounce 2.2s ease-in-out infinite}
.nav-badge{animation:badgepop 2s ease-in-out infinite}
`;

const TABS = [
  {
    label: "Quiz", path: "/quiz", size: 44, mt: -10,
    color: "#2563eb", active: "#1e40af",
    icon: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="10" width="4" height="7" rx="1"/><rect x="8" y="6" width="4" height="11" rx="1"/><rect x="13" y="3" width="4" height="14" rx="1"/></svg>`,
  },
  {
    label: "CF/88", path: "/cf88", size: 54, mt: -20,
    color: "#1a3a6e", active: "#0f2347", badge: "NOVO",
    icon: `<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="12" height="16" rx="2"/><line x1="7" y1="7" x2="13" y2="7"/><line x1="7" y1="10" x2="13" y2="10"/><path d="M7 13l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    label: "Agente", path: "/agente", size: 44, mt: -10,
    color: "#0f6e56", active: "#085041", badge: "IA",
    icon: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><path d="M7 8h6M7 11h4" stroke-linecap="round"/><circle cx="14" cy="14" r="3" fill="currentColor" stroke="none"/><path d="M13 14h2M14 13v2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  {
    label: "Concursos", path: "/concursos", size: 44, mt: -10,
    color: "#7c3aed", active: "#5b21b6", badge: "PRO",
    icon: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h12M4 10h8M4 14h5"/><circle cx="15" cy="13" r="3"/></svg>`,
  },
  {
    label: "Perfil", path: "/perfil", size: 36, mt: -4,
    color: "#b45309", active: "#92400e",
    icon: `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>`,
  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const temPlano = profile?.plano !== "gratis" && profile?.plano != null;

  function isActive(path: string) {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  return (
    <>
      <style>{CSS}</style>
      <nav style={{
        borderTop: "0.5px solid rgba(0,0,0,0.08)",
        display: "flex", justifyContent: "space-around",
        alignItems: "flex-end", padding: "4px 4px 14px",
        background: "#fff", position: "sticky", bottom: 0,
      }}>
        {TABS.map((tab) => {
          const active = isActive(tab.path);
          const locked = (tab as any).requiresPlan && !temPlano;
          const bg = active ? tab.active : tab.color;
          const shadow = `${bg}66`;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(locked ? "/assinatura" : tab.path)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4,
                border: "none", background: "transparent",
                cursor: "pointer", padding: "0 4px",
                position: "relative", marginTop: tab.mt,
              }}
            >
              {/* Círculo */}
              <div
                className={active ? "" : "nav-circle"}
                style={{
                  width: tab.size, height: tab.size,
                  borderRadius: "50%", background: bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", position: "relative",
                  boxShadow: active ? `0 6px 18px ${bg}99` : `0 4px 12px ${shadow}`,
                  ["--nc" as string]: shadow,
                  transition: "background .2s",
                }}
                dangerouslySetInnerHTML={{ __html:
                  locked
                    ? `${tab.icon}<div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><svg class="nav-lock" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="7" width="10" height="8" rx="2"/><path d="M5 7V5a3 3 0 016 0v2"/></svg></div>`
                    : tab.icon
                }}
              />

              {/* Label */}
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? tab.active : "#555",
              }}>
                {tab.label}
              </span>

              {/* Badge */}
              {(tab as any).badge && !active && (
                <span className="nav-badge" style={{
                  position: "absolute", top: -2, right: -2,
                  background: locked ? "#7c3aed" : "#e53e3e",
                  color: "#fff", fontSize: 7, fontWeight: 800,
                  borderRadius: 99, padding: "1px 4px", lineHeight: 1.4,
                }}>
                  {(tab as any).badge}
                </span>
              )}

              {/* Ponto indicador de ativo */}
              {active && (
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: tab.active, marginTop: -2,
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
