import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConfirmationEmailManagerProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAlreadySent?: boolean;
}

export function ConfirmationEmailManager({
  bookingId,
  isOpen,
  onClose,
  onSuccess,
  isAlreadySent,
}: ConfirmationEmailManagerProps) {
  const { toast } = useToast();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  const [customPriceText, setCustomPriceText] = useState("");
  const [statusColor, setStatusColor] = useState<"orange" | "green" | "gray">("gray");
  
  // Custom numeric overrides
  const [customTotalPrice, setCustomTotalPrice] = useState("");
  const [customTotalPeople, setCustomTotalPeople] = useState("");
  const [customAdults, setCustomAdults] = useState("");
  const [customChildren, setCustomChildren] = useState("");

  const fetchPreview = useCallback(async () => {
    if (!bookingId) return;
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-booking-confirmation", {
        body: {
          bookingId,
          preview: true,
          customPriceText,
          statusColor,
          customTotalPrice,
          customTotalPeople,
          customAdults,
          customChildren,
        },
      });

      console.log("Preview response data:", data, error);

      if (error) throw error;
      if (data?.html) {
        setHtmlPreview(data.html);
      } else {
        console.warn("No HTML in response", data);
      }
    } catch (err) {
      console.error("Error fetching preview:", err);
      toast({
        title: "Kunde inte ladda förhandsgranskning",
        description: "Ett fel uppstod när mallen skulle hämtas.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  }, [bookingId, customPriceText, statusColor, customTotalPrice, customTotalPeople, customAdults, customChildren, toast]);

  useEffect(() => {
    if (isOpen) {
      // Debounce the preview refetch slightly to avoid spamming edge function on typing
      const timeoutId = setTimeout(() => {
        fetchPreview();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, fetchPreview]);

  const handleSendEmail = async () => {
    if (isAlreadySent) return;
    
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-booking-confirmation", {
        body: {
          bookingId,
          preview: false,
          customPriceText,
          statusColor,
          customTotalPrice,
          customTotalPeople,
          customAdults,
          customChildren,
        },
      });

      if (error) throw error;

      toast({
        title: "E-post skickat!",
        description: "Bokningsbekräftelsen har skickats till kunden.",
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error sending email:", err);
      toast({
        title: "Kunde inte skicka",
        description: "Ett fel uppstod när e-postmeddelandet skulle skickas.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex-none bg-background">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Skicka Bokningsbekräftelse
          </DialogTitle>
          <DialogDescription>
            Anpassa text och färg för betalningsstatus och granska e-postmeddelandet för mobil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-y-auto w-full md:overflow-hidden flex-col md:flex-row h-full">
          {/* Controls Side */}
          <div className="w-full md:w-80 md:min-w-[320px] border-b md:border-b-0 md:border-r bg-muted/30 p-6 flex flex-col gap-6 shrink-0 md:overflow-y-auto h-auto md:h-full">
            
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Belopp & Status</h3>
              <div className="space-y-3">
                <Label htmlFor="custom-total-price">Totalbelopp (valfritt)</Label>
                <Input
                  id="custom-total-price"
                  type="number"
                  placeholder="T.ex. 1548"
                  value={customTotalPrice}
                  onChange={(e) => setCustomTotalPrice(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="custom-text">Betalningstext (valfritt)</Label>
                <Input
                  id="custom-text"
                  placeholder="T.ex. 1299 kr Betald, 249 kr betalas på plats"
                  value={customPriceText}
                  onChange={(e) => setCustomPriceText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Om tom används standardstatus (t.ex. swish).
                </p>
              </div>

              <div className="space-y-3">
                <Label>Färg för status</Label>
                <div className="flex gap-2">
                  {[
                    { value: "orange", color: "#fbbf24", label: "Orange" },
                    { value: "green", color: "#22c55e", label: "Grön" },
                    { value: "gray", color: "#94a3b8", label: "Grå" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusColor(option.value as "orange" | "green" | "gray")}
                      className={`flex flex-1 items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm transition-all
                        ${statusColor === option.value 
                          ? 'border-primary ring-1 ring-primary/50 bg-primary/5' 
                          : 'border-input hover:bg-muted bg-background/50'
                        }`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      ></span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Gäster (valfritt)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="custom-total-people">Totalt antal gäster</Label>
                  <Input
                    id="custom-total-people"
                    type="number"
                    placeholder="T.ex. 7"
                    value={customTotalPeople}
                    onChange={(e) => setCustomTotalPeople(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="custom-adults">Vuxna</Label>
                  <Input
                    id="custom-adults"
                    type="number"
                    placeholder="T.ex. 5"
                    value={customAdults}
                    onChange={(e) => setCustomAdults(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="custom-children">Barn</Label>
                  <Input
                    id="custom-children"
                    type="number"
                    placeholder="T.ex. 2"
                    value={customChildren}
                    onChange={(e) => setCustomChildren(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lämna tomt för att använda de ursprungliga bokningsvärdena.
              </p>
            </div>

            <div className="mt-auto pt-6">
              <Button
                className="w-full"
                onClick={handleSendEmail}
                disabled={loadingPreview || sending || isAlreadySent}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isAlreadySent ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {isAlreadySent ? "Redan Skickat" : "Skicka Bekräftelse"}
              </Button>
              {isAlreadySent && (
                <p className="text-xs text-center mt-2 text-muted-foreground">
                  Bekräftelse har redan skickats.
                </p>
              )}
            </div>
          </div>

            {/* Preview Side */}
          <div className="flex-1 bg-zinc-950 p-4 sm:p-8 flex justify-center items-start md:items-center overflow-y-auto w-full min-h-[600px] md:min-h-0">
            <div className="relative w-[402px] max-w-full h-[874px] shadow-2xl bg-[#050816] flex flex-col shrink-0 rounded-[3rem] border-[12px] border-zinc-900 overflow-hidden my-auto ring-4 ring-zinc-800">
              
              {loadingPreview && !htmlPreview ? (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-[#050816]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : htmlPreview ? (
                <div 
                  className="w-full h-full pt-6 bg-[#050816] overflow-y-auto overflow-x-hidden" 
                  dangerouslySetInnerHTML={{ __html: htmlPreview }} 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-red-400 bg-[#050816] p-4 text-center">
                  Preview not available
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
