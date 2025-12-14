import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [alreadyRemoved, setAlreadyRemoved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("unsubscribe-waitlist", {
        body: { token },
      });
      if (error || !data?.ok) {
        throw error || new Error("Failed to unsubscribe");
      }
      setAlreadyRemoved(!data.removed);
      setStatus("success");
    } catch (err) {
      console.warn("unsubscribe failed", err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="booking-card">
          <CardHeader>
            <CardTitle>{t("unsubscribe.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!token ? (
              <p className="text-muted-foreground">{t("unsubscribe.missingToken")}</p>
            ) : status === "success" ? (
              <div className="space-y-2">
                <p className="font-semibold">{t("unsubscribe.successTitle")}</p>
                <p className="text-muted-foreground">{t("unsubscribe.successDescription")}</p>
                {alreadyRemoved && (
                  <p className="text-xs text-muted-foreground">{t("unsubscribe.alreadyRemoved")}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-muted-foreground">{t("unsubscribe.description")}</p>
                {status === "error" && (
                  <p className="text-sm text-destructive">{t("unsubscribe.errorDescription")}</p>
                )}
                <Button onClick={handleUnsubscribe} disabled={loading} className="w-full">
                  {loading ? t("unsubscribe.processing") : t("unsubscribe.button")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Unsubscribe;
