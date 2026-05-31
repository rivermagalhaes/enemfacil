// src/components/layout/AppLayout.tsx
// Layout responsivo estilo Duolingo:
// - Mobile: app normal full width
// - Desktop: sidebar fixa + app centralizado 390px + fundo decorativo

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CORES } from "@/styles/theme";

const TABS = [
  { path: "/",               icon: "🏠", label: "Início"     },
  { path: "/quiz",           icon: "🧠", label: "Quiz"       },
  { path: "/simulado",       icon: "📝", label: "Simulado"   },
  { path: "/meu-desempenho", icon: "📊", label: "Desempenho" },
  { path: "/agentes",        icon: "🤖", label: "Agente IA"  },
  { path: "/perfil",         icon: "👤", label: "Perfil"     },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 900 : false
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isDesktop;
}

function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const role = (profile as any)?.role;
  const nome = ((profile as any)?.nome ?? (profile as any)?.username) ?? "Estudante";
  const xp = (profile as any)?.xp_total ?? 0;

  const tabs = [
    ...TABS,
    ...(role === "admin"     ? [{ path: "/admin",              icon: "🛡️",  label: "Admin"     }] : []),
    ...(role === "admin"     ? [{ path: "/coordenacao/dashboard", icon: "🏫", label: "Coord."   }] : []),
    ...(role === "professor" ? [{ path: "/professor/dashboard", icon: "👨‍🏫", label: "Dashboard" }] : []),
  ];

  return (
    <div style={{
      width: 220,
      height: "100vh",
      background: "#0A0F1E",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      padding: "28px 16px 20px",
      position: "fixed",
      left: 0, top: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28, padding:"0 6px" }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#0057FF,#6D28D9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎯</div>
        <div>
          <p style={{ fontSize:15, fontWeight:800, color:"#fff", margin:0, letterSpacing:"-0.3px" }}>EnemFácil</p>
          <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:0 }}>Plataforma de estudos</p>
        </div>
      </div>

      {/* Avatar */}
      <div onClick={() => navigate("/perfil")} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"10px 12px", marginBottom:20, cursor:"pointer", border:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${CORES.primary},#6D28D9)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff", flexShrink:0 }}>
          {nome[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:600, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nome}</p>
          <p style={{ fontSize:11, color:"#fbbf24", margin:0 }}>⚡ {xp.toLocaleString("pt-BR")} XP</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display:"flex", flexDirection:"column", gap:2, flex:1 }}>
        {tabs.map(tab => {
          const ativo = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 12px", borderRadius:10,
              background: ativo ? "rgba(0,87,255,0.15)" : "transparent",
              border: ativo ? "1px solid rgba(0,87,255,0.3)" : "1px solid transparent",
              cursor:"pointer", textAlign:"left",
            }}>
              <span style={{ fontSize:17, flexShrink:0 }}>{tab.icon}</span>
              <span style={{ fontSize:13, fontWeight: ativo ? 600 : 400, color: ativo ? "#60a5fa" : "rgba(255,255,255,0.55)" }}>
                {tab.label}
              </span>
              {ativo && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:"#60a5fa" }} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <p style={{ fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"center", margin:0, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        EnemFácil © 2025
      </p>
    </div>
  );
}

function BottomNavMobile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const role = (profile as any)?.role;

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/professor") || pathname.startsWith("/coordenacao");

  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:100, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)", borderTop:"0.5px solid rgba(0,0,0,0.08)", display:"flex", padding:"8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
      {TABS.map(tab => {
        const ativo = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, border:"none", background:"transparent", cursor:"pointer", padding:"4px 0" }}>
            <div style={{ width:36, height:36, borderRadius:12, background: ativo ? CORES.primaryLight : "transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
              {tab.icon}
            </div>
            <span style={{ fontSize:10, fontWeight: ativo ? 700 : 400, color: ativo ? CORES.primary : CORES.textSub }}>{tab.label}</span>
          </button>
        );
      })}
      {(role === "admin" || role === "professor" || role === "super_admin") && (
        <button
          onClick={() => navigate(
            role === "super_admin" ? "/coordenacao/dashboard" :
            role === "admin"       ? "/admin" :
            "/professor/dashboard"
          )}
          style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, border:"none", background:"transparent", cursor:"pointer", padding:"4px 0" }}
        >
          <div style={{ width:36, height:36, borderRadius:12, background: isAdminArea ? "#FFF1F1" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
            {role === "admin" || role === "super_admin" ? "🛡️" : "👨‍🏫"}
          </div>
          <span style={{ fontSize:10, fontWeight: isAdminArea ? 700 : 400, color: isAdminArea ? "#ef4444" : CORES.textSub }}>
            {role === "super_admin" ? "Coord" : role === "admin" ? "Admin" : "Prof"}
          </span>
        </button>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <Sidebar />
        <div style={{ marginLeft:220, flex:1, minHeight:"100vh" }}>
          {children}
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div style={{ minHeight:"100dvh", maxWidth:480, margin:"0 auto" }}>
      {children}
      <BottomNavMobile />
    </div>
  );
}
