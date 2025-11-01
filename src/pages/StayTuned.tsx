import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

export default function StayTuned() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const CODE = (import.meta as any)?.env?.VITE_LAUNCH_CODE || "READYPIXELLAUNCH25";
  const EXPIRY = new Date((import.meta as any)?.env?.VITE_LAUNCH_CODE_EXPIRY || "2026-01-22");
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-4">
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
                    <Label htmlFor="dob">{t('waitlist.dob')}</Label>
                    <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  {t('waitlist.consent')}
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
  );
}
