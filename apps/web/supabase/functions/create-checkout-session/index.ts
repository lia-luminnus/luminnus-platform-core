import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
    priceId: string;
    userId: string;
    tenantId?: string;
    userEmail?: string;
    successUrl: string;
    cancelUrl: string;
    planName?: string;
    billingType?: string;
    mode?: "subscription" | "payment"; // payment = recharge
    credits?: number; // for recharge metadata
}

function inferStripeMode(secretKey: string): "live" | "test" | "unknown" {
    if (secretKey.startsWith("sk_live_")) return "live";
    if (secretKey.startsWith("sk_test_")) return "test";
    return "unknown";
}

function getStripeClient() {
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY não configurada");
    }

    return new Stripe(secretKey, {
        apiVersion: "2024-12-18.acacia",
    });
}

async function canReuseCustomerForCurrency(
    stripe: Stripe,
    customerId: string,
    targetCurrency: string | null | undefined,
) {
    if (!targetCurrency) return true;

    const activeStatuses = new Set(["trialing", "active", "past_due", "unpaid", "incomplete"]);
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 50,
    });

    for (const subscription of subscriptions.data) {
        if (!activeStatuses.has(subscription.status)) continue;
        const existingCurrency = subscription.items.data[0]?.price?.currency;
        if (existingCurrency && existingCurrency.toLowerCase() !== targetCurrency.toLowerCase()) {
            return false;
        }
    }

    return true;
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY não configurada");
        }

        const { priceId, userId, tenantId, userEmail, successUrl, cancelUrl, planName, billingType, mode, credits }: CheckoutRequest = await req.json();
        const stripe = getStripeClient();
        const stripeMode = inferStripeMode(secretKey);

        if (!priceId || !userId) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: priceId and userId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const checkoutMode = mode || "subscription";
        const isRecharge = checkoutMode === "payment";

        console.log(`[Checkout] Creating ${checkoutMode} session for user ${userId}, tenant ${tenantId || "none"}, price ${priceId}`);

        // Validate price ahead of checkout to surface clear test/live mismatch errors
        let stripePrice: any;
        try {
            stripePrice = await stripe.prices.retrieve(priceId);
        } catch (priceErr) {
            const details = priceErr instanceof Error ? priceErr.message : "price lookup failed";
            throw new Error(`Preço Stripe inválido para esta chave (${stripeMode}). priceId=${priceId}. Detalhes: ${details}`);
        }

        if (!stripePrice?.active) {
            throw new Error(`Preço Stripe inativo: ${priceId}`);
        }

        if (stripeMode !== "unknown") {
            const expectedLiveMode = stripeMode === "live";
            if (stripePrice.livemode !== expectedLiveMode) {
                throw new Error(
                    `Incompatibilidade Stripe: chave em modo ${stripeMode}, mas priceId=${priceId} está em modo ${stripePrice.livemode ? "live" : "test"}.`
                );
            }
        }

        // Create or get Stripe customer
        let customerId: string | undefined;

        if (userEmail) {
            // Search for existing customer
            const customers = await stripe.customers.list({
                email: userEmail,
                limit: 1,
            });

            if (customers.data.length > 0) {
                const existingCustomerId = customers.data[0].id;
                const targetCurrency = stripePrice?.currency;
                const canReuse = await canReuseCustomerForCurrency(stripe, existingCustomerId, targetCurrency);

                if (canReuse) {
                    customerId = existingCustomerId;
                    console.log(`[Checkout] Reusing existing customer: ${customerId}`);
                } else {
                    const customer = await stripe.customers.create({
                        email: userEmail,
                        metadata: {
                            supabase_user_id: userId,
                            ...(tenantId ? { supabase_tenant_id: tenantId } : {}),
                            split_reason: "currency_mismatch",
                            target_currency: targetCurrency || "unknown",
                        },
                    });
                    customerId = customer.id;
                    console.log(`[Checkout] Created new customer due to currency mismatch: ${customerId}`);
                }
            } else {
                // Create new customer
                const customer = await stripe.customers.create({
                    email: userEmail,
                    metadata: {
                        supabase_user_id: userId,
                        ...(tenantId ? { supabase_tenant_id: tenantId } : {}),
                    },
                });
                customerId = customer.id;
                console.log(`[Checkout] Created new customer: ${customerId}`);
            }
        }

        const metadata: Record<string, string> = {
            supabase_user_id: userId,
            ...(tenantId ? { supabase_tenant_id: tenantId } : {}),
            ...(isRecharge ? { type: "recharge", credits: String(credits || 0) } : {}),
        };

        // Build session params based on mode
        const sessionParams: any = {
            mode: checkoutMode,
            payment_method_types: ["card"],
            ...(customerId ? { customer: customerId } : {}),
            ...(!customerId && userEmail ? { customer_email: userEmail } : {}),
            client_reference_id: userId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata,
            locale: "pt-BR",
        };

        if (isRecharge) {
            // One-time payment for recharge
            sessionParams.payment_intent_data = {
                metadata: {
                    supabase_user_id: userId,
                    ...(tenantId ? { supabase_tenant_id: tenantId } : {}),
                    type: "recharge",
                    credits: String(credits || 0),
                },
            };
        } else {
            // Subscription for plan
            sessionParams.subscription_data = {
                metadata: {
                    supabase_user_id: userId,
                    ...(tenantId ? { supabase_tenant_id: tenantId } : {}),
                    plan: planName || "unknown",
                    billing_type: billingType || "unknown",
                },
            };
            sessionParams.allow_promotion_codes = true;
            sessionParams.billing_address_collection = "required";
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log(`[Checkout] Session created: ${session.id} for tenant ${tenantId || "none"}`);

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
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao criar checkout";
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
