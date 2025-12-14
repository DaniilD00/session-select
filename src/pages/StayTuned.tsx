import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PixelBlast from "@/components/PixelBlast";

export default function StayTuned() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const dob = dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : "";
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { month: "long" }),
    [i18n.language]
  );
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, idx) => {
      const value = String(idx + 1).padStart(2, "0");
      return { value, label: String(idx + 1) };
    }),
    []
  );
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) => {
        const value = String(idx + 1).padStart(2, "0");
        return { value, label: monthFormatter.format(new Date(2000, idx, 1)) };
      }),
    [monthFormatter]
  );
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = current - 80;
    return Array.from({ length: current - start + 1 }, (_, idx) => {
      const value = String(current - idx);
      return { value, label: value };
    });
  }, []);

  const CODE = (import.meta as any)?.env?.VITE_LAUNCH_CODE || "READYPIXELLAUNCH25";
  const EXPIRY = new Date((import.meta as any)?.env?.VITE_LAUNCH_CODE_EXPIRY || "2026-03-22");
  const PCT = Number((import.meta as any)?.env?.VITE_LAUNCH_DISCOUNT_PERCENT || 10);

  const validNow = new Date() <= EXPIRY;

  const onSubmit = async () => {
    const trimmed = email.trim();
    const validEmail = /.+@.+\..+/.test(trimmed);
    if (!validEmail) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (!first || !last || !dob || !consent) {
      toast({ title: t('waitlist.fillAllFields'), variant: "destructive" });
      return;
    }
    // Ensure a row exists even if the Edge Function isn't deployed yet (fallback)
    try {
      await supabase
        .from('waitlist')
        .upsert({
          email: trimmed,
          first_name: first,
          last_name: last,
          dob,
          consent,
        });
    } catch (e) {
      console.warn('waitlist upsert (client) failed', e);
    }

    // Try to assign code + send email via Edge Function (authoritative path)
    try {
      const { data, error } = await supabase.functions.invoke('send-waitlist-email', {
        body: {
          email: trimmed,
          first_name: first,
          last_name: last,
          dob,
          consent,
          code: CODE,
          percent: PCT,
          expiryISO: EXPIRY.toISOString(),
        },
      });
      if (error) throw error;
      setSubmitted(true);
      if (data?.codeSent) {
        toast({ title: t('waitlist.onTheList'), description: t('waitlist.emailSent', { code: CODE }) });
      } else {
        toast({ title: t('waitlist.onTheList'), description: t('waitlist.capacityReached', { limit: 100 }) });
      }
    } catch (e) {
      console.warn('send-waitlist-email failed', e);
      setSubmitted(true);
      toast({ title: t('waitlist.onTheList'), description: `If email fails, your code is: ${CODE}` });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816]">
      <div className="absolute inset-0">
        <PixelBlast
          className="w-full h-full"
          variant="circle"
          pixelSize={6}
          color="#B19EEF"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples={false}
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050816]/40 via-[#050816]/70 to-[#050816]" />
      <div className="relative z-10 py-12 px-4">
        <div className="max-w-xl mx-auto">
        <Card className="booking-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t('waitlist.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('waitlist.description', { percent: PCT })}
            </p>
            {!submitted ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="first">{t('waitlist.firstName')}</Label>
                    <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="last">{t('waitlist.lastName')}</Label>
                    <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="email">{t('waitlist.email')}</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('waitlist.dob')}</Label>
                    <div className="grid grid-cols-[1fr_1.6fr_1fr] gap-2">
                      <Select value={dobDay} onValueChange={setDobDay}>
                        <SelectTrigger aria-label={t('waitlist.dobDay')}>
                          <SelectValue placeholder={t('waitlist.dobDay')} />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={dobMonth} onValueChange={setDobMonth}>
                        <SelectTrigger aria-label={t('waitlist.dobMonth')}>
                          <SelectValue placeholder={t('waitlist.dobMonth')} />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={dobYear} onValueChange={setDobYear}>
                        <SelectTrigger aria-label={t('waitlist.dobYear')}>
                          <SelectValue placeholder={t('waitlist.dobYear')} />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                              {year.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span className="flex items-center gap-1">
                    {t('waitlist.consent')}
                    <span className="text-red-500" aria-hidden="true">*</span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button onClick={onSubmit}>{t('waitlist.notifyMe')}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold">{t('waitlist.discountCode')}</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={CODE} className="font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(String(CODE))}
                  >
                    {t('waitlist.copy')}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{t('waitlist.validUntil', { date: EXPIRY.toLocaleDateString(), percent: PCT })}</p>
                <Button asChild className="mt-2">
                  <Link to="/">{t('waitlist.bookNow')}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
