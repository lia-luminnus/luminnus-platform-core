// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFrom = Deno.env.get("RESEND_FROM") || "Luminnus <lia@luminnus.ai>";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * LIA Email Service
 * Handles sending transactional and management emails via Resend
 * Tracks status in emails_outbox and email_events tables
 */
Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const path = url.pathname;

    try {
        // 1. SEND EMAIL ENDPOINT
        if (req.method === "POST" && path.endsWith("/send")) {
            const { to, subject, html, metadata, tenant_id, user_id } = await req.json();

            if (!to || !subject || !html) {
                return new Response(JSON.stringify({ error: "Missing required fields" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Record in outbox first (Pending)
            const { data: outboxEntry, error: outboxError } = await supabase
                .from("emails_outbox")
                .insert({
                    tenant_id,
                    user_id,
                    recipient_email: Array.isArray(to) ? to[0] : to,
                    subject,
                    content_html: html,
                    status: "pending",
                    metadata,
                })
                .select()
                .single();

            if (outboxError) {
                console.error("Outbox error:", outboxError);
                return new Response(JSON.stringify({ error: "Failed to log email" }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Send via Resend
            console.log(`Sending email to ${to} via Resend...`);
            const resendResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: resendFrom,
                    to,
                    subject,
                    html,
                    tags: [
                        { name: "outbox_id", value: outboxEntry.id },
                        { name: "tenant_id", value: tenant_id || "system" },
                    ],
                }),
            });

            const resendResult = await resendResponse.json();

            if (!resendResponse.ok) {
                console.error("Resend error:", resendResult);
                await supabase
                    .from("emails_outbox")
                    .update({
                        status: "failed",
                        error_message: resendResult.message || "Unknown error"
                    })
                    .eq("id", outboxEntry.id);

                return new Response(JSON.stringify({ error: "Resend failed", details: resendResult }), {
                    status: 502,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Update outbox with Message ID from Resend
            await supabase
                .from("emails_outbox")
                .update({
                    status: "sent",
                    external_id: resendResult.id,
                    sent_at: new Date().toISOString()
                })
                .eq("id", outboxEntry.id);

            return new Response(JSON.stringify({ success: true, email_id: outboxEntry.id, external_id: resendResult.id }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. WEBHOOK ENDPOINT (For Resend)
        if (req.method === "POST" && path.endsWith("/webhook")) {
            const payload = await req.json();
            const { type, created_at, data } = payload;
            const externalId = data.email_id;

            console.log(`Received Resend webhook: ${type} for ${externalId}`);

            // Record event
            await supabase.from("email_events").insert({
                external_id: externalId,
                event_type: type,
                raw_payload: payload,
            });

            // Update outbox status based on event
            if (["delivered", "bounced", "complained"].includes(type)) {
                await supabase
                    .from("emails_outbox")
                    .update({
                        status: type,
                        updated_at: new Date().toISOString()
                    })
                    .eq("external_id", externalId);
            }

            return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Server error:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error", message: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
