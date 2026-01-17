import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { generateDefaultTimeSlots } from "@/hooks/useAvailableTimeSlots";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Unlock, Save, X } from "lucide-react";

interface BookingDetails {
  id: string;
  bookingDate: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
}

interface SlotState {
  time: string;
  status: "available" | "disabled" | "booked";
  bookingDetails?: BookingDetails;
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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processingSlot, setProcessingSlot] = useState<string | null>(null);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, SlotState["status"]>>({});
  const [selectedBooking, setSelectedBooking] = useState<{ slotTime: string; details: BookingDetails } | null>(null);
  const [manageDate, setManageDate] = useState<string>("");
  const [manageTime, setManageTime] = useState<string>("");
  const [manageEmail, setManageEmail] = useState<string>("");
  const [managePhone, setManagePhone] = useState<string>("");
  const [manageLoading, setManageLoading] = useState<"update" | "release" | null>(null);
  const { toast } = useToast();

  const timeOptions = useMemo(() => generateDefaultTimeSlots().map((slot) => slot.time), []);

  const expectedCode = useMemo(
    () => (import.meta as any)?.env?.VITE_ADMIN_ACCESS_CODE || defaultAdminCode,
    []
  );

  const loadSlots = useCallback(async () => {
    if (!authenticated || !selectedDate || !adminCode) return;
    setLoadingSlots(true);
    setPendingChanges({}); // Clear pending changes on date change or reload

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke('get-admin-schedule', {
        body: { 
          adminAccessCode: adminCode,
          date: dateStr 
        }
      });

      if (error) throw error;

      const { bookings, overrides } = data;

      const bookingsMap = new Map();
      bookings?.forEach((booking: any) => {
        bookingsMap.set(booking.time_slot, booking);
      });
      
      const overrideMap = new Map<string, boolean>();
      overrides?.forEach((override: any) => {
        overrideMap.set(override.time_slot, override.is_active);
      });

      const computedSlots: SlotState[] = generateDefaultTimeSlots(selectedDate).map((slot) => {
        const booking = bookingsMap.get(slot.time);
        const isBooked = !!booking;
        const overrideIsActive = overrideMap.has(slot.time)
          ? overrideMap.get(slot.time) === true
          : true;
        const manuallyDisabled = overrideMap.has(slot.time)
          ? overrideMap.get(slot.time) === false
          : false;

        let status: SlotState["status"] = "available";
        let bookingDetails = undefined;

        if (isBooked) {
          status = "booked";
          bookingDetails = {
            id: booking.id,
            bookingDate: booking.booking_date,
            email: booking.email,
            phone: booking.phone,
            adults: booking.adults,
            children: booking.children,
            totalPrice: booking.total_price,
            paymentMethod: booking.payment_method,
            paymentStatus: booking.payment_status,
          };
        } else if (manuallyDisabled || !overrideIsActive) {
          status = "disabled";
        }

        return {
          time: slot.time,
          status,
          bookingDetails,
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
        generateDefaultTimeSlots(selectedDate).map((slot) => ({
          time: slot.time,
          status: "available" as const,
        }))
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [authenticated, selectedDate, toast, adminCode]);

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
    const datesToUpdate = selectedDates.length > 0 ? selectedDates : [selectedDate];

    try {
      const promises = datesToUpdate.flatMap((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return updates.map(([time, status]) => {
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
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error("Batch update errors:", errors);
        throw new Error(`${errors.length} updates failed. Check console for details.`);
      }

      const totalUpdates = updates.length * datesToUpdate.length;
      toast({
        title: "Changes saved",
        description: `Successfully updated ${updates.length} time slot(s) across ${datesToUpdate.length} date(s) (${totalUpdates} total updates).`,
      });
      
      setSelectedDates([]);
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
    setSelectedDates([]);
  };

  const openBookingManager = (slot: SlotState) => {
    if (!slot.bookingDetails) return;
    setSelectedBooking({ slotTime: slot.time, details: slot.bookingDetails });
    setManageDate(slot.bookingDetails.bookingDate);
    setManageTime(slot.time);
    setManageEmail(slot.bookingDetails.email);
    setManagePhone(slot.bookingDetails.phone);
  };

  const closeBookingManager = () => {
    if (manageLoading) return;
    setSelectedBooking(null);
  };

  const invokeBookingAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-update-booking", {
      body,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const handleReleaseBooking = async () => {
    if (!selectedBooking || !adminCode) return;
    if (!window.confirm("Release this booking? The slot will become available again.")) {
      return;
    }

    setManageLoading("release");
    try {
      await invokeBookingAction({
        adminAccessCode: adminCode,
        bookingId: selectedBooking.details.id,
        action: "release",
      });

      toast({
        title: "Slot released",
        description: "The booking has been cancelled and the slot is free again.",
      });

      setSelectedBooking(null);
      await loadSlots();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to release booking";
      toast({ title: "Release failed", description: message, variant: "destructive" });
    } finally {
      setManageLoading(null);
    }
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking || !adminCode) return;
    if (!manageDate || !manageTime) {
      toast({
        title: "Missing information",
        description: "Select both a date and time before saving.",
        variant: "destructive",
      });
      return;
    }

    setManageLoading("update");
    try {
      await invokeBookingAction({
        adminAccessCode: adminCode,
        bookingId: selectedBooking.details.id,
        action: "update",
        newDate: manageDate,
        newTime: manageTime,
        updates: {
          email: manageEmail,
          phone: managePhone,
        },
      });

      toast({
        title: "Booking updated",
        description: `Rescheduled to ${format(new Date(manageDate), "MMM d, yyyy")} at ${manageTime}`,
      });

      setSelectedBooking(null);
      await loadSlots();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update booking";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setManageLoading(null);
    }
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
    <>
    <div className="min-h-screen bg-muted/20 py-10 px-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Unlock className="h-6 w-6 text-primary" />
              Time Slot Control
            </h1>
            <p className="text-muted-foreground">
              Select slots to disable them. Uncheck to make them available. Use bulk calendar to apply changes to multiple dates.
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            setAuthenticated(false);
            setAdminCode(null);
            setCodeInput("");
            setSlots([]);
            setSelectedBooking(null);
          }}>
            Lock Admin Console
          </Button>
        </div>

        <div className="grid lg:grid-cols-[360px,1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select date(s)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Single date to view slots, or multiple dates for bulk changes
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                weekStartsOn={1}
                className="rounded-md border"
              />
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Bulk actions:</p>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  weekStartsOn={1}
                  className="rounded-md border"
                />
                {selectedDates.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedDates.length} date(s) selected for bulk update
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedDates([])}
                    >
                      Clear selection
                    </Button>
                  </div>
                )}
              </div>
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
                          <div className="space-y-1 w-full">
                            <div className="font-semibold text-lg">{slot.time}</div>
                            <div className="text-sm text-muted-foreground">
                              {isBooked ? "Booked" : isDisabled ? "Disabled" : "Available"}
                            </div>
                            
                            {isBooked && slot.bookingDetails && (
                              <div className="mt-3 pt-3 border-t border-border/50 text-sm space-y-2">
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <Badge variant="secondary" className="capitalize">
                                    {slot.bookingDetails.paymentStatus}
                                  </Badge>
                                  <Badge variant="outline" className="capitalize">
                                    {slot.bookingDetails.paymentMethod}
                                  </Badge>
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{slot.bookingDetails.email}</div>
                                  <div className="text-muted-foreground">{slot.bookingDetails.phone}</div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="bg-background">
                                    {slot.bookingDetails.adults + slot.bookingDetails.children} guests
                                  </Badge>
                                  <Badge variant="outline" className="bg-background">
                                    {slot.bookingDetails.totalPrice} SEK
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => openBookingManager(slot)}
                                >
                                  Manage booking
                                </Button>
                              </div>
                            )}
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
                {selectedDates.length > 0 && ` × ${selectedDates.length} date(s)`}
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

    <Dialog
      open={!!selectedBooking}
      onOpenChange={(open) => {
        if (!open) closeBookingManager();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Booking</DialogTitle>
          <DialogDescription>
            Update the booking details or release the slot for other customers.
          </DialogDescription>
        </DialogHeader>

        {selectedBooking && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="capitalize">
                  {selectedBooking.details.paymentStatus}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedBooking.details.paymentMethod}
                </Badge>
                <Badge variant="outline">
                  {selectedBooking.details.adults + selectedBooking.details.children} guests
                </Badge>
                <Badge variant="outline">{selectedBooking.details.totalPrice} SEK</Badge>
              </div>
              <div>
                <p className="font-semibold">{selectedBooking.details.email}</p>
                <p className="text-muted-foreground">{selectedBooking.details.phone}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Current slot: {format(new Date(selectedBooking.details.bookingDate), "MMM d, yyyy")} at {selectedBooking.slotTime}
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="manage-date">Date</Label>
                <Input
                  id="manage-date"
                  type="date"
                  value={manageDate}
                  onChange={(e) => setManageDate(e.target.value)}
                  disabled={manageLoading === "update"}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="manage-time">Time Slot</Label>
                <select
                  id="manage-time"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={manageTime}
                  onChange={(e) => setManageTime(e.target.value)}
                  disabled={manageLoading === "update"}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="manage-email">Email</Label>
                <Input
                  id="manage-email"
                  type="email"
                  value={manageEmail}
                  onChange={(e) => setManageEmail(e.target.value)}
                  disabled={manageLoading === "update"}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="manage-phone">Phone</Label>
                <Input
                  id="manage-phone"
                  type="tel"
                  value={managePhone}
                  onChange={(e) => setManagePhone(e.target.value)}
                  disabled={manageLoading === "update"}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="destructive"
                onClick={handleReleaseBooking}
                disabled={manageLoading === "release"}
              >
                {manageLoading === "release" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Release Slot
              </Button>
              <Button onClick={handleUpdateBooking} disabled={manageLoading === "update"}>
                {manageLoading === "update" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminSchedule;
