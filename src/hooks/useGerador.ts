// src/hooks/useGerador.ts
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Questao, CasoDiaDia } from "@/types";

interface GerarQuestoesParams {
  artigo_id: string;
  concurso_id?: string;
  quantidade?: number;
  nivel?: "facil" | "medio" | "dificil";
}

interface GerarCasoParams {
  artigo_id: string;
  inciso_id?: string;
  categoria?: "escola" | "trabalho" | "saude" | "policia" | "familia" | "consumidor";
}

export function useGerador() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invoke<T>(fn: string, body: object): Promise<T | null> {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(fn, { body });
      if (fnErr) { setError(fnErr.message); return null; }
      if (!data?.ok) { setError(data?.error ?? "Erro inesperado"); return null; }
      return data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function gerarQuestoes(params: GerarQuestoesParams): Promise<Questao[] | null> {
    const res = await invoke<{ questoes: Questao[] }>("gerar-questoes", params);
    return res?.questoes ?? null;
  }

  async function gerarCaso(params: GerarCasoParams): Promise<CasoDiaDia | null> {
    const res = await invoke<{ caso: CasoDiaDia }>("gerar-caso", params);
    return res?.caso ?? null;
  }

  return { gerarQuestoes, gerarCaso, loading, error };
}
