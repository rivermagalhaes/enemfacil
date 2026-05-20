// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/auth/Login";
import Home from "@/pages/home/Home";
import Quiz from "@/pages/quiz/Quiz";
import Simulado from "@/pages/simulado/Simulado";
import AgenteEnem from "@/pages/agente/AgenteEnem";
import AgentesHome from "@/pages/agente/AgentesHome";
import AgenteVestibular from "@/pages/agente/AgenteVestibular";
import Perfil from "@/pages/perfil/Perfil";
import Assinatura from "@/pages/perfil/Assinatura";
import Redacao from "@/pages/redacao/Redacao";
import TrilhaQuimica from "@/pages/trilha/TrilhaQuimica";
import VestibularHub from "@/pages/vestibular/VestibularHub";
import TrilhaFisica from "@/pages/trilha/TrilhaFisica";
import TrilhaMatematica from "@/pages/trilha/TrilhaMatematica";
import TrilhaPortugues from "@/pages/trilha/TrilhaPortugues";
import TrilhaIngles from "@/pages/trilha/TrilhaIngles";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ProfessorDashboard from "@/pages/admin/ProfessorDashboard";
import TrilhaFisicoQuimica from "@/pages/trilha/TrilhaFisicoQuimica";
import SalaVirtual from "@/pages/sala/SalaVirtual";
import SalaVirtualProfessor from "@/pages/sala/SalaVirtualProfessor";
import SimuladoAluno from "@/pages/sala/SimuladoAluno";
import TrilhaHumanas from "@/pages/trilha/TrilhaHumanas";
import OlimpiadasQuimica from "@/pages/olimpiadas/OlimpiadasQuimica";
import CorrecaoQR from "@/pages/admin/CorrecaoQR";
import ModuloPage from "@/pages/trilha/ModuloPage";
import MeusCertificados from "@/pages/certificados/MeusCertificados";
import ValidarCertificado from "@/pages/certificados/ValidarCertificado";
import OlimpiadaHub from "@/pages/olimpiadas/OlimpiadaHub";
import ProvaOlimpiada from "@/pages/olimpiadas/ProvaOlimpiada";
import AdminOlimpiada from "@/pages/olimpiadas/AdminOlimpiada";

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
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/quiz/vestibular/:vestibular" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/quiz/:area" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/simulado" element={<PrivateRoute><Simulado /></PrivateRoute>} />
        <Route path="/agente" element={<PrivateRoute><AgenteEnem /></PrivateRoute>} />
        <Route path="/agentes" element={<PrivateRoute><AgentesHome /></PrivateRoute>} />
        <Route path="/agentes/:vestibular" element={<PrivateRoute><AgenteVestibular /></PrivateRoute>} />
        <Route path="/vestibular/:vestibular" element={<PrivateRoute><VestibularHub /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/quimica" element={<PrivateRoute><TrilhaQuimica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/fisica" element={<PrivateRoute><TrilhaFisica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/matematica" element={<PrivateRoute><TrilhaMatematica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/portugues" element={<PrivateRoute><TrilhaPortugues /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/ingles" element={<PrivateRoute><TrilhaIngles /></PrivateRoute>} />
        <Route path="/olimpiadas/quimica" element={<PrivateRoute><OlimpiadasQuimica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/humanas" element={<PrivateRoute><TrilhaHumanas /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/fisicoquimica" element={<PrivateRoute><TrilhaFisicoQuimica /></PrivateRoute>} />

        {/* Rota do módulo com tópicos — ex: /trilha/ENEM/matematica/modulo/fundamentos */}
        <Route path="/trilha/:vestibular/:materia/modulo/:moduloId" element={<PrivateRoute><ModuloPage /></PrivateRoute>} />

        <Route path="/redacao" element={<PrivateRoute><Redacao /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/assinatura" element={<PrivateRoute><Assinatura /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/professor" element={<PrivateRoute><ProfessorDashboard /></PrivateRoute>} />
        <Route path="/sala" element={<PrivateRoute><SalaVirtual /></PrivateRoute>} />
        <Route path="/sala/:id" element={<PrivateRoute><SalaVirtual /></PrivateRoute>} />
        <Route path="/sala/professor" element={<PrivateRoute><SalaVirtualProfessor /></PrivateRoute>} />
        <Route path="/sala/:salaId/simulados" element={<PrivateRoute><SimuladoAluno /></PrivateRoute>} />
        <Route path="/correcao/:assignmentId/:studentId" element={<PrivateRoute><CorrecaoQR /></PrivateRoute>} />
       <Route path="/certificado/:codigo" element={<ValidarCertificado />} />
       <Route path="/certificados" element={<PrivateRoute><MeusCertificados /></PrivateRoute>} />
       <Route path="/olimpiada/:id" element={<PrivateRoute><OlimpiadaHub /></PrivateRoute>} />
       <Route path="/olimpiada/:id/prova/:provaId" element={<PrivateRoute><ProvaOlimpiada /></PrivateRoute>} />
       <Route path="/olimpiada/:id/admin" element={<PrivateRoute><AdminOlimpiada /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
