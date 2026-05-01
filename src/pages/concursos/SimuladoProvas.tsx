import React from 'react';
import { useParams } from "react-router-dom";
import TopBar from '@/components/layout/TopBar';

const SimuladoProvas: React.FC = () => {
  const { concursoId } = useParams();

  return (
    <div>
      <TopBar title="Provas" showBack={true} />
      <div style={{ padding: 16 }}>
        <p>Provas do concurso <strong>{concursoId}</strong></p>
        <p style={{ color: '#888', fontSize: 14 }}>Em breve...</p>
      </div>
    </div>
  );
};

export default SimuladoProvas;
