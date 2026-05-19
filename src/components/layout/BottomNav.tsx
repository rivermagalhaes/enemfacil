// src/components/layout/BottomNav.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CORES } from "@/styles/theme";
import { useState, useEffect } from "react";

const TABS = [
  { path: "/",        icon: "🏠", label: "Início"    },
  { path: "/quiz",    icon: "🧠", label: "Quiz"      },
  { path: "/simulado",icon: "📝", label: "Simulado"  },
  { path: "/agentes", icon: "🤖", label: "Agente IA" },
  { path: "/perfil",  icon: "👤", label: "Perfil"    },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const role = (profile as any)?.role;

  // Não renderiza no desktop — a sidebar cuida da navegação
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  if (isDesktop) return null;

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
      {(role === "admin" || role === "professor") && (
        <button
          onClick={() => navigate(role === "admin" ? "/admin" : "/professor")}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, border: "none",
            background: "transparent", cursor: "pointer", padding: "4px 0",
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: pathname.startsWith("/admin") || pathname.startsWith("/professor") ? "#FFF1F1" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, transition: "all 0.2s",
          }}>
            {role === "admin" ? "🛡️" : "👨‍🏫"}
          </div>
          <span style={{
            fontSize: 10, fontWeight: pathname.startsWith("/admin") || pathname.startsWith("/professor") ? 700 : 400,
            color: pathname.startsWith("/admin") || pathname.startsWith("/professor") ? "#ef4444" : CORES.textSub,
          }}>
            {role === "admin" ? "Admin" : "Prof"}
          </span>
        </button>
      )}
    </div>
  );
}
