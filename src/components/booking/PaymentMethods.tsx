import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Building } from "lucide-react";

interface PaymentMethodsProps {
  selectedPayment: string;
  onPaymentSelect: (method: string) => void;
}

export const PaymentMethods = ({ selectedPayment, onPaymentSelect }: PaymentMethodsProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [swishNumber, setSwishNumber] = useState("");

  const paymentMethods = [
    {
      id: "card",
      label: "Debit/Credit Card",
      icon: CreditCard,
      description: "Visa, Mastercard",
    },
    {
      id: "swish",
      label: "Swish",
      icon: Smartphone,
      description: "Swedish mobile payment",
    },
    {
      id: "klarna",
      label: "Klarna",
      icon: Building,
      description: "Pay later or in installments",
    },
  ];

  return (
    <Card className="booking-card">
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose your preferred payment option
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Method Selection */}
        <div className="grid sm:grid-cols-3 gap-3">
          {paymentMethods.map((method) => (
            <Button
              key={method.id}
              variant={selectedPayment === method.id ? "default" : "outline"}
              onClick={() => onPaymentSelect(method.id)}
              className={`h-auto p-4 flex-col gap-2 booking-transition ${
                selectedPayment === method.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-primary/10"
              }`}
            >
              <method.icon className="h-6 w-6" />
              <div className="text-sm font-medium">{method.label}</div>
              <div className="text-xs opacity-70">{method.description}</div>
            </Button>
          ))}
        </div>

        {/* Payment Details Forms */}
        {selectedPayment === "card" && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
          </div>
        )}

        {selectedPayment === "swish" && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="swishNumber">Phone Number</Label>
              <Input
                id="swishNumber"
                value={swishNumber}
                onChange={(e) => setSwishNumber(e.target.value)}
                placeholder="+46 70 123 45 67"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You'll receive a Swish notification to complete the payment.
            </p>
          </div>
        )}

        {selectedPayment === "klarna" && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Klarna to complete your payment. Choose to pay now, 
              pay later, or split into installments.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};