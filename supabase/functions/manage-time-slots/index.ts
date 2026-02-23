// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://www.readypixelgo.se").split(",").map(o => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a || "");
  const bBuf = encoder.encode(b || "");
  let result = aBuf.length === bBuf.length ? 0 : 1;
  const len = Math.max(aBuf.length, bBuf.length);
  for (let i = 0; i < len; i++) {
    result |= (aBuf[i] || 0) ^ (bBuf[i] || 0);
  }
  return result === 0;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const extra = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-TIME-SLOTS] ${step}${extra}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminCode = Deno.env.get("ADMIN_ACCESS_CODE");
    if (!adminCode) throw new Error("ADMIN_ACCESS_CODE is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service configuration is missing");
    }

    const { adminAccessCode, slotDate, timeSlot, isActive, updatedBy } = await req.json();

    if (!constantTimeEqual(adminAccessCode, adminCode)) {
      return new Response(JSON.stringify({ error: "Invalid admin code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!slotDate || !timeSlot || typeof isActive !== "boolean") {
      throw new Error("slotDate, timeSlot and isActive are required");
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    logStep("Updating time slot", { slotDate, timeSlot, isActive });

    if (isActive) {
      const { error } = await supabaseClient
        .from("time_slot_overrides")
        .delete()
        .eq("slot_date", slotDate)
        .eq("time_slot", timeSlot);

      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("time_slot_overrides")
        .upsert({
          slot_date: slotDate,
          time_slot: timeSlot,
          is_active: false,
          updated_by: updatedBy ?? "admin-portal",
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    const { data: overrides, error: fetchError } = await supabaseClient
      .from("time_slot_overrides")
      .select("slot_date, time_slot, is_active, updated_at, updated_by")
      .eq("slot_date", slotDate);

    if (fetchError) throw fetchError;

    return new Response(
      JSON.stringify({ success: true, overrides }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });

    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
