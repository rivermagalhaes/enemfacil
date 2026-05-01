// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/auth/Login";
import Home from "@/pages/home/Home";
import Quiz from "@/pages/quiz/Quiz";
import Simulado from "@/pages/simulado/Simulado";
import AgenteEnem from "@/pages/agente/AgenteEnem";
import Perfil from "@/pages/perfil/Perfil";
import Assinatura from "@/pages/perfil/Assinatura";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#0A0F1E" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 48, margin: "0 0 12px" }}>🎯</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Carregando...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/quiz/:area" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/simulado" element={<PrivateRoute><Simulado /></PrivateRoute>} />
        <Route path="/agente" element={<PrivateRoute><AgenteEnem /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/assinatura" element={<PrivateRoute><Assinatura /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
