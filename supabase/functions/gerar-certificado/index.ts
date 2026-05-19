// supabase/functions/gerar-certificado/index.ts
// Gera PDF do certificado usando HTML + Puppeteer-style via API externa
// Retorna URL do PDF salvo no Supabase Storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Gera QR Code como SVG simples (sem dependência externa)
function gerarQRCodeSVG(texto: string): string {
  // QR Code simplificado — use URL de API pública
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(texto)}&format=svg`;
  return `<img src="${url}" width="120" height="120" />`;
}

// Gera HTML do certificado
function gerarHTMLCertificado(dados: {
  nome_aluno: string;
  evento: string;
  edicao: string;
  ano: number;
  disciplina: string;
  tipo_certificado: string;
  medalha?: string;
  nota?: number;
  percentual?: number;
  carga_horaria?: number;
  codigo: string;
  emitido_em: string;
  texto_cert?: string;
  cor_primaria: string;
  cor_secundaria: string;
  assinatura1_nome?: string;
  assinatura1_cargo?: string;
  assinatura2_nome?: string;
  assinatura2_cargo?: string;
  logo_url?: string;
}): string {

  const medalhaEmoji = dados.medalha === "ouro" ? "🥇" : dados.medalha === "prata" ? "🥈" : dados.medalha === "bronze" ? "🥉" : "";
  const tipoLabel = {
    participacao: "Certificado de Participação",
    conclusao: "Certificado de Conclusão",
    desempenho: "Certificado de Desempenho",
    ouro: "Medalha de Ouro",
    prata: "Medalha de Prata",
    bronze: "Medalha de Bronze",
    mencao_honrosa: "Menção Honrosa",
    organizador: "Certificado de Organização",
    professor: "Certificado de Orientação",
  }[dados.tipo_certificado] ?? "Certificado";

  const dataFormatada = new Date(dados.emitido_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const validacaoUrl = `https://enem-facil-gray.vercel.app/certificado/${dados.codigo}`;

  const textoCorpo = dados.texto_cert
    || `Certificamos que <strong>${dados.nome_aluno}</strong> participou ${dados.tipo_certificado === "participacao" ? "da" : "e se destacou na"} <strong>${dados.evento} — ${dados.edicao}</strong>${dados.disciplina ? `, na disciplina de <strong>${dados.disciplina}</strong>` : ""}${dados.carga_horaria ? `, com carga horária de <strong>${dados.carga_horaria} horas</strong>` : ""}.`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificado — ${dados.nome_aluno}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    background: #f0f0f0;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .certificado {
    width: 842px; height: 595px;
    background: #fff;
    position: relative;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  }
  /* Borda decorativa */
  .borda-ext {
    position: absolute; inset: 0;
    border: 8px solid ${dados.cor_primaria};
    pointer-events: none; z-index: 10;
  }
  .borda-int {
    position: absolute; inset: 14px;
    border: 2px solid ${dados.cor_secundaria};
    pointer-events: none; z-index: 10;
  }
  /* Header */
  .header {
    background: ${dados.cor_primaria};
    padding: 18px 40px 14px;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .header-logo { display: flex; align-items: center; gap: 12px; }
  .header-logo img { height: 44px; }
  .header-titulo { color: #fff; }
  .header-titulo h1 { font-size: 13px; font-weight: 400; letter-spacing: 3px; text-transform: uppercase; opacity: 0.8; }
  .header-titulo h2 { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
  .header-ano { color: ${dados.cor_secundaria}; font-size: 28px; font-weight: 700; font-family: 'Arial', sans-serif; }
  /* Corpo */
  .corpo {
    flex: 1; padding: 24px 50px 16px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; position: relative;
  }
  /* Medalha */
  .medalha { font-size: 48px; margin-bottom: 4px; }
  /* Tipo */
  .tipo-label {
    font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
    color: ${dados.cor_secundaria}; font-family: 'Arial', sans-serif;
    border-bottom: 1px solid ${dados.cor_secundaria}; padding-bottom: 6px; margin-bottom: 14px;
  }
  /* Nome */
  .nome-aluno {
    font-size: 32px; font-weight: 700; color: ${dados.cor_primaria};
    margin-bottom: 14px; line-height: 1.2;
  }
  /* Texto */
  .texto-corpo {
    font-size: 13px; color: #444; line-height: 1.8; max-width: 580px; margin-bottom: 14px;
  }
  /* Resultado */
  .resultado {
    display: inline-flex; gap: 20px; margin-bottom: 14px;
  }
  .resultado-item {
    background: ${dados.cor_primaria}15; border: 1px solid ${dados.cor_primaria}30;
    border-radius: 8px; padding: 6px 16px; text-align: center;
  }
  .resultado-item .val { font-size: 20px; font-weight: 700; color: ${dados.cor_primaria}; }
  .resultado-item .lbl { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  /* Assinaturas */
  .assinaturas {
    display: flex; gap: 60px; justify-content: center; margin-top: 4px;
  }
  .assinatura { text-align: center; }
  .assinatura-linha { width: 140px; border-top: 1px solid #333; margin-bottom: 4px; }
  .assinatura-nome { font-size: 11px; font-weight: 700; color: #333; }
  .assinatura-cargo { font-size: 10px; color: #888; }
  /* Footer */
  .footer {
    background: ${dados.cor_primaria}08; border-top: 1px solid ${dados.cor_primaria}20;
    padding: 10px 40px; display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .codigo { font-size: 10px; color: #888; font-family: 'Courier New', monospace; }
  .codigo strong { color: ${dados.cor_primaria}; font-size: 12px; }
  .qr-area { display: flex; align-items: center; gap: 8px; }
  .qr-label { font-size: 9px; color: #aaa; text-align: right; line-height: 1.4; }
  /* Ornamento */
  .ornamento {
    position: absolute; top: -30px; right: -30px;
    width: 120px; height: 120px; border-radius: 50%;
    background: ${dados.cor_secundaria}15;
    pointer-events: none;
  }
</style>
</head>
<body>
<div class="certificado">
  <div class="borda-ext"></div>
  <div class="borda-int"></div>
  <div class="ornamento"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      ${dados.logo_url ? `<img src="${dados.logo_url}" alt="Logo" />` : `<div style="width:44px;height:44px;background:${dados.cor_secundaria};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;">🎓</div>`}
      <div class="header-titulo">
        <h1>EnemFácil · Certificação Digital</h1>
        <h2>${dados.evento}</h2>
      </div>
    </div>
    <div class="header-ano">${dados.ano}</div>
  </div>

  <!-- Corpo -->
  <div class="corpo">
    ${medalhaEmoji ? `<div class="medalha">${medalhaEmoji}</div>` : ""}
    <div class="tipo-label">${tipoLabel}</div>
    <div class="nome-aluno">${dados.nome_aluno}</div>
    <div class="texto-corpo">${textoCorpo}</div>
    ${(dados.nota || dados.percentual) ? `
    <div class="resultado">
      ${dados.nota ? `<div class="resultado-item"><div class="val">${dados.nota.toFixed(1)}</div><div class="lbl">Nota</div></div>` : ""}
      ${dados.percentual ? `<div class="resultado-item"><div class="val">${dados.percentual}%</div><div class="lbl">Aproveitamento</div></div>` : ""}
    </div>` : ""}
    <div class="assinaturas">
      ${dados.assinatura1_nome ? `
      <div class="assinatura">
        ${dados.assinatura1_cargo?.includes("url:") ? `<img src="${dados.assinatura1_cargo.replace("url:", "")}" style="height:32px;margin-bottom:4px;" />` : ""}
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">${dados.assinatura1_nome}</div>
        <div class="assinatura-cargo">${dados.assinatura1_cargo ?? ""}</div>
      </div>` : ""}
      ${dados.assinatura2_nome ? `
      <div class="assinatura">
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">${dados.assinatura2_nome}</div>
        <div class="assinatura-cargo">${dados.assinatura2_cargo ?? ""}</div>
      </div>` : ""}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="codigo">
      Código de autenticidade: <strong>${dados.codigo}</strong><br/>
      Emitido em: ${dataFormatada}<br/>
      <span style="font-size:9px">Verifique em: ${validacaoUrl}</span>
    </div>
    <div class="qr-area">
      <div class="qr-label">Escaneie para<br/>validar</div>
      ${gerarQRCodeSVG(validacaoUrl)}
    </div>
  </div>
</div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const {
      user_id,
      evento_id,
      regra_id,
      tipo_certificado,
      medalha,
      nota,
      percentual,
    } = await req.json();

    if (!user_id || !evento_id || !regra_id) {
      return new Response(
        JSON.stringify({ error: "user_id, evento_id e regra_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca dados do aluno
    const { data: perfil } = await supabase
      .from("profiles").select("nome, email").eq("id", user_id).single();

    // Busca evento
    const { data: evento } = await supabase
      .from("eventos_certificaveis").select("*").eq("id", evento_id).single();

    // Busca regra e template
    const { data: regra } = await supabase
      .from("regras_certificado")
      .select("*, templates_certificado(*)")
      .eq("id", regra_id).single();

    if (!perfil || !evento || !regra) {
      throw new Error("Dados não encontrados");
    }

    // Verifica se já existe certificado
    const { data: existente } = await supabase
      .from("certificados")
      .select("id, codigo, pdf_url")
      .eq("user_id", user_id)
      .eq("evento_id", evento_id)
      .eq("tipo_certificado", tipo_certificado ?? regra.tipo_certificado)
      .single();

    if (existente?.pdf_url) {
      return new Response(
        JSON.stringify({ success: true, certificado_id: existente.id, codigo: existente.codigo, pdf_url: existente.pdf_url, ja_existia: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gera código único
    const codigo = await supabase.rpc("gerar_codigo_certificado", {
      p_sigla: evento.sigla, p_ano: evento.ano
    });

    const codigoFinal = codigo.data ?? `${evento.sigla}-${evento.ano}-${Date.now()}`;
    const template = (regra as any).templates_certificado;

    // Gera HTML
    const html = gerarHTMLCertificado({
      nome_aluno:      perfil.nome ?? perfil.email,
      evento:          evento.nome,
      edicao:          evento.edicao ?? "",
      ano:             evento.ano,
      disciplina:      evento.disciplina ?? "",
      tipo_certificado: tipo_certificado ?? regra.tipo_certificado,
      medalha,
      nota,
      percentual,
      carga_horaria:   regra.carga_horaria ?? evento.carga_horaria,
      codigo:          codigoFinal,
      emitido_em:      new Date().toISOString(),
      texto_cert:      regra.texto_cert,
      cor_primaria:    template?.cor_primaria ?? "#1a3a6e",
      cor_secundaria:  template?.cor_secundaria ?? "#fbbf24",
      assinatura1_nome: template?.assinatura1_nome,
      assinatura1_cargo: template?.assinatura1_cargo,
      assinatura2_nome: template?.assinatura2_nome,
      assinatura2_cargo: template?.assinatura2_cargo,
      logo_url:        template?.logo_url,
    });

    // Converte HTML → PDF via API externa (htmlcsstoimage.com ou similar)
    // Alternativa gratuita: usar Gotenberg ou html2pdf API
    const HTMLCSS_API_KEY = Deno.env.get("HTMLCSS_API_KEY");
    let pdfUrl = "";

    if (HTMLCSS_API_KEY) {
      const pdfRes = await fetch("https://hcti.io/v1/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${btoa(`${HTMLCSS_API_KEY}:`)}`,
        },
        body: JSON.stringify({ html, selector: ".certificado" }),
      });
      const pdfData = await pdfRes.json();
      pdfUrl = pdfData.url ?? "";
    }

    // Se não tem API key, salva HTML no Storage como fallback
    if (!pdfUrl) {
      const htmlBytes = new TextEncoder().encode(html);
      const fileName = `certificados/${user_id}/${codigoFinal}.html`;
      await supabase.storage.from("certificados").upload(fileName, htmlBytes, {
        contentType: "text/html", upsert: true,
      });
      const { data: urlData } = supabase.storage.from("certificados").getPublicUrl(fileName);
      pdfUrl = urlData.publicUrl;
    }

    // Salva certificado no banco
    const { data: cert, error: certErr } = await supabase
      .from("certificados")
      .upsert({
        codigo:          codigoFinal,
        user_id,
        evento_id,
        regra_id,
        template_id:     template?.id ?? null,
        nome_aluno:      perfil.nome ?? perfil.email,
        tipo_certificado: tipo_certificado ?? regra.tipo_certificado,
        medalha:         medalha ?? null,
        nota:            nota ?? null,
        percentual:      percentual ?? null,
        carga_horaria:   regra.carga_horaria ?? evento.carga_horaria ?? null,
        pdf_url:         pdfUrl,
        valido:          true,
      }, { onConflict: "user_id,evento_id,tipo_certificado" })
      .select("id, codigo")
      .single();

    if (certErr) throw certErr;

    return new Response(
      JSON.stringify({
        success: true,
        certificado_id: cert.id,
        codigo: cert.codigo,
        pdf_url: pdfUrl,
        html,  // retorna HTML para renderizar no frontend também
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("gerar-certificado:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
