import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
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
import { BookingDetails, TimeSlot } from "./BookingModal";
import { PersonSelector } from "./PersonSelector";
import { TurnstileWidget, isCaptchaEnabled } from "./TurnstileWidget";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSiteLocation } from "@/contexts/LocationContext";
import { addMinutesToTime, formatSlotLabel } from "@/lib/duration";

interface BookingFormProps {
  bookingDetails: BookingDetails;
  timeSlots: TimeSlot[];
  adults: number;
  children: number;
  onAdultsChange: (count: number) => void;
  onChildrenChange: (count: number) => void;
  onBack: () => void;
  onClose: () => void;
}

const MAX_CONSECUTIVE_SLOTS = 4;

export const BookingForm = ({
  bookingDetails,
  timeSlots,
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
  onBack,
  onClose,
}: BookingFormProps) => {
  const { t, i18n } = useTranslation();
  const { config } = useSiteLocation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slotCount, setSlotCount] = useState(1);
  const { toast } = useToast();

  // Ronneby only: customers can book up to 4 consecutive 30-minute slots in
  // one checkout (e.g. a 1-hour session) for a 10% discount. Reset the
  // stepper whenever a new start time is picked.
  const supportsMultiSlot = config.id === "ronneby";

  useEffect(() => {
    setSlotCount(1);
  }, [bookingDetails.timeSlot, bookingDetails.date]);

  const maxConsecutiveSlots = useMemo(() => {
    if (!supportsMultiSlot || !bookingDetails.timeSlot || !timeSlots?.length) return 1;
    const startIdx = timeSlots.findIndex((s) => s.time === bookingDetails.timeSlot);
    if (startIdx === -1) return 1;
    let count = 1;
    let cur = timeSlots[startIdx].time;
    for (let i = startIdx + 1; i < timeSlots.length && count < MAX_CONSECUTIVE_SLOTS; i++) {
      const expected = addMinutesToTime(cur, config.sessionMinutes);
      if (timeSlots[i].time !== expected || !timeSlots[i].available) break;
      cur = timeSlots[i].time;
      count++;
    }
    return count;
  }, [supportsMultiSlot, bookingDetails.timeSlot, timeSlots, config.sessionMinutes]);

  const effectiveSlotCount = Math.min(slotCount, maxConsecutiveSlots);
  const isMultiSlot = supportsMultiSlot && effectiveSlotCount > 1;
  const MULTI_SLOT_DISCOUNT_PERCENT = 10;
  const multiSlotDiscountPercent = isMultiSlot ? MULTI_SLOT_DISCOUNT_PERCENT : 0;

  const totalGuests = adults + children;

  const tier = totalGuests <= 2 ? 0 : totalGuests <= 4 ? 1 : 2;
  const { adultRates, childRates } = config.pricing;

  const perSlotTotal = (adults * adultRates[tier]) + (children * childRates[tier]);
  const baseTotal = perSlotTotal * effectiveSlotCount;
  const combinedDiscountPercent = discountPercent + multiSlotDiscountPercent;
  const discountedTotal = combinedDiscountPercent > 0
    ? Math.round(baseTotal * (1 - combinedDiscountPercent / 100))
    : baseTotal;
  // Split the total discount amount between the two sources so the two
  // displayed lines always add up exactly to what's actually deducted.
  const totalDiscountAmount = baseTotal - discountedTotal;
  const multiSlotDiscountAmount = multiSlotDiscountPercent > 0
    ? Math.round((baseTotal * multiSlotDiscountPercent) / 100)
    : 0;
  const promoDiscountAmount = totalDiscountAmount - multiSlotDiscountAmount;

  const totalDurationMinutes = config.sessionMinutes * effectiveSlotCount;
  const timeRangeLabel = bookingDetails.timeSlot
    ? formatSlotLabel(bookingDetails.timeSlot, totalDurationMinutes, config.sessionMinutes)
    : "";

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

    if (isCaptchaEnabled && !captchaToken) {
      toast({
        title: t('booking.captchaRequired', 'Verifiering krävs'),
        description: t('booking.captchaRequiredDesc', 'Bekräfta att du inte är en robot innan du fortsätter.'),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Determine effective price after discount
      const effectiveTotal = discountedTotal;

      // Create booking data
      const bookingData = {
        location: config.id,
        bookingDate: format(bookingDetails.date!, "yyyy-MM-dd"),
        timeSlot: bookingDetails.timeSlot,
        slotCount: effectiveSlotCount,
        adults: bookingDetails.adults,
        children: bookingDetails.children,
        totalPrice: effectiveTotal,
        email,
        phone,
        paymentMethod: "card", // Default to card for Stripe Checkout initialization
        discountCode: discountCode,
        discountPercent: discountPercent,
        captchaToken: captchaToken,
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
      setSubmitting(false);
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
                <span>{timeRangeLabel} - {totalDurationMinutes} {t('booking.minutes')}</span>
              </div>

              {config.briefingIncluded && (
                <p className="-mt-2 pl-6 text-xs text-muted-foreground">
                  {t('booking.briefingIncluded')}
                </p>
              )}

              {supportsMultiSlot && (
                <div className="-mt-2 pl-6 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('booking.consecutiveSlots', 'Antal sammanhängande tider')}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => setSlotCount((c) => Math.max(1, c - 1))}
                        disabled={effectiveSlotCount <= 1}
                        aria-label={t('booking.decreaseSlots', 'Färre tider')}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center font-medium">{effectiveSlotCount}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => setSlotCount((c) => Math.min(maxConsecutiveSlots, c + 1))}
                        disabled={effectiveSlotCount >= maxConsecutiveSlots}
                        aria-label={t('booking.increaseSlots', 'Fler tider')}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {isMultiSlot ? (
                    <p className="text-xs text-primary font-medium">
                      {t('booking.multiSlotDiscountApplied', '10% rabatt tillämpad för flera tider')}
                    </p>
                  ) : maxConsecutiveSlots < MAX_CONSECUTIVE_SLOTS ? (
                    <p className="text-xs text-muted-foreground">
                      {t('booking.moreSlotsAvailable', { count: maxConsecutiveSlots, defaultValue: 'Upp till {{count}} sammanhängande tider lediga från denna starttid' })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('booking.multiSlotHint', 'Boka upp till 4 tider i rad och få 10% rabatt')}
                    </p>
                  )}
                </div>
              )}

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
                
                {adults > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('pricing.adults')} ({adults} × {adultRates[tier]} SEK)</span>
                    <span>{adults * adultRates[tier]} SEK</span>
                  </div>
                )}

                {children > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('pricing.under18')} ({children} × {childRates[tier]} SEK)</span>
                    <span>{children * childRates[tier]} SEK</span>
                  </div>
                )}

                {isMultiSlot && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t('booking.slotsMultiplier', { count: effectiveSlotCount, defaultValue: '× {{count}} tider' })}</span>
                    <span>× {effectiveSlotCount}</span>
                  </div>
                )}

                <div className={`flex justify-between ${combinedDiscountPercent > 0 ? "text-sm line-through text-muted-foreground" : "font-semibold text-lg"}`}>
                  <span>{t('booking.subtotal')}</span>
                  <span>{baseTotal} SEK</span>
                </div>
                {combinedDiscountPercent > 0 && (
                  <>
                    {isMultiSlot && (
                      <div className="flex justify-between text-sm text-primary">
                        <span>{t('booking.multiSlotDiscount', 'Flera tider-rabatt')} ({multiSlotDiscountPercent}%):</span>
                        <span>-{multiSlotDiscountAmount} SEK</span>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>{t('booking.discount')} ({discountPercent}%):</span>
                        <span>-{promoDiscountAmount} SEK</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t('booking.totalPrice')}</span>
                      <span className="text-primary">{discountedTotal} SEK</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('booking.vatRow')}</span>
                  <span>{(discountedTotal * 0.25 / 1.25).toFixed(2)} SEK</span>
                </div>
                <p className="text-xs text-muted-foreground text-right">{t('booking.inclVat')}</p>
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
                      disabled={promoLoading}
                      onClick={async () => {
                        const code = promoInput.trim();
                        if (!code) return;
                        setPromoLoading(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('validate-promo', {
                            body: { code },
                          });
                          if (error) throw error;
                          if (data?.valid) {
                            setDiscountPercent(data.percent);
                            setDiscountCode(code.toUpperCase());
                            toast({ title: `${t('booking.promoApplied')}: ${data.percent}%` });
                          } else if (data?.reason === 'expired') {
                            toast({ title: t('booking.codeExpired'), variant: 'destructive' });
                            setDiscountPercent(0);
                            setDiscountCode(null);
                          } else {
                            toast({ title: t('booking.invalidCode'), variant: 'destructive' });
                            setDiscountPercent(0);
                            setDiscountCode(null);
                          }
                        } catch {
                          toast({ title: t('booking.invalidCode'), variant: 'destructive' });
                          setDiscountPercent(0);
                          setDiscountCode(null);
                        } finally {
                          setPromoLoading(false);
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
                        <p>Vi förstår att planer kan ändras. Du kan boka om din tid kostnadsfritt genom att kontakta oss via telefon (<a href="tel:+46766147730" className="text-primary hover:underline font-medium">+46 76-614 77 30</a>) eller e-post (<a href="mailto:info@readypixelgo.se" className="text-primary hover:underline font-medium">info@readypixelgo.se</a>) senast 48 timmar innan din bokad tid startar. Vid ombokning senare än 48 timmar innan start kan vi tyvärr inte garantera att en kostnadsfri ändring är möjlig.</p>
                        
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

          {/* Anti-bot verification (only rendered when Turnstile is configured) */}
          <TurnstileWidget onToken={setCaptchaToken} />

          {/* Complete Booking */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2">
            <Button
              onClick={handleBooking}
              disabled={submitting}
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