import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, Users, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (error) {
          throw error;
        }

        if (data.booking) {
          setBooking(data.booking);
          
          if (data.paymentStatus === 'paid') {
            toast({
              title: t("success.toastTitle"),
              description: t("success.toastDescription"),
            });
          }
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: t("success.toastFailTitle"),
          description: t("success.toastFailDescription"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>{t("success.verifying")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionId || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">{t("success.noBooking")}</p>
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("success.backHome")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Header */}
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-800 mb-2">
                {t("success.title")}
              </h1>
              <p className="text-green-700">
                {t("success.subtitle")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t("success.details")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("success.date")}</p>
                <p className="font-semibold">{booking.booking_date}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("success.time")}</p>
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {booking.time_slot}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("success.guests")}</p>
                <p className="font-semibold flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {booking.adults} {t("booking.adults")}
                  {booking.children > 0 && ` + ${booking.children} ${t("booking.children")}`}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("success.totalPrice")}</p>
                <p className="font-semibold text-lg text-primary">
                  {booking.total_price} SEK
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("success.contactInfo")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p>{t("success.email")} {booking.email}</p>
                  <p>{t("success.phone")} {booking.phone}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("success.paymentDetails")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p>{t("success.method")} {booking.payment_method}</p>
                  <p className="text-green-600 font-semibold">{t("success.status")} ✅ {t("success.paid")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">{t("success.whatsNext")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-blue-700">
              <p>{t("success.step1")}</p>
              <p>{t("success.step2")}</p>
              <p>{t("success.step3")}</p>
              <p>{t("success.step4")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="text-center space-y-4">
          <Button asChild size="lg">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("success.backHome")}
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("success.bookingId")} {booking.id}
          </p>
        </div>
      </div>
    </div>
  );
}