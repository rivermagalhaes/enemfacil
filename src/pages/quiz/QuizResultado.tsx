// src/pages/quiz/QuizResultado.tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import ResultadoScreen from "@/components/ui/ResultadoScreen";

export default function QuizResultado() {
  const { concursoId } = useParams<{ concursoId: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();

  const pontos: number = state?.pontos ?? 0;
  const acertos: number = state?.acertos ?? 0;
  const total: number = state?.total ?? 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <TopBar title="Resultado" showBack progress={100} />
      <div style={{ flex: 1, padding: "0 14px" }}>
        <ResultadoScreen
          acertos={acertos}
          total={total}
          pontos={pontos}
          xpGanho={pontos}
          onReiniciar={() => navigate(`/quiz/${concursoId}`)}
        />
      </div>
    </div>
  );
}
