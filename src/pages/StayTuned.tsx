import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";

export default function StayTuned() {
  const { toast } = useToast();
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
      toast({ title: "Please fill all fields and accept consent", variant: "destructive" });
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
        toast({ title: "You're on the list!", description: `We emailed you the code ${CODE}.` });
      } else {
        toast({ title: "You're on the list!", description: `We reached the first ${100} signups—no code issued, but you'll get launch updates.` });
      }
    } catch (e) {
      console.warn('send-waitlist-email failed', e);
      setSubmitted(true);
      toast({ title: "You're on the list!", description: `If email fails, your code is: ${CODE}` });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Card className="booking-card">
          <CardHeader>
            <CardTitle className="text-2xl">Stay Tuned</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Join our launch list and get a {PCT}% discount on your first booking.
            </p>
            {!submitted ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="first">First name</Label>
                    <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="last">Last name</Label>
                    <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  I agree to receive emails about Readypixel launches and offers.
                </label>
                <div className="flex gap-2">
                  <Button onClick={onSubmit}>Notify me</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold">Your discount code:</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={CODE} className="font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(String(CODE))}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Valid until {EXPIRY.toLocaleDateString()} ({PCT}% off total price)</p>
                <Button asChild className="mt-2">
                  <Link to="/">Book now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
