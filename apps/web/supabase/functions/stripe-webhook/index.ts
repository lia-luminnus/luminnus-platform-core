// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================
// Configuration
// ============================================
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://luminnus.ai";
const resendApiKey = Deno.env.get("RESEND_API_KEY");

// ============================================
// Price ID to Plan Mapping
// ============================================
const PRICE_TO_PLAN_MAP: Record<string, {
    plan: string;
    paymentType: "monthly" | "annual_12x" | "annual_full";
    commitmentMonths: number;
    displayName: string;
}> = {
    // Start
    "price_1Ss0tJRy1wqZ6TIAcjxyXlSY": { plan: "Start", paymentType: "monthly", commitmentMonths: 0, displayName: "Start Mensal" },
    "price_1Ss1jqRy1wqZ6TIAxG8velbA": { plan: "Start", paymentType: "annual_12x", commitmentMonths: 12, displayName: "Start Anual (12x)" },
    "price_1SsNb4Ry1wqZ6TIA99p7OD9Z": { plan: "Start", paymentType: "annual_full", commitmentMonths: 0, displayName: "Start Anual" },
    // Plus
    "price_1SsNRoRy1wqZ6TIAK5ijPvTe": { plan: "Plus", paymentType: "monthly", commitmentMonths: 0, displayName: "Plus Mensal" },
    "price_1Ss22aRy1wqZ6TIAiuswrNIa": { plan: "Plus", paymentType: "annual_12x", commitmentMonths: 12, displayName: "Plus Anual (12x)" },
    "price_1Ss21RRy1wqZ6TIAsJhnc6ZI": { plan: "Plus", paymentType: "annual_full", commitmentMonths: 0, displayName: "Plus Anual" },
    // Pro
    "price_1Ss27nRy1wqZ6TIAXuXjx0ox": { plan: "Pro", paymentType: "monthly", commitmentMonths: 0, displayName: "Pro Mensal" },
    "price_1Ss289Ry1wqZ6TIAVghulaNw": { plan: "Pro", paymentType: "annual_12x", commitmentMonths: 12, displayName: "Pro Anual (12x)" },
    "price_1Ss26GRy1wqZ6TIAnHEU2UAG": { plan: "Pro", paymentType: "annual_full", commitmentMonths: 0, displayName: "Pro Anual" },
};

// ============================================
// Recharge Price Map — maps price IDs to credit amounts
// ============================================
const RECHARGE_PRICE_MAP: Record<string, { credits: number; packageName: string }> = {
    "price_1SzcoARy1wqZ6TIA45E96Eka": { credits: 400, packageName: "Recarga 400 Créditos" },
    "price_1SzcpjRy1wqZ6TIAzVLobPoH": { credits: 1500, packageName: "Recarga 1.500 Créditos" },
    "price_1SzcqrRy1wqZ6TIAGmLwRgfA": { credits: 3500, packageName: "Recarga 3.500 Créditos" },
    "price_1SzcqyRy1wqZ6TIAJLgFpwmV": { credits: 10000, packageName: "Recarga 10.000 Créditos" },
};

// ============================================
// Number Add-on Price Map — Monthly recurring numbers
// TODO: Substituir IDs placeholder pelos reais do Stripe após criação
// ============================================
const NUMBER_ADDON_PRICES: Record<string, { country: string; displayName: string; monthlyEur: number }> = {
    "price_1T1rsKRy1wqZ6TIAUUfoeOmv": { country: "PT", displayName: "Número Portugal", monthlyEur: 20 },
    "price_1T1rsKRy1wqZ6TIA5jsFKSwr": { country: "BR", displayName: "Número Brasil", monthlyEur: 6 },
    "price_1T1rsLRy1wqZ6TIAw0gNZIBB": { country: "ES", displayName: "Número Espanha", monthlyEur: 3 },
};

// ============================================
// Helper Functions
// ============================================
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
        return null;
    }
    try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date.toISOString();
    } catch {
        return null;
    }
}

function calculateCommitmentEndDate(commitmentMonths: number): string | null {
    if (commitmentMonths === 0) return null;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + commitmentMonths);
    return endDate.toISOString();
}

