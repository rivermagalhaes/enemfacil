// src/hooks/useProgresso.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProgressoConcurso } from "@/types";

export function useProgresso(userId: string | undefined) {
  const [progresso, setProgresso] = useState<ProgressoConcurso[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("progresso_concurso")
      .select("*")
      .eq("user_id", userId)
      .then(({ data }) => {
        setProgresso(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  function getPorConcurso(concursoId: string): ProgressoConcurso | undefined {
    return progresso.find((p) => p.concurso_id === concursoId);
  }

  function getPctAcerto(concursoId: string): number {
    const p = getPorConcurso(concursoId);
    if (!p || p.total_respondidas === 0) return 0;
    return Math.round((p.total_corretas / p.total_respondidas) * 100);
  }

  return { progresso, loading, getPorConcurso, getPctAcerto };
}
