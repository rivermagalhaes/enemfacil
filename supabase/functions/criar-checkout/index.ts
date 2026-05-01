import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_IDS: Record<string, string> = {
  cidadao:     Deno.env.get("STRIPE_PRICE_CIDADAO") ?? "",
  concurseiro: Deno.env.get("STRIPE_PRICE_CONCURSEIRO") ?? "",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ ok: false, error: "Token ausente" }), { status: 401, headers: corsHeaders });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), { status: 401, headers: corsHeaders });
    const { plano, success_url, cancel_url } = await req.json();
    if (!plano || !PRICE_IDS[plano]) return new Response(JSON.stringify({ ok: false, error: "Plano inválido" }), { status: 400, headers: corsHeaders });
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await supabaseAdmin.from("profiles").select("stripe_customer_id, nome").eq("id", user.id).single();
    let customerId: string = profile?.stripe_customer_id ?? "";
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: profile?.nome ?? undefined, metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: "subscription", payment_method_types: ["card"],
      line_items: [{ price: PRICE_IDS[plano], quantity: 1 }],
      success_url: success_url ?? `${Deno.env.get("APP_URL")}/perfil?checkout=success`,
      cancel_url: cancel_url ?? `${Deno.env.get("APP_URL")}/assinatura?checkout=cancelled`,
      subscription_data: { metadata: { supabase_user_id: user.id, plano } },
      locale: "pt-BR",
    });
    return new Response(JSON.stringify({ ok: true, url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno" }), { status: 500, headers: corsHeaders });
  }
});
