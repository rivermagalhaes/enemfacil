// src/lib/xpService.ts
// Incrementa XP do usuário e atualiza sequência de estudo

import { supabase } from "@/lib/supabaseClient";

/**
 * Adiciona XP ao perfil do usuário.
 * @param userId  ID do usuário
 * @param xp      Quantidade de XP a adicionar
 */
export async function addXP(userId: string, xp: number): Promise<void> {
  if (!userId || xp <= 0) return;

  // 1. Busca XP atual
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_total, sequencia, ultimo_acesso")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const hoje = new Date().toISOString().split("T")[0];
  const ultimoAcesso = profile.ultimo_acesso?.split("T")[0] ?? "";

  // 2. Calcula nova sequência
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const ontemStr = ontem.toISOString().split("T")[0];

  let novaSequencia = profile.sequencia ?? 0;
  if (ultimoAcesso === hoje) {
    // Já estudou hoje — mantém sequência
  } else if (ultimoAcesso === ontemStr) {
    // Estudou ontem — incrementa sequência
    novaSequencia += 1;
  } else {
    // Quebrou a sequência — reinicia
    novaSequencia = 1;
  }

  // 3. Atualiza perfil
  await supabase
    .from("profiles")
    .update({
      xp_total: (profile.xp_total ?? 0) + xp,
      sequencia: novaSequencia,
      ultimo_acesso: new Date().toISOString(),
    })
    .eq("id", userId);
}

/** XP por ação */
export const XP = {
  QUESTAO_CERTA:    10,   // Quiz: acertou uma questão
  QUESTAO_ERRADA:    2,   // Quiz: respondeu (mas errou) — incentiva tentar
  SIMULADO_CONCLUIR: 50,  // Simulado: concluiu
  SIMULADO_BONUS:    2,   // Simulado: bônus por acerto (multiplicado pelos acertos)
  TRILHA_UNIDADE:   null, // Trilha: usa o xp da própria unidade (definido em UNIDADES)
};
