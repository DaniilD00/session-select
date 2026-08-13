// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getTables } from "../_shared/locations.ts";
import { requireAdminCode } from "../_shared/security.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://www.readypixelgo.se").split(",").map(o => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
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

    const { adminAccessCode, slotDate, timeSlot, isActive, isCustom, isDelete, updatedBy, location } = await req.json();
    const tables = getTables(location);

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const auth = await requireAdminCode(req, supabaseClient, adminAccessCode);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: auth.status,
      });
    }

    if (!slotDate || !timeSlot) {
      throw new Error("slotDate and timeSlot are required");
    }

    logStep("Updating time slot", { slotDate, timeSlot, isActive, isCustom, isDelete });

    // If deleting entirely (e.g. removing custom slot), or an existing default slot being re-enabled
    if (isDelete || (isActive && !isCustom)) {
      const { error } = await supabaseClient
        .from(tables.overrides)
        .delete()
        .eq("slot_date", slotDate)
        .eq("time_slot", timeSlot);

      if (error) throw error;
    } else {
      // IMPORTANT: onConflict must point at the (slot_date, time_slot) unique
      // index. Without it, PostgREST falls back to the primary key (id) for
      // conflict resolution — since no id is supplied, that's never a match,
      // so every call after the first tries to INSERT a fresh row and hits
      // the unique index instead, throwing "duplicate key value violates
      // unique constraint" (surfaced to the admin as "local preview" fallback).
      const { error } = await supabaseClient
        .from(tables.overrides)
        .upsert({
          slot_date: slotDate,
          time_slot: timeSlot,
          is_active: isActive,
          updated_by: updatedBy ?? "admin-portal",
          updated_at: new Date().toISOString(),
        }, { onConflict: "slot_date,time_slot" });

      if (error) throw error;
    }

    const { data: overrides, error: fetchError } = await supabaseClient
      .from(tables.overrides)
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
