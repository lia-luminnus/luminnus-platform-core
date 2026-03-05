// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://luminnus.ai";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Cabeçalho de autorização ausente");
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

        if (authError || !user) {
            throw new Error("Não autorizado");
        }

        // Get customer ID from subscriptions
        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        let customerId: string | undefined;

        if (subError || !subscription?.stripe_customer_id) {
            // Fallback: search customer by email if not found in table
            const customers = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });

            if (customers.data.length === 0) {
                throw new Error("Nenhuma conta de pagamento encontrada para este usuário.");
            }

            customerId = customers.data[0].id;
        } else {
            customerId = subscription.stripe_customer_id;
        }

        // Create session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appBaseUrl}/minha-conta`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err: any) {
        console.error("[Portal] Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
