import React from 'react';

interface BarraStreakXPProps {
  streak: number;
  xp: number;
}

export const BarraStreakXP: React.FC<BarraStreakXPProps> = ({ streak, xp }) => {
  return (
    <div className="barra-streak-xp">
      <span>🔥 {streak} streak</span>
      <span>⭐ {xp} XP</span>
    </div>
  );
};
export default BarraStreakXP;
