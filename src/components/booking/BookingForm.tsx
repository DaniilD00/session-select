import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Calendar, 
  Clock, 
  Users, 
  CreditCard,
  Smartphone,
  Phone,
  Mail,
  Building,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { BookingDetails } from "./BookingModal";
import { PersonSelector } from "./PersonSelector";
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
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const { toast } = useToast();

  const totalGuests = adults + children;
  const basePrice = 349;
  
  // Calculate total price based on:
  // - 1-2 people: 349 SEK total (Base)
  // - Fill base slots (2) with Adults first, then Children
  // - Additional Adult: +149 SEK
  // - Additional Child: +99 SEK
  
  const adultsInBase = Math.min(adults, 2);
  const childrenInBase = Math.min(children, 2 - adultsInBase);
  
  const extraAdults = adults - adultsInBase;
  const extraChildren = children - childrenInBase;
  
  const baseTotal = basePrice + (extraAdults * 149) + (extraChildren * 99);

  const discountedTotal = discountPercent > 0
    ? Math.round(baseTotal * (1 - discountPercent / 100))
    : baseTotal;
  const discountAmount = discountPercent > 0
    ? Math.round((baseTotal * discountPercent) / 100)
    : 0;

  const handleBooking = async () => {
    // Reset errors
    setEmailError(false);
    setPhoneError(false);
    setTermsError(false);

    // Validate email
    // Basic check: must contain @ and a dot afterwards.
    // User requested specifically to check for valid ending like .com or .se
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    const isEmailValid = emailRegex.test(email);

    // Validate phone
    // User requested: 
    // - can start with + or 0
    // - length between 6 and 15 digits (using 15 as common max for E.164)
    // - strip non-digits to check length
    const phoneDigits = phone.replace(/\D/g, '');
    const isPhoneValid = phoneDigits.length >= 6 && phoneDigits.length <= 15;

    let hasError = false;

    if (!isEmailValid) {
      setEmailError(true);
      hasError = true;
    }

    if (!isPhoneValid) {
      setPhoneError(true);
      hasError = true;
    }

    if (!termsAccepted) {
      setTermsError(true);
      hasError = true;
    }

    if (hasError) {
      toast({
        title: t('booking.missingInfo'),
        description: !termsAccepted ? "Du måste godkänna villkoren för att fortsätta." : t('booking.invalidContactInfoDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!bookingDetails.date || !bookingDetails.timeSlot) {
      toast({
        title: t('booking.missingDate'),
        description: t('booking.missingDateDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Determine effective price after discount
      const effectiveTotal = discountedTotal;

      // Create booking data
      const bookingData = {
        bookingDate: format(bookingDetails.date!, "yyyy-MM-dd"),
        timeSlot: bookingDetails.timeSlot,
        adults: bookingDetails.adults,
        children: bookingDetails.children,
        totalPrice: effectiveTotal,
        email,
        phone,
        paymentMethod: "card", // Default to card for Stripe Checkout initialization
        discountCode: discountCode,
        discountPercent: discountPercent,
      };

      console.log('Creating payment with data:', bookingData);

      // Call the create-payment edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { bookingData },
      });

      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create payment session');
      }

      if (!data || !data.url) {
        throw new Error('No checkout URL received from payment service');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: t('booking.bookingFailed'),
        description: errorMessage.includes('FunctionsRelayError') 
          ? "Payment service is not available. Please contact support." // This technical error might not need translation or can use a generic one
          : t('booking.bookingFailedDesc'),
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
        {t('booking.backToCalendar')}
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <Card className="booking-card sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t('booking.summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(bookingDetails.date!, "EEEE, d MMMM yyyy", { locale: i18n.language === 'sv' ? sv : enUS })}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{bookingDetails.timeSlot} - 45 {t('booking.minutes')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {adults} {adults === 1 ? t('booking.adult') : t('booking.adults_plural')}{children > 0 && `, ${children} ${children === 1 ? t('booking.child') : t('booking.children')}`}
                </span>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('booking.totalGuests')}</span>
                  <span>{totalGuests}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>{t('pricing.basePrice')} {totalGuests <= 2 ? '(1-2)' : '(2)'}</span>
                  <span>{basePrice} SEK</span>
                </div>
                
                {extraAdults > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('pricing.additionalAdult')} ({extraAdults} × 149 SEK)</span>
                    <span>{extraAdults * 149} SEK</span>
                  </div>
                )}

                {extraChildren > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('pricing.additionalChild')} ({extraChildren} × 99 SEK)</span>
                    <span>{extraChildren * 99} SEK</span>
                  </div>
                )}
                
                <div className={`flex justify-between ${discountPercent > 0 ? "text-sm line-through text-muted-foreground" : "font-semibold text-lg"}`}>
                  <span>{t('booking.subtotal')}</span>
                  <span>{baseTotal} SEK</span>
                </div>
                {discountPercent > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>{t('booking.discount')} ({discountPercent}%):</span>
                      <span>-{discountAmount} SEK</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t('booking.totalPrice')}</span>
                      <span className="text-primary">{discountedTotal} SEK</span>
                    </div>
                  </>
                )}
              </div>

              <Badge variant="secondary" className="w-full justify-center">
                {t('booking.tieredPricing')}
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
            <Collapsible>
              <CardHeader className="py-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex w-full justify-between p-0, h-auto">
                    <CardTitle className="text-base">{t('booking.promoCode')}</CardTitle>
                    <ChevronDown className="h-4 w-4 opacity-100" />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex gap-2 max-sm:flex-col">
                    <Input
                      placeholder={t('booking.enterCode')}
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        const code = promoInput.trim().toUpperCase();
                        const expected = ((import.meta as any)?.env?.VITE_LAUNCH_CODE || 'READYPIXELLAUNCH25').toUpperCase();
                        const expiry = new Date((import.meta as any)?.env?.VITE_LAUNCH_CODE_EXPIRY || '2026-03-01');
                        const pct = Number((import.meta as any)?.env?.VITE_LAUNCH_DISCOUNT_PERCENT || 10);
                        if (code === expected && new Date() <= expiry) {
                          setDiscountPercent(pct);
                          setDiscountCode(code);
                          toast({ title: `${t('booking.promoApplied')}: ${pct}%` });
                        } else if (code !== expected) {
                          toast({ title: t('booking.invalidCode'), variant: 'destructive' });
                          setDiscountPercent(0);
                          setDiscountCode(null);
                        } else {
                          toast({ title: t('booking.codeExpired'), variant: 'destructive' });
                          setDiscountPercent(0);
                          setDiscountCode(null);
                        }
                      }}
                    >
                      {t('booking.apply')}
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Contact Information */}
          <Card className="booking-card">
            <CardHeader>
              <CardTitle>{t('booking.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className={`flex items-center gap-2 ${emailError ? "text-destructive" : ""}`}>
                    <Mail className="h-4 w-4" />
                    {t('booking.email')} *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(false);
                    }}
                    placeholder="your@email.com"
                    required
                    className={emailError ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className={`flex items-center gap-2 ${phoneError ? "text-destructive" : ""}`}>
                    <Phone className="h-4 w-4" />
                    {t('booking.phone')} *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(false);
                    }}
                    placeholder="+46 70 123 45 67"
                    required
                    className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <div className={`flex items-start space-x-3 p-4 rounded-lg border bg-card transition-colors ${termsError ? "border-destructive bg-destructive/5" : ""}`}>
            <Checkbox 
              id="terms" 
              checked={termsAccepted}
              onCheckedChange={(checked) => {
                setTermsAccepted(checked as boolean);
                if (termsError) setTermsError(false);
              }}
              className={`mt-1 ${termsError ? "border-destructive" : ""}`}
            />
            <div className="space-y-1 leading-none">
              <Label 
                htmlFor="terms" 
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${termsError ? "text-destructive" : ""}`}
              >
                Jag godkänner <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-primary hover:underline font-semibold focus:outline-none" onClick={(e) => e.stopPropagation()}>
                      villkoren*
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Bokning & Betalningspolicy</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="space-y-4 text-sm text-muted-foreground pb-4">
                        <h3 className="font-semibold text-foreground">1. Genomförande av bokning</h3>
                        <p>För att en bokning ska vara giltig och fullständigt genomförd krävs en godkänd betalning. När du reserverar en tid hålls den preliminärt i 5 minuter. Om betalningen inte slutförs inom denna tidsram kommer tiden automatiskt att släppas och bli tillgänglig för andra kunder.</p>
                        
                        <h3 className="font-semibold text-foreground">2. Betalningsmetoder</h3>
                        <p>Vi accepterar betalningar via vår säkra betalningspartner Stripe. Du kan betala med de vanligaste betal- och kreditkorten. Alla priser anges i Svenska Kronor (SEK) och inkluderar moms.</p>
                        
                        <h3 className="font-semibold text-foreground">3. Ombokning</h3>
                        <p>Vi förstår att planer kan ändras. Du kan boka om din tid kostnadsfritt genom att kontakta oss via telefon eller e-post (Info@readypixelgo.se) senast 48 timmar innan din bokade tid startar. Vid ombokning senare än 48 timmar innan start kan vi tyvärr inte garantera att en kostnadsfri ändring är möjlig.</p>
                        
                        <h3 className="font-semibold text-foreground">4. Avbokning och Återbetalning</h3>
                        <p>Om du önskar avboka din tid och få en återbetalning kan detta göras genom att kontakta oss. Vid en godkänd återbetalning tillkommer en återbetalningsavgift på 149 kr för att täcka administrativa kostnader och transaktionsavgifter. Denna avgift dras automatiskt av från det belopp som återbetalas till dig. Vänligen notera att det kan ta upp till 14 dagar innan återbetalningen är helt genomförd och pengarna syns på ditt bankkonto.</p>
                        
                        <h3 className="font-semibold text-foreground">5. Utebliven ankomst</h3>
                        <p>Vid utebliven ankomst utan föregående avbokning utgår ingen återbetalning. Vi rekommenderar att ni hör av er i god tid om ni får förhinder.</p>
                        
                        <h3 className="font-semibold text-foreground">6. Åldersgräns och Ansvar</h3>
                        <p>Barn under 12 år måste ha sällskap av en vuxen. Den person som genomför bokningen ansvarar för att hela sällskapet följer våra regler och instruktioner.</p>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </Label>
              <p className="text-xs text-muted-foreground mt-1.5">
                Du måste godkänna våra boknings- och betalningsvillkor för att kunna slutföra bokningen.
              </p>
            </div>
          </div>

          {/* Complete Booking */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2">
            <Button
              onClick={handleBooking}
              size="lg"
              className="w-full booking-gradient text-white hover:opacity-90 booking-spring h-14 text-lg font-semibold"
            >
              {t('booking.completeBooking')} - {discountedTotal} SEK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};