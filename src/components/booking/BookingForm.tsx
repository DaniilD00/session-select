import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Calendar, 
  Clock, 
  Users, 
  CreditCard,
  Smartphone,
  Building
} from "lucide-react";
import { format } from "date-fns";
import { BookingDetails } from "./BookingModal";
import { PersonSelector } from "./PersonSelector";
import { PaymentMethods } from "./PaymentMethods";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookingFormProps {
  bookingDetails: BookingDetails;
  adults: number;
  children: number;
  onAdultsChange: (count: number) => void;
  onChildrenChange: (count: number) => void;
  onBack: () => void;
  onClose: () => void;
}

export const BookingForm = ({
  bookingDetails,
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
  onBack,
  onClose,
}: BookingFormProps) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [promoInput, setPromoInput] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const { toast } = useToast();

  const totalGuests = adults + children;
  const tierIndex = totalGuests <= 2 ? 0 : totalGuests <= 4 ? 1 : 2;
  const adultRates = [350, 330, 300];
  const childRates = [300, 280, 250];
  const adultRate = adultRates[tierIndex];
  const childRate = childRates[tierIndex];
  const adultSubtotal = adults * adultRate;
  const childSubtotal = children * childRate;
  const baseTotal = adultSubtotal + childSubtotal;
  const discountedTotal = discountPercent > 0
    ? Math.round(baseTotal * (1 - discountPercent / 100))
    : baseTotal;
  const discountAmount = discountPercent > 0
    ? Math.round((baseTotal * discountPercent) / 100)
    : 0;

  const handleBooking = async () => {
    if (!email || !phone || !selectedPayment) {
      toast({
        title: "Please complete all fields",
        description: "Email, phone number, and payment method are required.",
        variant: "destructive",
      });
      return;
    }

    if (!bookingDetails.date || !bookingDetails.timeSlot) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time slot.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Determine effective price after discount
      const effectiveTotal = discountedTotal;

      // Create booking data
      const bookingData = {
        bookingDate: bookingDetails.date.toISOString().split('T')[0],
        timeSlot: bookingDetails.timeSlot,
        adults: bookingDetails.adults,
        children: bookingDetails.children,
        totalPrice: effectiveTotal,
        email,
        phone,
        paymentMethod: selectedPayment,
        discountCode: discountCode,
        discountPercent: discountPercent,
      };

      // Call the create-payment edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { bookingData },
      });

      if (error) {
        throw error;
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Calendar
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <Card className="booking-card sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Booking Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(bookingDetails.date!, "EEEE, MMMM d, yyyy")}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{bookingDetails.timeSlot} - 45 minutes</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {adults} adult{adults > 1 ? "s" : ""}{children > 0 && `, ${children} child${children > 1 ? "ren" : ""}`}
                </span>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Guests:</span>
                  <span>{totalGuests}</span>
                </div>
                {adults > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Adults ({adults} × {adultRate} SEK)</span>
                    <span>{adultSubtotal} SEK</span>
                  </div>
                )}
                {children > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Under 18 ({children} × {childRate} SEK)</span>
                    <span>{childSubtotal} SEK</span>
                  </div>
                )}
                <div className={`flex justify-between ${discountPercent > 0 ? "text-sm line-through text-muted-foreground" : "font-semibold text-lg"}`}>
                  <span>Subtotal:</span>
                  <span>{baseTotal} SEK</span>
                </div>
                {discountPercent > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Discount ({discountPercent}%):</span>
                      <span>-{discountAmount} SEK</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total Price:</span>
                      <span className="text-primary">{discountedTotal} SEK</span>
                    </div>
                  </>
                )}
              </div>

              <Badge variant="secondary" className="w-full justify-center">
                Tiered pricing applied
              </Badge>
            </CardContent>
          </Card>
        </div>

  {/* Booking Form */}
  <div className="lg:col-span-2 space-y-6 min-h-0">
          {/* Person Selection */}
          <PersonSelector
            adults={adults}
            children={children}
            onAdultsChange={onAdultsChange}
            onChildrenChange={onChildrenChange}
          />

          {/* Promo code */}
          <Card className="booking-card">
            <CardHeader>
              <CardTitle>Have a promo code?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 max-sm:flex-col">
                <Input
                  placeholder="Enter code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const code = promoInput.trim().toUpperCase();
                    const expected = ((import.meta as any)?.env?.VITE_LAUNCH_CODE || 'READYPIXELLAUNCH25').toUpperCase();
                    const expiry = new Date((import.meta as any)?.env?.VITE_LAUNCH_CODE_EXPIRY || '2026-01-22');
                    const pct = Number((import.meta as any)?.env?.VITE_LAUNCH_DISCOUNT_PERCENT || 10);
                    if (code === expected && new Date() <= expiry) {
                      setDiscountPercent(pct);
                      setDiscountCode(code);
                      toast({ title: `Promo applied: ${pct}% off` });
                    } else if (code !== expected) {
                      toast({ title: 'Invalid code', variant: 'destructive' });
                      setDiscountPercent(0);
                      setDiscountCode(null);
                    } else {
                      toast({ title: 'Code expired', variant: 'destructive' });
                      setDiscountPercent(0);
                      setDiscountCode(null);
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="booking-card">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+46 70 123 45 67"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <PaymentMethods
            selectedPayment={selectedPayment}
            onPaymentSelect={setSelectedPayment}
          />

          {/* Complete Booking */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2">
            <Button
              onClick={handleBooking}
              size="lg"
              className="w-full booking-gradient text-white hover:opacity-90 booking-spring h-14 text-lg font-semibold"
            >
              Complete Booking - {discountedTotal} SEK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};