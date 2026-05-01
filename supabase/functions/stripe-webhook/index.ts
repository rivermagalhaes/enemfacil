import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const event = body;

    console.log("Evento recebido:", event.type);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object;
      const userId = sub.metadata?.supabase_user_id;
      const plano = sub.metadata?.plano ?? "cidadao";
      const ativo = sub.status === "active" || sub.status === "trialing";

      console.log("userId:", userId, "plano:", plano, "ativo:", ativo);
      console.log("current_period_end:", sub.current_period_end, typeof sub.current_period_end);

      // Converte para número seguro
      const periodEnd = Number(sub.current_period_end);
      const planoAte = ativo && !isNaN(periodEnd) && periodEnd > 0
        ? new Date(periodEnd * 1000).toISOString()
        : null;

      console.log("planoAte calculado:", planoAte);

      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            plano: ativo ? plano : "gratis",
            plano_ate: planoAte,
            stripe_subscription_id: sub.id,
          })
          .eq("id", userId);

        if (error) console.error("Erro ao atualizar profile:", error);
        else console.log("Profile atualizado com sucesso! plano:", ativo ? plano : "gratis");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ plano: "gratis", plano_ate: null })
          .eq("id", userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
    });
  }
});
