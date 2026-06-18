import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const abacatepayWebhookSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // TODO: Validate webhook signature from AbacatePay using abacatepayWebhookSecret
  // This depends on the exact signature header name and hashing algorithm AbacatePay uses.
  // const signature = req.headers.get("x-abacatepay-signature");

  try {
    const payload = await req.json();
    const eventType = payload.event;
    const data = payload.data;

    console.log(`Received event: ${eventType}`);

    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      const clinicId = data.metadata?.clinic_id; // assuming clinic_id is passed in metadata
      const status = data.status; // e.g., 'active', 'past_due', 'canceled'
      const plan = data.plan; // 'basico', 'pro', 'enterprise', 'vip'
      const currentPeriodEnd = data.current_period_end;

      if (clinicId) {
        const { error } = await supabase
          .from("usuarios")
          .update({
            abacatepay_subscription_status: status,
            plano: plan,
            acesso_expira_em: new Date(currentPeriodEnd * 1000).toISOString(),
          })
          .eq("id", clinicId)
          .eq("role", "dono");

        if (error) throw error;
      }
    } else if (eventType === "invoice.paid") {
      const clinicId = data.metadata?.clinic_id;
      const amount = data.amount_paid;
      const invoiceUrl = data.invoice_pdf;
      const periodStart = data.period_start;

      if (clinicId) {
        const { error } = await supabase
          .from("faturas_abacatepay")
          .insert({
            clinica_id: clinicId,
            valor: amount / 100, // assuming amount in cents
            status: "paid",
            mes_referencia: new Date(periodStart * 1000).toISOString(),
            url_nota_fiscal: invoiceUrl,
            abacatepay_invoice_id: data.id,
          });

        if (error) throw error;
      }
    } else if (eventType === "invoice.payment_failed") {
      const clinicId = data.metadata?.clinic_id;
      const amount = data.amount_due;
      const periodStart = data.period_start;

      if (clinicId) {
        const { error } = await supabase
          .from("faturas_abacatepay")
          .insert({
            clinica_id: clinicId,
            valor: amount / 100,
            status: "failed",
            mes_referencia: new Date(periodStart * 1000).toISOString(),
            abacatepay_invoice_id: data.id,
          });

        if (error) throw error;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
