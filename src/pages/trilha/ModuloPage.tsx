// src/pages/trilha/ModuloPage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// @ts-ignore
import ModuleCard from "@/components/ModuleCard";
// @ts-ignore
import TopicPage from "@/components/TopicPage";

export default function ModuloPage() {
  const { vestibular, materia } = useParams();
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState<any>(null);

  function handleComplete() {
    // Ao concluir, volta para a trilha da matéria
    navigate(`/trilha/${vestibular}/${materia}`);
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#f4f6fb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      {activeTopic ? (
        <TopicPage
          topic={activeTopic}
          onBack={() => setActiveTopic(null)}
        />
      ) : (
        <ModuleCard
          onSelectTopic={setActiveTopic}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
