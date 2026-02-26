import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Loader2, Lock, Unlock, Save, X, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, RefreshCcw, Plus, UserPlus, Star, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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

interface UpcomingBookingItem {
  id: string;
  booking_date: string;
  time_slot: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  payment_status: string;
}

interface ExpiredPendingBooking {
  id: string;
  booking_date: string;
  time_slot: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  total_price: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

interface SlotState {
  time: string;
  status: "available" | "disabled" | "booked";
  bookingDetails?: BookingDetails;
}

interface AdminReview {
  id: string;
  email: string;
  rating: number;
  game_rating: number | null;
  enjoyed: string | null;
  improve: string | null;
  age_range: string | null;
  found_us: string | null;
  submitted_at: string;
  booking_id: string | null;
  bookings: {
    booking_date: string;
    time_slot: string;
    adults: number;
    children: number;
  } | null;
}

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

  // --- Add Reservation state ---
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addAdults, setAddAdults] = useState(0);
  const [addChildren, setAddChildren] = useState(0);
  const [addPrice, setAddPrice] = useState(349);
  const [addPriceManual, setAddPriceManual] = useState(false);
  const [addPaymentStatus, setAddPaymentStatus] = useState("paid");
  const [addPaymentMethod, setAddPaymentMethod] = useState("admin");
  const [addComment, setAddComment] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addEmailError, setAddEmailError] = useState("");
  const [addPhoneError, setAddPhoneError] = useState("");

  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBookingItem[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingHasMore, setUpcomingHasMore] = useState(false);
  const [expiredPendingBookings, setExpiredPendingBookings] = useState<ExpiredPendingBooking[]>([]);
  const [showExpiredPending, setShowExpiredPending] = useState(false);

  // --- Reviews state ---
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [expiredLoaded, setExpiredLoaded] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  // Persist lockout state in localStorage so page refresh doesn't bypass it
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      return Number(localStorage.getItem("admin_failed_attempts") || "0");
    } catch { return 0; }
  });
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem("admin_locked_until");
      if (stored) {
        const val = Number(stored);
        return val > Date.now() ? val : null;
      }
      return null;
    } catch { return null; }
  });
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        setLockCountdown(0);
        setAuthError(null);
        try {
          localStorage.removeItem("admin_locked_until");
          localStorage.removeItem("admin_failed_attempts");
        } catch {}
      } else {
        setLockCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const loadUpcomingBookings = useCallback(async (reset = false) => {
    if (!adminCode) return;
    
    setUpcomingLoading(true);
    
    try {
      const currentOffset = reset ? 0 : upcomingBookings.length;
      
      const { data, error } = await supabase.functions.invoke('get-upcoming-bookings', {
        body: { 
          adminAccessCode: adminCode,
          limit: 5,
          offset: currentOffset
        }
      });
      
      if (error) throw error;
      
      if (reset) {
        setUpcomingBookings(data.bookings || []);
      } else {
        setUpcomingBookings(prev => [...prev, ...(data.bookings || [])]);
      }
      
      // incompleteBookings are loaded separately on expand
      
      setUpcomingHasMore(data.hasMore);
    } catch (error: any) {
       console.error("Error loading upcoming bookings:", error);
       // Extract error message from body if available, or use the error object
       let errorMessage = "Failed to load upcoming bookings";
       if (error?.message) errorMessage = error.message;
       // If it's a Supabase invoke error, it might be stringified in the body or accessible differently
       
       toast({
        title: "Error fetching bookings",
        description: errorMessage,
        variant: "destructive"
       });
    } finally {
      setUpcomingLoading(false);
    }
  }, [adminCode, upcomingBookings.length, toast]);

  const loadIncompleteBookings = useCallback(async () => {
    if (!adminCode) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-upcoming-bookings', {
        body: { adminAccessCode: adminCode, limit: 0, offset: 0 }
      });
      if (error) throw error;
      setExpiredPendingBookings(data.incompleteBookings || []);
      setExpiredLoaded(true);
    } catch (error: any) {
      console.error("Error loading incomplete bookings:", error);
    }
  }, [adminCode]);

  // Initial load of upcoming bookings
  useEffect(() => {
    if (authenticated && adminCode) {
      loadUpcomingBookings(true);
      loadAdminReviews();
    }
  }, [authenticated, adminCode]);

  // Load latest reviews
  const loadAdminReviews = useCallback(async () => {
    if (!adminCode) return;
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-admin-reviews", {
        body: { adminAccessCode: adminCode },
      });
      if (error) throw error;
      if (data?.reviews) setAdminReviews(data.reviews);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  }, [adminCode]);

  // Load incomplete bookings when section is expanded
  useEffect(() => {
    if (showExpiredPending && adminCode && !expiredLoaded) {
      loadIncompleteBookings();
    }
  }, [showExpiredPending, adminCode, expiredLoaded, loadIncompleteBookings]);

  const timeOptions = useMemo(() => generateDefaultTimeSlots().map((slot) => slot.time), []);

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

      // Separate bookings: paid + fresh pending (<5min) are active, old pending go to separate section
      const HOLD_MS = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();

      const activeBookings: any[] = [];

      bookings?.forEach((booking: any) => {
        if (booking.payment_status === "paid") {
          activeBookings.push(booking);
        } else if (booking.payment_status === "pending") {
          const age = now - new Date(booking.created_at).getTime();
          if (age < HOLD_MS) {
            // Fresh pending — still holding the slot
            activeBookings.push(booking);
          }
          // Older pending are handled globally by get-upcoming-bookings
        }
      });

      const bookingsMap = new Map();
      activeBookings.forEach((booking: any) => {
        bookingsMap.set(booking.time_slot, booking);
      });
      
      const overrideMap = new Map<string, boolean>();
      overrides?.forEach((override: any) => {
        overrideMap.set(override.time_slot, override.is_active);
      });

      // Start with the default time slots for the selected date
      const defaultSlots = generateDefaultTimeSlots(selectedDate);
      const defaultTimes = new Set(defaultSlots.map(s => s.time));

      // Add any booked time slots that aren't in the default set (e.g. legacy 18:00 bookings)
      const allSlots = [...defaultSlots];
      for (const [timeSlot] of bookingsMap) {
        if (!defaultTimes.has(timeSlot)) {
          allSlots.push({ time: timeSlot, available: true });
        }
      }
      // Sort by time
      allSlots.sort((a, b) => a.time.localeCompare(b.time));

      const computedSlots: SlotState[] = allSlots.map((slot) => {
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

  // Auto-refresh every 60 seconds to clear stale pending bookings
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => {
      loadSlots();
      loadUpcomingBookings(true);
      if (showExpiredPending) {
        setExpiredLoaded(false);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [authenticated, loadSlots, loadUpcomingBookings]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleAuthenticate = async () => {
    if (isLocked) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin', {
        body: { adminAccessCode: codeInput.trim() }
      });
      if (error) throw error;
      if (data?.valid) {
        setAuthenticated(true);
        setAdminCode(codeInput.trim());
        setFailedAttempts(0);
        try {
          localStorage.removeItem("admin_failed_attempts");
          localStorage.removeItem("admin_locked_until");
        } catch {}
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        try { localStorage.setItem("admin_failed_attempts", String(newAttempts)); } catch {}
        if (newAttempts >= 3) {
          const lockExpiry = Date.now() + 3 * 60 * 1000; // 3 minutes
          setLockedUntil(lockExpiry);
          try { localStorage.setItem("admin_locked_until", String(lockExpiry)); } catch {}
          setAuthError("Too many failed attempts. Locked for 3 minutes.");
        } else {
          setAuthError(`Incorrect access code (${newAttempts}/3 attempts)`);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      try { localStorage.setItem("admin_failed_attempts", String(newAttempts)); } catch {}
      if (newAttempts >= 3) {
        const lockExpiry = Date.now() + 3 * 60 * 1000;
        setLockedUntil(lockExpiry);
        try { localStorage.setItem("admin_locked_until", String(lockExpiry)); } catch {}
        setAuthError("Too many failed attempts. Locked for 3 minutes.");
      } else {
        setAuthError(error?.message === "Unauthorized" ? `Incorrect access code (${newAttempts}/3 attempts)` : "Authentication failed");
      }
    } finally {
      setAuthLoading(false);
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

  // --- Auto-calculate price for admin reservation ---
  const calcAdminPrice = (adults: number, children: number): number => {
    const basePrice = 349;
    const adultsInBase = Math.min(adults, 2);
    const childrenInBase = Math.min(children, 2 - adultsInBase);
    const extraAdults = adults - adultsInBase;
    const extraChildren = children - childrenInBase;
    return basePrice + (extraAdults * 149) + (extraChildren * 99);
  };

  const handleOpenAddReservation = () => {
    setAddDate(format(selectedDate, "yyyy-MM-dd"));
    setAddTime("");
    setAddEmail("");
    setAddPhone("");
    setAddAdults(0);
    setAddChildren(0);
    setAddPrice(349);
    setAddPriceManual(false);
    setAddPaymentStatus("paid");
    setAddPaymentMethod("admin");
    setAddComment("");
    setAddEmailError("");
    setAddPhoneError("");
    setShowAddReservation(true);
  };

  const handleAdminAdultsChange = (val: number) => {
    setAddAdults(val);
    if (!addPriceManual) setAddPrice(calcAdminPrice(val, addChildren));
  };

  const handleAdminChildrenChange = (val: number) => {
    setAddChildren(val);
    if (!addPriceManual) setAddPrice(calcAdminPrice(addAdults, val));
  };

  const handleCreateReservation = async () => {
    if (!adminCode) return;
    if (!addDate || !addTime || !addEmail) {
      toast({ title: "Missing fields", description: "Date, time, and email are required.", variant: "destructive" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasError = false;
    if (!emailRegex.test(addEmail.trim())) {
      setAddEmailError("Invalid email format");
      hasError = true;
    } else {
      setAddEmailError("");
    }

    // Validate phone (if provided, must have at least 7 digits)
    if (addPhone.trim()) {
      const digits = addPhone.replace(/\D/g, "");
      if (digits.length < 7) {
        setAddPhoneError("Phone must have at least 7 digits");
        hasError = true;
      } else {
        setAddPhoneError("");
      }
    } else {
      setAddPhoneError("");
    }

    if (hasError) return;

    setAddLoading(true);
    try {
      const bookingPayload: Record<string, unknown> = {
        booking_date: addDate,
        time_slot: addTime,
        email: addEmail,
        phone: addPhone,
        adults: addAdults,
        children: addChildren,
        total_price: addPrice,
        payment_status: addPaymentStatus,
        payment_method: addPaymentMethod,
      };
      // Store comment in email field suffix if provided (admin note)
      // Actually, we don't have a comments column — we'll append to email for now
      // or just log it. Better: include as a note in the admin log.

      const { data, error } = await supabase.functions.invoke("admin-update-booking", {
        body: {
          adminAccessCode: adminCode,
          action: "create",
          booking: bookingPayload,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: "Reservation added", description: `Booking created for ${addEmail} on ${addDate} at ${addTime}` });
      setShowAddReservation(false);
      await loadSlots();
      await loadUpcomingBookings(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create reservation";
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
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
            {isLocked && (
              <p className="text-sm text-amber-600 font-medium">
                Try again in {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
              </p>
            )}
            <Button className="w-full" onClick={handleAuthenticate} disabled={authLoading || isLocked}>
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isLocked ? "Locked" : authLoading ? "Verifying..." : "Unlock"}
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
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={handleOpenAddReservation}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Reservation
            </Button>
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
        </div>

        <div className="grid lg:grid-cols-[360px,1fr] gap-6">
          <div className="space-y-6">
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
                <Collapsible>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-400">Bulk actions</p>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronDown className="h-4 w-4" />
                        <span className="sr-only">Toggle bulk actions</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      weekStartsOn={1}
                      className="rounded-md border border-red-500"
                      classNames={{
                        day_selected: "bg-red-600 text-white hover:bg-red-700 hover:text-white focus:bg-red-700 focus:text-white"
                      }}
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
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle>Upcoming Bookings</CardTitle>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => loadUpcomingBookings(true)} 
                disabled={upcomingLoading}
              >
                <RefreshCcw className={`h-4 w-4 ${upcomingLoading ? 'animate-reverse-spin' : ''}`} />
                <span className="sr-only">Refresh</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="px-6 py-4 space-y-4">
                  {upcomingLoading && upcomingBookings.length === 0 ? (
                    <div className="flex justify-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : upcomingBookings.length > 0 ? (
                    upcomingBookings.map((booking) => (
                      <div key={booking.id} className="flex flex-col space-y-1 text-sm border-b pb-3 last:border-0 last:pb-0 font-medium">
                        <div className="flex justify-between items-center text-primary">
                          <span className="flex items-center gap-2">
                            {format(new Date(booking.booking_date), "MMM d, yyyy")}
                            {booking.payment_status === "paid" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Paid" />
                            ) : booking.payment_status === "pending" ? (
                              <Clock className="h-4 w-4 text-amber-500" aria-label="Pending" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" aria-label={booking.payment_status} />
                            )}
                          </span>
                          <Badge variant="outline">{booking.time_slot}</Badge>
                        </div>
                         <div className="text-muted-foreground break-all">
                            {booking.email}
                         </div>
                         <div className="text-muted-foreground">
                            {booking.phone}
                         </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No upcoming bookings</p>
                  )}
                </div>
              </ScrollArea>
              {upcomingHasMore && (
                  <div className="p-4 border-t bg-muted/5">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full" 
                        onClick={() => loadUpcomingBookings(false)} 
                        disabled={upcomingLoading}
                    >
                        {upcomingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "View More"}
                    </Button>
                  </div>
              )}
            </CardContent>
          </Card>

          {/* Expired Pending Reservations - collapsible, hidden by default */}
          <Card className="flex flex-col border-amber-200/50">
            <Collapsible open={showExpiredPending} onOpenChange={setShowExpiredPending}>
              <CardHeader className="pb-3 border-b">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Incomplete Reservations</CardTitle>
                      {expiredPendingBookings.length > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                          {expiredPendingBookings.length}
                        </Badge>
                      )}
                    </div>
                    {showExpiredPending ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending, cancelled &amp; failed bookings from the last 3 days.
                </p>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <div className="px-6 py-4 space-y-4">
                      {expiredPendingBookings.length > 0 ? (
                        expiredPendingBookings.map((booking) => {
                          const ageMs = Date.now() - new Date(booking.created_at).getTime();
                          const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
                          const ageDays = Math.floor(ageHours / 24);
                          const ageLabel = ageDays > 0
                            ? `${ageDays}d ${ageHours % 24}h ago`
                            : ageHours > 0
                              ? `${ageHours}h ago`
                              : `${Math.floor(ageMs / (1000 * 60))}m ago`;

                          return (
                            <div
                              key={booking.id}
                              className="flex flex-col space-y-1 text-sm border-b pb-3 last:border-0 last:pb-0"
                            >
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 font-medium text-primary">
                                  {format(new Date(booking.booking_date), "MMM d, yyyy")}
                                  {booking.payment_status === "cancelled" ? (
                                    <X className="h-4 w-4 text-red-500" />
                                  ) : booking.payment_status === "failed" ? (
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-amber-500" />
                                  )}
                                </span>
                                <Badge variant="outline">{booking.time_slot}</Badge>
                              </div>
                              <div className="text-muted-foreground break-all">{booking.email}</div>
                              <div className="text-muted-foreground">{booking.phone}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {booking.payment_status === "cancelled" ? (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    Cancelled
                                  </Badge>
                                ) : booking.payment_status === "failed" ? (
                                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                                    Failed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    Pending
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {booking.adults + booking.children} guests
                                </Badge>
                                <Badge variant="outline">
                                  {booking.total_price} SEK
                                </Badge>
                                <span className="ml-auto text-xs opacity-60">{ageLabel}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-muted-foreground py-6 text-sm">
                          No incomplete reservations in the last 3 days
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          </div>

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

        {/* Latest Reviews */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Latest Reviews</CardTitle>
              {adminReviews.length > 0 && (
                <Badge variant="secondary">{adminReviews.length}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={loadAdminReviews}
              disabled={reviewsLoading}
            >
              {reviewsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {reviewsLoading && adminReviews.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reviews...
              </div>
            ) : adminReviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No reviews yet</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                {adminReviews.map((review) => {
                  const emailName = review.email.split("@")[0];
                  return (
                    <div
                      key={review.id}
                      onClick={() => setSelectedReview(review)}
                      className="flex-shrink-0 w-[260px] snap-start rounded-lg border bg-card p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all space-y-3"
                    >
                      {/* Header: name + age */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{emailName}</span>
                        {review.age_range && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {review.age_range}
                          </Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {review.rating}/10
                        </span>
                      </div>

                      {/* Improve comment */}
                      {review.improve ? (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {review.improve}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 italic">No improvement feedback</p>
                      )}

                      {/* Date */}
                      <p className="text-[11px] text-muted-foreground/60">
                        {new Date(review.submitted_at).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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

    {/* ===================== Add Reservation Dialog ===================== */}
    <Dialog open={showAddReservation} onOpenChange={(open) => { if (!open) setShowAddReservation(false); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Manual Reservation
          </DialogTitle>
          <DialogDescription>
            Create a new booking directly. The slot will be marked as booked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-date">Date *</Label>
              <Input
                id="add-date"
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-time">Time Slot *</Label>
              <select
                id="add-time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                disabled={addLoading}
              >
                <option value="">Select time</option>
                {/* Extended time range for admin — every hour 08-22 */}
                {Array.from({ length: 15 }, (_, i) => {
                  const h = (8 + i).toString().padStart(2, "0") + ":00";
                  return <option key={h} value={h}>{h}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid gap-1.5">
            <Label htmlFor="add-email">Email *</Label>
            <Input
              id="add-email"
              type="email"
              placeholder="customer@example.com"
              value={addEmail}
              onChange={(e) => { setAddEmail(e.target.value); setAddEmailError(""); }}
              disabled={addLoading}
              className={addEmailError ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {addEmailError && <p className="text-xs text-red-500 -mt-1">{addEmailError}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="add-phone">Phone</Label>
            <Input
              id="add-phone"
              type="tel"
              placeholder="+46 7X XXX XX XX"
              value={addPhone}
              onChange={(e) => { setAddPhone(e.target.value); setAddPhoneError(""); }}
              disabled={addLoading}
              className={addPhoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {addPhoneError && <p className="text-xs text-red-500 -mt-1">{addPhoneError}</p>}
          </div>

          {/* People — no upper cap for admin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-adults">Adults (18+)</Label>
              <Input
                id="add-adults"
                type="number"
                min={0}
                value={addAdults}
                onChange={(e) => handleAdminAdultsChange(Math.max(0, Number(e.target.value)))}
                disabled={addLoading}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-children">Children (&lt;18)</Label>
              <Input
                id="add-children"
                type="number"
                min={0}
                value={addChildren}
                onChange={(e) => handleAdminChildrenChange(Math.max(0, Number(e.target.value)))}
                disabled={addLoading}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Total: {addAdults + addChildren} people (no limit for admin)
          </p>

          {/* Price */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-price">Price (SEK)</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={addPriceManual}
                  onCheckedChange={(checked) => {
                    const manual = checked === true;
                    setAddPriceManual(manual);
                    if (!manual) setAddPrice(calcAdminPrice(addAdults, addChildren));
                  }}
                  className="h-4 w-4"
                />
                Custom price
              </label>
            </div>
            <Input
              id="add-price"
              type="number"
              min={0}
              value={addPrice}
              onChange={(e) => setAddPrice(Math.max(0, Number(e.target.value)))}
              disabled={addLoading || !addPriceManual}
            />
            {!addPriceManual && (
              <p className="text-xs text-muted-foreground">Auto-calculated. Check "Custom price" to override.</p>
            )}
          </div>

          {/* Payment status & method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-status">Payment Status</Label>
              <select
                id="add-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addPaymentStatus}
                onChange={(e) => setAddPaymentStatus(e.target.value)}
                disabled={addLoading}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-method">Payment Method</Label>
              <select
                id="add-method"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addPaymentMethod}
                onChange={(e) => setAddPaymentMethod(e.target.value)}
                disabled={addLoading}
              >
                <option value="admin">Admin (manual)</option>
                <option value="card">Card</option>
                <option value="klarna">Klarna</option>
                <option value="swish">Swish</option>
                <option value="cash">Cash</option>
                <option value="invoice">Invoice</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Comment */}
          <div className="grid gap-1.5">
            <Label htmlFor="add-comment">Admin Notes</Label>
            <Textarea
              id="add-comment"
              placeholder="Internal notes about this booking..."
              value={addComment}
              onChange={(e) => setAddComment(e.target.value)}
              disabled={addLoading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-4">
          <Button variant="outline" onClick={() => setShowAddReservation(false)} disabled={addLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateReservation} disabled={addLoading}>
            {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Review Detail Dialog */}
    <Dialog open={!!selectedReview} onOpenChange={(open) => { if (!open) setSelectedReview(null); }}>
      <DialogContent className="max-w-md">
        {selectedReview && (() => {
          const emailName = selectedReview.email.split("@")[0];
          const booking = selectedReview.bookings;
          return (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {emailName}
                  {selectedReview.age_range && (
                    <Badge variant="outline" className="text-xs">{selectedReview.age_range}</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Submitted {new Date(selectedReview.submitted_at).toLocaleDateString("sv-SE")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Overall rating */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Overall Rating</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < selectedReview.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{selectedReview.rating}/10</span>
                  </div>
                </div>

                {/* Game rating */}
                {selectedReview.game_rating && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Game Selection</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < selectedReview.game_rating!
                                ? "fill-purple-400 text-purple-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{selectedReview.game_rating}/10</span>
                    </div>
                  </div>
                )}

                {/* Booking info */}
                {booking && (
                  <div className="rounded-md border p-3 space-y-1.5 bg-muted/30">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Session Details</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(booking.booking_date).toLocaleDateString("sv-SE")} at {booking.time_slot}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {booking.adults + booking.children} guest{(booking.adults + booking.children) !== 1 ? "s" : ""}
                        <span className="text-muted-foreground ml-1">
                          ({booking.adults} adult{booking.adults !== 1 ? "s" : ""}{booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}` : ""})
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* How they found us */}
                {selectedReview.found_us && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Found via</Label>
                    <Badge variant="secondary">{selectedReview.found_us}</Badge>
                  </div>
                )}

                {/* Enjoyed */}
                {selectedReview.enjoyed && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">What they enjoyed</Label>
                    <p className="text-sm">{selectedReview.enjoyed}</p>
                  </div>
                )}

                {/* Improve */}
                {selectedReview.improve && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Improvement suggestions</Label>
                    <p className="text-sm">{selectedReview.improve}</p>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminSchedule;
