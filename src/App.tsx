// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/auth/Login";
import Onboarding from "@/pages/auth/Onboarding";
import QuizHome from "@/pages/quiz/QuizHome";
import QuizSessao from "@/pages/quiz/QuizSessao";
import QuizResultado from "@/pages/quiz/QuizResultado";
import ArtigosLista from "@/pages/artigos/ArtigosLista";
import ArtigoDetalhe from "@/pages/artigos/ArtigoDetalhe";
import CF88Home from "@/pages/cf88/CF88Home";
import CF88Artigo from "@/pages/cf88/CF88Artigo";
import CasosLista from "@/pages/casos/CasosLista";
import CasoDetalhe from "@/pages/casos/CasoDetalhe";
import ConcursosLista from "@/pages/concursos/ConcursosLista";
import ConcursoDetalhe from "@/pages/concursos/ConcursoDetalhe";
import Perfil from "@/pages/perfil/Perfil";
import Assinatura from "@/pages/perfil/Assinatura";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import MapaMentalJuridico from "@/pages/ferramentas/MapaMentalJuridico";
import MapaMentalEducacional from "@/pages/ferramentas/MapaMentalEducacional";
import MapaMentalVisual from "@/pages/ferramentas/MapaMentalVisual";
import AgenteJuridico from "@/pages/agente/AgenteJuridico";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/perfil" replace />} />
        <Route path="/quiz" element={<PrivateRoute><QuizHome /></PrivateRoute>} />
        <Route path="/quiz/:concursoId" element={<PrivateRoute><QuizSessao /></PrivateRoute>} />
        <Route path="/quiz/:concursoId/resultado" element={<PrivateRoute><QuizResultado /></PrivateRoute>} />
        <Route path="/artigos" element={<PrivateRoute><ArtigosLista /></PrivateRoute>} />
        <Route path="/artigos/:artigoId" element={<PrivateRoute><ArtigoDetalhe /></PrivateRoute>} />
        <Route path="/cf88" element={<PrivateRoute><CF88Home /></PrivateRoute>} />
        <Route path="/cf88/:artigoId" element={<PrivateRoute><CF88Artigo /></PrivateRoute>} />
        <Route path="/casos" element={<PrivateRoute><CasosLista /></PrivateRoute>} />
        <Route path="/casos/:casoId" element={<PrivateRoute><CasoDetalhe /></PrivateRoute>} />
        <Route path="/concursos" element={<PrivateRoute><ConcursosLista /></PrivateRoute>} />
        <Route path="/concursos/:concursoId" element={<PrivateRoute><ConcursoDetalhe /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/assinatura" element={<PrivateRoute><Assinatura /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/mapa-mental-visual" element={<PrivateRoute><MapaMentalVisual /></PrivateRoute>} />
        <Route path="/mapa-mental-educacional" element={<PrivateRoute><MapaMentalEducacional /></PrivateRoute>} />
        <Route path="/mapa-mental" element={<PrivateRoute><MapaMentalJuridico /></PrivateRoute>} />
        <Route path="/agente" element={<PrivateRoute><AgenteJuridico /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/perfil" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
