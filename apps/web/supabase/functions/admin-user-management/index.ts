// @ts-nocheck - Deno Edge Function: JSR imports are not recognized by VS Code TypeScript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminActionRequest {
    userId: string;
    action: "delete" | "reset";
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify admin authorization (check if caller is admin)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create client with user token to verify identity
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        // Verify the calling user is an admin
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();

        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if caller is admin (luminnus.lia.ai@gmail.com)
        const adminEmails = ["luminnus.lia.ai@gmail.com"];
        if (!adminEmails.includes(caller.email || "")) {
            return new Response(
                JSON.stringify({ error: "Forbidden: Admin access required" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body safely
        let body: AdminActionRequest;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(
                JSON.stringify({ error: "Invalid JSON body" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { userId, action } = body;

        if (!userId) {
            return new Response(
                JSON.stringify({ error: "Missing userId parameter" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create admin client with service role key
        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        if (action === "delete") {
            try {
                // 1. Get the tenant_id first so we can clean up tenant specific data
                const { data: tenantMembers } = await adminClient
                    .from("tenant_members")
                    .select("tenant_id")
                    .eq("user_id", userId);

                // 2. Clear out user specific generic data to prevent FK errors
                await adminClient.from("files").delete().eq("user_id", userId);
                await adminClient.from("file_folders").delete().eq("owner_user_id", userId);
                await adminClient.from("user_integrations").delete().eq("user_id", userId);

                // 3. Clear out tenant specific data if they owned one
                if (tenantMembers && tenantMembers.length > 0) {
                    for (const tm of tenantMembers) {
                        const tenantId = tm.tenant_id;
                        // Wipe messages and conversations
                        await adminClient.from("messages").delete().eq("tenant_id", tenantId);
                        await adminClient.from("conversations").delete().eq("tenant_id", tenantId);
                        // Wipe whatsapp data
                        const { data: instances } = await adminClient.from("whatsapp_instances").select("id").eq("tenant_id", tenantId);
                        if (instances && instances.length > 0) {
                            for (const inst of instances) {
                                await adminClient.from("whatsapp_qr_codes").delete().eq("instance_id", inst.id);
                            }
                        }
                        await adminClient.from("whatsapp_instances").delete().eq("tenant_id", tenantId);
                        // Wipe billing
                        await adminClient.from("subscriptions").delete().eq("tenant_id", tenantId);
                        // Finally wipe tenant and its members
                        await adminClient.from("tenant_members").delete().eq("tenant_id", tenantId);
                        await adminClient.from("tenants").delete().eq("id", tenantId);
                    }
                }

                // 4. Delete cross-referenced billing/members logic connected to user_id directly
                await adminClient.from("tenant_members").delete().eq("user_id", userId);
                await adminClient.from("subscriptions").delete().eq("user_id", userId);

                // 5. Delete from profiles
                await adminClient.from("profiles").delete().eq("id", userId);

                // 6. Delete from auth.users using Admin API (Final wipe)
                const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

                if (authError) {
                    throw new Error(`Failed to delete from auth: ${authError.message}`);
                }

                return new Response(
                    JSON.stringify({ success: true, message: "User deleted completely from Supabase including all relations" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } catch (err: any) {
                console.error("Deep Wipe Error:", err);
                return new Response(
                    JSON.stringify({ error: err.message || "Unknown error during deep wipe" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

        } else if (action === "reset") {
            // Reset user onboarding and remove any active plan
            const { error: resetError } = await adminClient
                .from("profiles")
                .update({
                    onboarding_completed: false,
                    segment: null,
                    modules: null,
                    plan_type: 'free' // Force plan to free so billing starts fresh
                })
                .eq("id", userId);

            if (resetError) {
                return new Response(
                    JSON.stringify({ error: `Failed to reset profile: ${resetError.message}` }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Clean up tenant_members if exists
            await adminClient.from("tenant_members").delete().eq("user_id", userId);

            // Delete subscriptions to wipe any purchased products
            await adminClient.from("subscriptions").delete().eq("user_id", userId);

            return new Response(
                JSON.stringify({ success: true, message: "User reset successfully with plan cleared" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        } else {
            return new Response(
                JSON.stringify({ error: "Invalid action. Use 'delete' or 'reset'" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
    } catch (error: any) {
        console.error("Edge function error:", error);
        return new Response(
            JSON.stringify({ error: error?.message || "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

