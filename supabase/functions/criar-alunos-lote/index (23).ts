// supabase/functions/criar-alunos-lote/index.ts
// Cria contas para alunos sem cadastro e emite certificados

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { alunos, evento_id, regras } = await req.json();
    // alunos: [{nome, email, nota, medalha}]
    // regras: [{id, tipo_certificado, nota_minima}]

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resultados: any[] = [];

    for (const aluno of alunos) {
      if (!aluno.email) {
        resultados.push({ nome: aluno.nome, status: "pulado", motivo: "sem email" });
        continue;
      }

      // 1. Verifica se já existe
      let user_id = aluno.user_id;
      if (!user_id) {
        // Cria conta com senha temporária
        const senha = `OTQ@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: aluno.email.toLowerCase(),
          password: senha,
          email_confirm: true, // confirma automaticamente
          user_metadata: { nome: aluno.nome },
        });

        if (authErr) {
          // Se já existe, busca o user_id
          if (authErr.message?.includes("already")) {
            const { data: existing } = await supabase
              .from("profiles").select("id").eq("email", aluno.email.toLowerCase()).single();
            user_id = existing?.id;
          } else {
            resultados.push({ nome: aluno.nome, status: "erro", motivo: authErr.message });
            continue;
          }
        } else {
          user_id = authData.user?.id;
          // Atualiza profile com nome
          if (user_id) {
            await supabase.from("profiles").update({
              nome: aluno.nome,
              email: aluno.email.toLowerCase(),
            }).eq("id", user_id);
          }
        }
      }

      if (!user_id) {
        resultados.push({ nome: aluno.nome, status: "erro", motivo: "não foi possível criar conta" });
        continue;
      }

      // 2. Escolhe a regra correta
      let regra = regras.find((r: any) => aluno.medalha && r.tipo_certificado === aluno.medalha);
      if (!regra) regra = regras.find((r: any) =>
        !r.nota_minima || (aluno.nota !== undefined && aluno.nota >= r.nota_minima)
      );
      if (!regra) {
        resultados.push({ nome: aluno.nome, status: "pulado", motivo: "nenhuma regra aplicável" });
        continue;
      }

      // 3. Emite certificado
      const certRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gerar-certificado`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          user_id,
          evento_id,
          regra_id: regra.id,
          tipo_certificado: regra.tipo_certificado,
          nome_aluno: aluno.nome,
          nota: aluno.nota,
          medalha: aluno.medalha,
        }),
      });

      const certData = await certRes.json();
      if (certData.success) {
        resultados.push({ nome: aluno.nome, status: "ok", codigo: certData.codigo });
      } else {
        resultados.push({ nome: aluno.nome, status: "erro", motivo: certData.error ?? "erro ao gerar certificado" });
      }
    }

    const ok = resultados.filter(r => r.status === "ok").length;
    const erros = resultados.filter(r => r.status === "erro").length;
    const pulados = resultados.filter(r => r.status === "pulado").length;

    return new Response(JSON.stringify({ success: true, ok, erros, pulados, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