async function sendWelcomeEmail(
    email: string,
    planName: string,
    magicLink: string
): Promise<boolean> {
    if (!resendApiKey) {
        console.error("[Webhook] RESEND_API_KEY not configured");
        return false;
    }

    const resendFrom = Deno.env.get("RESEND_FROM") || "Luminnus <lia@luminnus.ai>";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo à Luminnus</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0F1A; color: #ffffff; margin: 0; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
        <div style="text-align: center; padding: 40px 40px 20px;">
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">🧠</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff;">Bem-vindo à Luminnus!</h1>
            <p style="color: #9ca3af; margin-top: 8px; font-size: 16px;">Sua jornada com a LIA começa agora</p>
        </div>
        <div style="text-align: center; padding: 0 40px;">
            <span style="display: inline-block; background: linear-gradient(90deg, #8b5cf6, #3b82f6); padding: 8px 24px; border-radius: 100px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Plano ${planName} Ativado
            </span>
        </div>
        <div style="padding: 40px;">
            <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Seu acesso à LIA está liberado. Clique no botão abaixo para acessar seu painel.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="display: inline-block; background: linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 700;">
                    Acessar Meu Painel
                </a>
            </div>
        </div>
        <div style="text-align: center; padding: 20px 40px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Precisa de ajuda? Responda este e-mail.</p>
        </div>
    </div>
</body>
</html>
    `;

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + resendApiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: resendFrom,
                to: [email],
                subject: "Bem-vindo à Luminnus — seu acesso à LIA está liberado",
                html: htmlContent,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("[Webhook] Resend error:", error);
            return false;
        }

        console.log("[Webhook] Welcome email sent to " + email);
        return true;
    } catch (err) {
        console.error("[Webhook] Email send error:", err);
        return false;
    }
}

// ============================================
// Main Webhook Handler
// ============================================
Deno.serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("No signature", { status: 400 });
    }

    try {
        const body = await req.text();
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        if (!webhookSecret) {
            console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
            return new Response("Webhook secret not configured", { status: 500 });
        }

        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret
        );

        console.log("[Webhook] Received: " + event.type + " (" + event.id + ")");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Idempotency Check
        const { data: existingEvent, error: checkError } = await supabase
            .from("stripe_webhook_events")
            .select("id")
            .eq("id", event.id)
            .maybeSingle();

        if (checkError) {
            console.error("[Webhook] Idempotency check error:", checkError);
        }

        if (existingEvent) {
            console.log("[Webhook] Event " + event.id + " already processed, skipping");
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }

        // Record event for idempotency
        try {
            const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
                id: event.id,
                type: event.type,
                metadata: {
                    processed_at: new Date().toISOString(),
                    stripe_event: event
                },
            });

            if (insertError) {
                console.error("[Webhook] Failed to record event:", insertError);
            } else {
                console.log("[Webhook] Event recorded successfully: " + event.id);
            }
        } catch (recordError) {
            console.error("[Webhook] Exception recording event:", recordError);
        }

        // Event Handlers
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            // ============================================
            // RECHARGE FLOW — one-time payment
            // ============================================
            if (session.mode === "payment") {
                const sessionMeta = session.metadata || {};
                const userId = session.client_reference_id || sessionMeta.supabase_user_id;
                const tenantId = sessionMeta.supabase_tenant_id;
                const isRecharge = sessionMeta.type === 'recharge';

                if (!isRecharge) {
                    console.log("[Webhook] Non-recharge payment, skipping");
                    return new Response(JSON.stringify({ received: true }), {
                        headers: { "Content-Type": "application/json" },
                        status: 200,
                    });
                }

                if (!userId || !tenantId) {
                    console.error("[Webhook] Missing userId or tenantId for recharge");
                    return new Response(JSON.stringify({ received: true }), {
                        headers: { "Content-Type": "application/json" },
                        status: 200,
                    });
                }

                // Determine credits from metadata or price map
                let credits = parseInt(sessionMeta.credits || '0', 10);

                // Fallback: resolve from line items via Stripe API
                if (!credits) {
                    try {
                        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
                        const priceId = lineItems.data[0]?.price?.id;
                        if (priceId && RECHARGE_PRICE_MAP[priceId]) {
                            credits = RECHARGE_PRICE_MAP[priceId].credits;
                        }
                    } catch (err) {
                        console.error("[Webhook] Error fetching line items:", err);
                    }
                }

                if (!credits) {
                    console.error("[Webhook] Could not determine credits for recharge session: " + session.id);
                    return new Response(JSON.stringify({ received: true }), {
                        headers: { "Content-Type": "application/json" },
                        status: 200,
                    });
                }

                // Add recharge credits via RPC
                const { data: rechargeResult, error: rechargeError } = await supabase.rpc('add_recharge_credits', {
                    p_tenant_id: tenantId,
                    p_user_id: userId,
                    p_creditos: credits,
                    p_package_name: `Stripe Recharge (${credits} créditos)`,
                    p_metadata: {
                        stripe_session_id: session.id,
                        stripe_payment_intent: session.payment_intent,
                        amount_paid: session.amount_total,
                        currency: session.currency,
                    },
                });

                if (rechargeError) {
                    console.error("[Webhook] Error adding recharge credits:", rechargeError);
                } else {
                    console.log(`[Webhook] ✅ Recharge: +${credits} créditos para tenant ${tenantId} | Novo saldo: ${rechargeResult?.novo_saldo}`);
                }

                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            // ============================================
            // SUBSCRIPTION FLOW — existing logic
            // ============================================
            if (session.mode !== "subscription") {
                console.log("[Webhook] Not a subscription or recharge checkout, skipping");
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            const subscriptionId = session.subscription as string;
            const customerId = session.customer as string;
            const userId = session.client_reference_id || session.metadata?.supabase_user_id;
            const tenantId = session.metadata?.supabase_tenant_id;

            if (!userId) {
                console.error("[Webhook] Missing userId in session");
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price.id;
            const planInfo = PRICE_TO_PLAN_MAP[priceId];

            if (!planInfo) {
                console.error("[Webhook] Unknown price ID: " + priceId);
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            const commitmentEndDate = calculateCommitmentEndDate(planInfo.commitmentMonths);

            const { error } = await supabase.from("subscriptions").upsert({
                tenant_id: tenantId || null,
                user_id: userId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                stripe_price_id: priceId,
                plan_name: planInfo.plan,
                payment_type: planInfo.paymentType,
                status: subscription.status,
                commitment_end_date: commitmentEndDate,
                commitment_months: planInfo.commitmentMonths,
                current_period_start: safeTimestampToISO(subscription.current_period_start as number),
                current_period_end: safeTimestampToISO(subscription.current_period_end as number),
                metadata: { checkout_session_id: session.id },
            }, {
                onConflict: "stripe_subscription_id",
            });

            if (error) {
                console.error("[Webhook] Error creating subscription:", error);
            } else {
                console.log("[Webhook] Subscription created: " + subscriptionId);
            }
        }

        if (event.type === "invoice.paid") {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription as string;

            // Log the reason but don't strictly block unless it's obviously not a subscription payment we care about
            console.log(`[Webhook] Processing invoice.paid: subscription=${subscriptionId}, reason=${invoice.billing_reason}`);

            // If it's not a subscription payment, we can skip
            if (!subscriptionId) {
                console.log("[Webhook] Skipping invoice.paid: No subscription ID associated");
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            console.log("[Webhook] Processing payment flow for subscription: " + subscriptionId);

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price.id;
            const planInfo = PRICE_TO_PLAN_MAP[priceId];

            // v3.5: Verificar se é um add-on de número (não é upgrade de plano)
            const numberAddon = NUMBER_ADDON_PRICES[priceId];
            if (numberAddon) {
                console.log(`[Webhook] Number Add-on detected: ${numberAddon.displayName} (${numberAddon.country})`);

                // Buscar tenant_id pelo customer
                let addonTenantId: string | null = null;
                const customerEmail = invoice.customer_email;
                if (customerEmail) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("tenant_id")
                        .eq("email", customerEmail)
                        .maybeSingle();
                    addonTenantId = profile?.tenant_id || null;
                }

                if (addonTenantId) {
                    await supabase.from("number_subscriptions").upsert({
                        tenant_id: addonTenantId,
                        stripe_subscription_id: subscriptionId,
                        country_code: numberAddon.country,
                        status: "active",
                        updated_at: new Date().toISOString(),
                    }, { onConflict: "stripe_subscription_id" });
                    console.log(`[Webhook] Number subscription activated for tenant ${addonTenantId}`);
                } else {
                    console.warn(`[Webhook] Could not find tenant for number add-on: ${customerEmail}`);
                }

                return new Response(JSON.stringify({ received: true, type: "number_addon" }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            let userId: string | null = null;
            let userEmail: string | null = invoice.customer_email || null;

            const sessions = await stripe.checkout.sessions.list({
                limit: 10,
                subscription: subscriptionId,
            });

            const checkoutSession = sessions.data[0];
            if (checkoutSession?.client_reference_id) {
                userId = checkoutSession.client_reference_id;
                console.log("[Webhook] Found userId via checkout session: " + userId);
            }

            if (!userEmail) {
                const customer = await stripe.customers.retrieve(invoice.customer as string);
                if (customer && !customer.deleted) {
                    userEmail = customer.email;
                }
            }

            if (!userId && userEmail) {
                const { data: authUser } = await supabase.auth.admin.listUsers();
                const matchedUser = authUser?.users?.find((u: any) => u.email === userEmail);
                if (matchedUser) {
                    userId = matchedUser.id;
                    console.log("[Webhook] Found userId via email lookup: " + userId);
                }
            }

            if (!userId || !userEmail) {
                console.error("[Webhook] Could not identify user for invoice:", invoice.id);
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            const { data: existingSub } = await supabase
                .from("subscriptions")
                .select("welcome_email_sent_at")
                .eq("stripe_subscription_id", subscriptionId)
                .maybeSingle();

            if (existingSub?.welcome_email_sent_at) {
                console.log("[Webhook] Welcome email already sent for " + subscriptionId);
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            await supabase
                .from("subscriptions")
                .update({
                    status: "active",
                    updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscriptionId);

            await supabase
                .from("profiles")
                .update({
                    plan_type: planInfo?.plan.toLowerCase() || "start",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
                type: "magiclink",
                email: userEmail,
                options: {
                    // Redirecionar direto para o dashboard
                    redirectTo: appBaseUrl + "/dashboard",
                },
            });

            if (magicLinkError || !magicLinkData?.properties?.action_link) {
                console.error("[Webhook] Error generating magic link:", magicLinkError);
                return new Response(JSON.stringify({ received: true }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }

            const magicLink = magicLinkData.properties.action_link;
            console.log("[Webhook] Magic link generated for " + userEmail);

            // Enviar email de boas-vindas
            console.log("[Webhook] Attempting to send welcome email to:", userEmail);
            console.log("[Webhook] RESEND_API_KEY configured:", !!resendApiKey);

            const emailSent = await sendWelcomeEmail(
                userEmail,
                planInfo?.plan || "Start",
                magicLink
            );

            if (emailSent) {
                await supabase
                    .from("subscriptions")
                    .update({ welcome_email_sent_at: new Date().toISOString() })
                    .eq("stripe_subscription_id", subscriptionId);

                console.log("[Webhook] ✅ Welcome flow complete for " + userEmail);
            } else {
                console.error("[Webhook] ❌ Failed to send welcome email to " + userEmail);
            }
        }

        if (event.type === "customer.subscription.updated") {
            const subscription = event.data.object;

            await supabase
                .from("subscriptions")
                .update({
                    status: subscription.status,
                    current_period_start: safeTimestampToISO(subscription.current_period_start as number),
                    current_period_end: safeTimestampToISO(subscription.current_period_end as number),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);

            console.log("[Webhook] Subscription updated: " + subscription.id);
        }

        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object;

            await supabase
                .from("subscriptions")
                .update({
                    status: "canceled",
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);

            // v3.5: Também cancelar add-on de número se existir
            await supabase
                .from("number_subscriptions")
                .update({
                    status: "cancelled",
                    updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);

            console.log("[Webhook] Subscription canceled: " + subscription.id);
        }

        if (event.type === "invoice.payment_failed") {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription as string;

            if (subscriptionId) {
                await supabase
                    .from("subscriptions")
                    .update({
                        status: "past_due",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("stripe_subscription_id", subscriptionId);
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err: any) {
        console.error("[Webhook] Error:", err);
        return new Response("Webhook Error: " + err.message, { status: 400 });
    }
});
