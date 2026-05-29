// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
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
import TrilhaHistoria from "@/pages/trilha/TrilhaHistoria";
import TrilhaGeografia from "@/pages/trilha/TrilhaGeografia";
import TrilhaFilosofia from "@/pages/trilha/TrilhaFilosofia";
import TrilhaBiologia from "@/pages/trilha/TrilhaBiologia";
import TrilhaRedacao from "@/pages/trilha/TrilhaRedacao";
import TrilhaOrganica from "@/pages/trilha/TrilhaOrganica";
import CorrecaoQR from "@/pages/admin/CorrecaoQR";
import ModuloPage from "@/pages/trilha/ModuloPage";
import MeusCertificados from "@/pages/certificados/MeusCertificados";
import ValidarCertificado from "@/pages/certificados/ValidarCertificado";
import OlimpiadasHub from "@/pages/olimpiadas/OlimpiadasHub";
import OlimpiadaHub from "@/pages/olimpiadas/OlimpiadaHub";
import ProvaOlimpiada from "@/pages/olimpiadas/ProvaOlimpiada";
import AdminOlimpiada from "@/pages/olimpiadas/AdminOlimpiada";
import CoordenadorDashboard from "@/pages/olimpiadas/CoordenadorDashboard";
import GerarConteudoLote from "@/pages/admin/GerarConteudoLote";
import ProcessarMaterial from "@/pages/admin/ProcessarMaterial";
import CadastroConvite from "@/pages/cadastro/CadastroConvite";
import InscricaoOlimpiada from "@/pages/cadastro/InscricaoOlimpiada";

const Loading = ({ bg = "#0f172a" }: { bg?: string }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh", background: bg }}>
    <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)" }}>Carregando...</p>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading bg="#0A0F1E" />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PrivateRouteFull({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function ProfessorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single()
      .then(({ data }) => {
        const r = data?.role;
        setAllowed(r === "professor" || r === "admin" || r === "super_admin");
      });
  }, [user]);

  if (loading || allowed === null) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Rotas públicas ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroConvite />} />
        <Route path="/certificado/:codigo" element={<ValidarCertificado />} />
        <Route path="/inscricao/:sigla" element={<InscricaoOlimpiada />} />

        {/* ── Rotas do aluno ── */}
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/quiz/vestibular/:vestibular" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/quiz/:area" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/simulado" element={<PrivateRoute><Simulado /></PrivateRoute>} />
        <Route path="/redacao" element={<PrivateRoute><Redacao /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/assinatura" element={<PrivateRoute><Assinatura /></PrivateRoute>} />
        <Route path="/certificados" element={<PrivateRoute><MeusCertificados /></PrivateRoute>} />

        {/* ── Agentes ── */}
        <Route path="/agente" element={<PrivateRoute><AgenteEnem /></PrivateRoute>} />
        <Route path="/agentes" element={<PrivateRoute><AgentesHome /></PrivateRoute>} />
        <Route path="/agentes/:vestibular" element={<PrivateRoute><AgenteVestibular /></PrivateRoute>} />

        {/* ── Vestibular / Trilhas ── */}
        <Route path="/vestibular/:vestibular" element={<PrivateRouteFull><VestibularHub /></PrivateRouteFull>} />
        <Route path="/trilha/:vestibular/quimica" element={<PrivateRoute><TrilhaQuimica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/fisica" element={<PrivateRoute><TrilhaFisica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/matematica" element={<PrivateRoute><TrilhaMatematica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/portugues" element={<PrivateRoute><TrilhaPortugues /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/ingles" element={<PrivateRoute><TrilhaIngles /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/humanas" element={<PrivateRoute><TrilhaHumanas /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/historia" element={<PrivateRoute><TrilhaHistoria /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/geografia" element={<PrivateRoute><TrilhaGeografia /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/filosofia" element={<PrivateRoute><TrilhaFilosofia /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/biologia" element={<PrivateRoute><TrilhaBiologia /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/redacao" element={<PrivateRoute><TrilhaRedacao /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/organica" element={<PrivateRoute><TrilhaOrganica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/fisicoquimica" element={<PrivateRoute><TrilhaFisicoQuimica /></PrivateRoute>} />
        <Route path="/trilha/:vestibular/:materia/modulo/:moduloId" element={<PrivateRoute><ModuloPage /></PrivateRoute>} />

        {/* ── Olimpíadas ── */}
        <Route path="/olimpiadas" element={<PrivateRouteFull><OlimpiadasHub /></PrivateRouteFull>} />
        <Route path="/olimpiadas/quimica" element={<Navigate to="/olimpiadas" replace />} />
        <Route path="/olimpiada/:id/prova/:provaId" element={<PrivateRouteFull><ProvaOlimpiada /></PrivateRouteFull>} />
        <Route path="/olimpiada/:id/admin" element={<PrivateRouteFull><AdminOlimpiada /></PrivateRouteFull>} />
        <Route path="/olimpiada/:id" element={<PrivateRouteFull><OlimpiadaHub /></PrivateRouteFull>} />

        {/* ── Sala virtual ── */}
        <Route path="/sala/professor" element={<ProfessorRoute><SalaVirtualProfessor /></ProfessorRoute>} />
        <Route path="/sala" element={<PrivateRoute><SalaVirtual /></PrivateRoute>} />
        <Route path="/sala/:id" element={<PrivateRoute><SalaVirtual /></PrivateRoute>} />
        <Route path="/sala/:salaId/simulados" element={<PrivateRoute><SimuladoAluno /></PrivateRoute>} />

        {/* ── Correção QR ── */}
        <Route path="/correcao/:assignmentId/:studentId" element={<ProfessorRoute><CorrecaoQR /></ProfessorRoute>} />

        {/* ── Coordenador ── */}
        <Route path="/coordenador" element={<PrivateRoute><CoordenadorDashboard /></PrivateRoute>} />

        {/* ── Admin ── */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/gerar-conteudo" element={<AdminRoute><GerarConteudoLote /></AdminRoute>} />
        <Route path="/admin/processar-material" element={<AdminRoute><ProcessarMaterial /></AdminRoute>} />

        {/* ── Professor ── */}
        <Route path="/professor" element={<ProfessorRoute><ProfessorDashboard /></ProfessorRoute>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
