import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia",
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
    priceId: string;
    userId: string;
    tenantId: string;
    userEmail?: string;
    successUrl: string;
    cancelUrl: string;
    planName?: string;
    billingType?: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { priceId, userId, tenantId, userEmail, successUrl, cancelUrl, planName, billingType }: CheckoutRequest = await req.json();

        if (!priceId || !userId || !tenantId) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: priceId, userId and tenantId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[Checkout] Creating session for user ${userId}, tenant ${tenantId}, price ${priceId}`);

        // Create or get Stripe customer
        let customerId: string | undefined;

        if (userEmail) {
            // Search for existing customer
            const customers = await stripe.customers.list({
                email: userEmail,
                limit: 1,
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
                console.log(`[Checkout] Found existing customer: ${customerId}`);
            } else {
                // Create new customer
                const customer = await stripe.customers.create({
                    email: userEmail,
                    metadata: {
                        supabase_user_id: userId,
                        supabase_tenant_id: tenantId,
                    },
                });
                customerId = customer.id;
                console.log(`[Checkout] Created new customer: ${customerId}`);
            }
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer: customerId,
            customer_email: customerId ? undefined : userEmail,
            client_reference_id: userId, // Linked to the user who initiated
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                metadata: {
                    supabase_user_id: userId,
                    supabase_tenant_id: tenantId,
                    plan: planName || "unknown",
                    billing_type: billingType || "unknown",
                },
            },
            metadata: {
                supabase_user_id: userId,
                supabase_tenant_id: tenantId,
            },
            allow_promotion_codes: true,
            billing_address_collection: "required",
            locale: "pt-BR",
        });

        console.log(`[Checkout] Session created: ${session.id} for tenant ${tenantId}`);

        return new Response(
            JSON.stringify({
                url: session.url,
                sessionId: session.id,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (err) {
        console.error("[Checkout] Error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
