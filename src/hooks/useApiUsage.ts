// src/hooks/useApiUsage.ts
// Hook para verificar e registrar uso da API Claude

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export type Feature = "redacao" | "agente" | "slides" | "mapa_mental" | "questoes" | "conteudo";

export interface UsageCheck {
  pode: boolean;
  limite: number | null;
  uso: number;
  motivo?: string;
}

export function useApiUsage() {
  const { user } = useAuth();

  async function verificarLimite(feature: Feature): Promise<UsageCheck> {
    if (!user) return { pode: false, limite: 0, uso: 0, motivo: "Não autenticado" };
    const { data, error } = await supabase.rpc("pode_usar_ia", {
      p_user_id: user.id,
      p_feature: feature,
    });
    if (error) return { pode: true, limite: null, uso: 0 }; // permissivo em caso de erro
    return data as UsageCheck;
  }

  async function registrarUso(
    feature: Feature,
    tokens_in = 0,
    tokens_out = 0
  ) {
    if (!user) return;
    // Custo aproximado: Sonnet = $3/M tokens in + $15/M tokens out
    const custo_usd = (tokens_in * 3 + tokens_out * 15) / 1_000_000;
    await supabase.from("api_usage").insert({
      user_id: user.id,
      feature,
      modelo: "claude-sonnet",
      tokens_in,
      tokens_out,
      custo_usd,
    });
  }

  async function verificarERegistrar(feature: Feature): Promise<UsageCheck> {
    const check = await verificarLimite(feature);
    return check;
  }

  return { verificarLimite, registrarUso, verificarERegistrar };
}
