// supabase/functions/generate-hero-image/index.ts
// Edge Function — gera imagem via DALL-E 3 e salva no Storage
//
// Deploy: supabase functions deploy generate-hero-image
// Env vars: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "content-heroes";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { hero_id, processar_fila } = body;

    // ── Modo fila: processa todos os pending ────────────────
    if (processar_fila) {
      const { data: pendentes } = await supabase
        .from("content_heroes")
        .select("id, prompt, titulo, entity_type, entity_id")
        .eq("status", "pending")
        .limit(10);

      if (!pendentes?.length) {
        return new Response(JSON.stringify({ ok: true, processados: 0, msg: "Nenhum hero pendente" }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const resultados = [];
      for (const hero of pendentes) {
        const result = await gerarImagem(hero, supabase, OPENAI_KEY);
        resultados.push(result);
      }

      return new Response(JSON.stringify({ ok: true, processados: resultados.length, resultados }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── Modo single: processa um hero específico ────────────
    if (!hero_id) {
      return new Response(JSON.stringify({ error: "hero_id ou processar_fila obrigatório" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: hero } = await supabase
      .from("content_heroes")
      .select("id, prompt, titulo, entity_type, entity_id")
      .eq("id", hero_id)
      .single();

    if (!hero) {
      return new Response(JSON.stringify({ error: "Hero não encontrado" }), {
        status: 404, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const result = await gerarImagem(hero, supabase, OPENAI_KEY);
    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

// ── Gera imagem para um hero ──────────────────────────────
async function gerarImagem(hero: any, supabase: any, openaiKey: string) {
  // Marca como gerando
  await supabase
    .from("content_heroes")
    .update({ status: "generating" })
    .eq("id", hero.id);

  try {
    // Chama DALL-E 3
    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: hero.prompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    const dalleData = await dalleRes.json();

    if (!dalleRes.ok) {
      throw new Error(dalleData.error?.message ?? `DALL-E error: ${dalleRes.status}`);
    }

    const b64 = dalleData.data?.[0]?.b64_json;
    if (!b64) throw new Error("DALL-E não retornou imagem");

    // Converte base64 para Uint8Array
    const imageBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    // Salva no Supabase Storage
    const filename = `${hero.entity_type}/${hero.entity_id}/${hero.id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("content-heroes")
      .upload(filename, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

    // Pega URL pública
    const { data: urlData } = supabase.storage
      .from("content-heroes")
      .getPublicUrl(filename);

    const imageUrl = urlData.publicUrl;

    // Atualiza content_heroes com URL e status done
    await supabase
      .from("content_heroes")
      .update({
        image_url: imageUrl,
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", hero.id);

    return { ok: true, hero_id: hero.id, image_url: imageUrl };

  } catch (err: any) {
    // Marca como erro
    await supabase
      .from("content_heroes")
      .update({ status: "error", updated_at: new Date().toISOString() })
      .eq("id", hero.id);

    return { ok: false, hero_id: hero.id, error: err.message };
  }
}
