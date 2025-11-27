// functions/customer_update/index.ts
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        // Expect ClaimStatusUpdated payload
        const body = await req.json();

        const {
            correlationId,        // claim-<uuid>
            customerPseudonym,    // cust-<hash>
            status,               // Submitted | AwaitingDocuments | UnderReview | etc.
            actor,                // which agent updated
            reason,               // short reason
            meta                  // optional meta object
        } = body;

        if (!correlationId || !customerPseudonym || !status || !reason) {
            return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400 });
        }

        // Compose short message for customer (neutral, non-PII)
        const shortMessage = generateCustomerMessage(status, reason, meta);

        // Persist notification row - this triggers Supabase Realtime to subscribed clients
        const { data, error } = await supabase
            .from("customer_notifications")
            .insert([{
                correlation_id: correlationId,
                customer_pseudonym: customerPseudonym,
                notif_type: "StatusUpdate",
                status,
                message: shortMessage,
                detail: { actor, reason, meta, agentVersion: body.agentVersion || null }
            }]);

        if (error) {
            console.error("insert notification error:", error);
            return new Response(JSON.stringify({ error: "db_insert_failed" }), { status: 500 });
        }

        // Optionally: return the inserted row to the caller
        return new Response(JSON.stringify({ ok: true, notification: data[0] }), { status: 200 });
    } catch (err) {
        console.error("customer_update error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});

/** Compose a short neutral message for the customer - keep it human and neutral */
function generateCustomerMessage(status: string, reason: string, meta: any) {
    switch (status) {
        case "Submitted":
            return "Thanks — we’ve recorded your response and will update the claim status automatically.";
        case "AwaitingDocuments":
            // meta.docTypes might be ["front_photo"]
            const docs = Array.isArray(meta?.requiredDocs) ? meta.requiredDocs.join(", ") : "a document";
            return `We need ${docs}. Please upload it below and we'll continue processing.`;
        case "DocumentReceived":
            return "We received your document — the agent is evaluating it now.";
        case "UnderReview":
            return "Your claim is under review. We’ll notify you if we need anything else.";
        case "UnderSIUReview":
            return "We need to review some details further. An adjuster may contact you if needed.";
        case "FastTrackRecommended":
            return "Good news — your claim looks eligible for fast-track processing. An adjuster will finalize this shortly.";
        case "Completed":
            return "Your claim status is updated: completed. You will receive a follow-up soon.";
        default:
            return reason || "Your claim status has been updated. We’ll keep you posted.";
    }
}
