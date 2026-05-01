// src/components/layout/BottomNav.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { CORES } from "@/styles/theme";

const TABS = [
  { path: "/",        icon: "🏠", label: "Início"    },
  { path: "/quiz",    icon: "🧠", label: "Quiz"      },
  { path: "/simulado",icon: "📝", label: "Simulado"  },
  { path: "/agente",  icon: "🤖", label: "Agente IA" },
  { path: "/perfil",  icon: "👤", label: "Perfil"    },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(255,255,255,0.95)",
      backdropFilter: "blur(20px)",
      borderTop: "0.5px solid rgba(0,0,0,0.08)",
      display: "flex", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
    }}>
      {TABS.map(tab => {
        const ativo = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2, border: "none",
              background: "transparent", cursor: "pointer", padding: "4px 0",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: ativo ? CORES.primaryLight : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all 0.2s",
            }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: 10, fontWeight: ativo ? 700 : 400,
              color: ativo ? CORES.primary : CORES.textSub,
              transition: "all 0.2s",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
