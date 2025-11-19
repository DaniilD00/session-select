import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDefaultTimeSlots } from "@/hooks/useAvailableTimeSlots";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Unlock, Save, X } from "lucide-react";

interface SlotState {
  time: string;
  status: "available" | "disabled" | "booked";
}

const defaultAdminCode = "Dastardly2025.";

const statusCopy = {
  available: "Active",
  disabled: "Disabled",
  booked: "Booked",
};

const statusClasses: Record<SlotState["status"], string> = {
  available: "bg-green-600/90 text-white hover:bg-green-600",
  disabled: "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-100",
  booked: "bg-muted text-muted-foreground border border-muted hover:bg-muted",
};

const AdminSchedule = () => {
  const [codeInput, setCodeInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processingSlot, setProcessingSlot] = useState<string | null>(null);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, SlotState["status"]>>({});
  const { toast } = useToast();

  const expectedCode = useMemo(
    () => (import.meta as any)?.env?.VITE_ADMIN_ACCESS_CODE || defaultAdminCode,
    []
  );

  const loadSlots = useCallback(async () => {
    if (!authenticated || !selectedDate) return;
    setLoadingSlots(true);
    setPendingChanges({}); // Clear pending changes on date change or reload

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const [{ data: bookings, error: bookingsError }, { data: overrides, error: overridesError }] = await Promise.all([
        supabase
          .from("bookings")
          .select("time_slot, payment_status")
          .eq("booking_date", dateStr)
          .in("payment_status", ["paid", "pending"]),
        supabase
          .from("time_slot_overrides")
          .select("time_slot, is_active")
          .eq("slot_date", dateStr),
      ]);

      if (bookingsError) {
        throw bookingsError;
      }

      const bookedSlots = new Set((bookings || []).map((booking) => booking.time_slot));
      const overrideMap = new Map<string, boolean>();

      if (overridesError) {
        const message = overridesError.message?.toLowerCase?.() ?? "";
        const missingTable = message.includes("time_slot_overrides") || message.includes("does not exist");
        toast({
          title: "Overrides unavailable",
          description: missingTable
            ? "time_slot_overrides table missing. Run the latest Supabase migration and redeploy."
            : overridesError.message || "Could not read overrides",
          variant: "destructive",
        });
      } else {
        overrides?.forEach((override) => {
          overrideMap.set(override.time_slot, override.is_active);
        });
      }

      const computedSlots: SlotState[] = generateDefaultTimeSlots().map((slot) => {
        const isBooked = bookedSlots.has(slot.time);
        const overrideIsActive = overrideMap.has(slot.time)
          ? overrideMap.get(slot.time) === true
          : true;
        const manuallyDisabled = overrideMap.has(slot.time)
          ? overrideMap.get(slot.time) === false
          : false;

        let status: SlotState["status"] = "available";
        if (isBooked) {
          status = "booked";
        } else if (manuallyDisabled || !overrideIsActive) {
          status = "disabled";
        }

        return {
          time: slot.time,
          status,
        };
      });

      setSlots(computedSlots);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load slots";
      const relationMissing = message.toLowerCase().includes("bookings") && message.toLowerCase().includes("does not exist");
      toast({
        title: "Unable to load slots",
        description: relationMissing
          ? "bookings table not reachable. Check Supabase credentials or run migrations."
          : message,
        variant: "destructive",
      });
      setSlots(
        generateDefaultTimeSlots().map((slot) => ({
          time: slot.time,
          status: "available" as const,
        }))
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [authenticated, selectedDate, toast]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleAuthenticate = () => {
    if (codeInput.trim() === expectedCode) {
      setAuthenticated(true);
      setAdminCode(codeInput.trim());
      setAuthError(null);
    } else {
      setAuthError("Incorrect access code");
    }
  };

  const handleTogglePending = (slot: SlotState) => {
    if (slot.status === "booked") return;

    setPendingChanges((prev) => {
      const currentStatus = prev[slot.time] || slot.status;
      // Toggle between available and disabled
      const newStatus = currentStatus === "available" ? "disabled" : "available";

      // If new status matches original, remove from pending
      if (newStatus === slot.status) {
        const { [slot.time]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [slot.time]: newStatus };
    });
  };

  const handleApplyChanges = async () => {
    if (!selectedDate || !adminCode) return;
    
    const updates = Object.entries(pendingChanges);
    if (updates.length === 0) return;

    setProcessingSlot("batch");
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const promises = updates.map(([time, status]) => {
        // If status is 'available', we want isActive=true (which deletes override or sets it to true)
        // If status is 'disabled', we want isActive=false (which sets override to false)
        const isActive = status === "available";
        
        return supabase.functions.invoke("manage-time-slots", {
          body: {
            adminAccessCode: adminCode,
            slotDate: dateStr,
            timeSlot: time,
            isActive: isActive,
            updatedBy: "admin-dashboard",
          },
        });
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error("Batch update errors:", errors);
        throw new Error(`${errors.length} updates failed. Check console for details.`);
      }

      toast({
        title: "Changes saved",
        description: `Successfully updated ${updates.length} time slots.`,
      });
      
      await loadSlots();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update slots";
      
      // Fallback for local testing if backend is not deployed
      console.warn("Backend update failed, applying local changes for testing:", error);
      
      // Apply changes locally so the user can see the UI interaction
      const newSlots = slots.map(slot => {
        const pendingStatus = pendingChanges[slot.time];
        if (pendingStatus) {
          return { ...slot, status: pendingStatus };
        }
        return slot;
      });
      
      setSlots(newSlots);
      setPendingChanges({});
      
      toast({ 
        title: "Update failed (Local Preview)", 
        description: "Backend not reachable. Changes applied locally for testing.", 
        variant: "destructive" 
      });
    } finally {
      setProcessingSlot(null);
    }
  };

  const handleCancelChanges = () => {
    setPendingChanges({});
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the admin code to manage time slot availability.
            </p>
            <Input
              type="password"
              placeholder="Access code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAuthenticate();
              }}
            />
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <Button className="w-full" onClick={handleAuthenticate}>
              Unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Unlock className="h-6 w-6 text-primary" />
              Time Slot Control
            </h1>
            <p className="text-muted-foreground">
              Select slots to disable them. Uncheck to make them available. Click "Apply Changes" to save.
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            setAuthenticated(false);
            setAdminCode(null);
            setCodeInput("");
            setSlots([]);
          }}>
            Lock Admin Console
          </Button>
        </div>

        <div className="grid lg:grid-cols-[360px,1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                weekStartsOn={1}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card className="flex flex-col relative overflow-hidden">
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>
                Slots on {format(selectedDate, "EEEE, MMM d, yyyy")}
              </CardTitle>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">●</Badge>
                  Active
                </span>
                <span className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white">●</Badge>
                  Disabled
                </span>
                <span className="flex items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground">●</Badge>
                  Booked
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading slots...
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((slot) => {
                    const currentStatus = pendingChanges[slot.time] || slot.status;
                    const isPending = slot.time in pendingChanges;
                    const isDisabled = currentStatus === "disabled";
                    const isBooked = slot.status === "booked";

                    return (
                      <div
                        key={slot.time}
                        className={`relative rounded-xl border p-4 transition-all ${
                          isBooked 
                            ? "bg-muted/50 border-muted" 
                            : isDisabled 
                              ? "bg-amber-50 border-amber-200" 
                              : "bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-lg">{slot.time}</div>
                            <div className="text-sm text-muted-foreground">
                              {isBooked ? "Booked" : isDisabled ? "Disabled" : "Available"}
                            </div>
                          </div>
                          {!isBooked && (
                            <Checkbox 
                              checked={isDisabled}
                              onCheckedChange={() => handleTogglePending(slot)}
                              className="h-6 w-6"
                            />
                          )}
                        </div>
                        {isPending && (
                          <div className="absolute top-2 right-2">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            
            {/* Loading overlay for batch processing */}
            {processingSlot === "batch" && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="bg-card p-6 rounded-lg shadow-lg border flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-medium">Saving changes...</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Sticky Footer for Actions */}
      {hasPendingChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50 animate-in slide-in-from-bottom-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium">
                {Object.keys(pendingChanges).length} pending change(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleCancelChanges} disabled={processingSlot === "batch"}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleApplyChanges} disabled={processingSlot === "batch"}>
                {processingSlot === "batch" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedule;
