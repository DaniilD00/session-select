import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, Users, Baby } from "lucide-react";

interface PersonSelectorProps {
  adults: number;
  children: number;
  onAdultsChange: (count: number) => void;
  onChildrenChange: (count: number) => void;
}

export const PersonSelector = ({
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
}: PersonSelectorProps) => {
  const totalPeople = adults + children;
  const maxPeople = 6;

  const canIncreaseAdults = adults < maxPeople && totalPeople < maxPeople && adults < 6;
  const canDecreaseAdults = adults > 0 && totalPeople > 1; // Need at least 1 person total (adult or child)
  const canIncreaseChildren = children < 5 && totalPeople < maxPeople;
  const canDecreaseChildren = children > 0 && totalPeople > 1; // Need at least 1 person total (adult or child)

  const tierIndex = totalPeople <= 2 ? 0 : totalPeople <= 4 ? 1 : 2;
  const adultRates = [350, 330, 300];
  const childRates = [300, 280, 250];
  const adultRate = adultRates[tierIndex];
  const childRate = childRates[tierIndex];
  const adultSubtotal = adults * adultRate;
  const childSubtotal = children * childRate;
  const baseTotal = adultSubtotal + childSubtotal;

  return (
    <Card className="booking-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Number of People
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Maximum 6 people total. At least 1 person required.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adults */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Adults</div>
              <div className="text-sm text-muted-foreground">18+ years</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdultsChange(adults - 1)}
              disabled={!canDecreaseAdults}
              className="h-8 w-8 p-0 booking-transition hover:bg-primary hover:text-primary-foreground"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <span className="w-8 text-center font-medium">{adults}</span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdultsChange(adults + 1)}
              disabled={!canIncreaseAdults}
              className="h-8 w-8 p-0 booking-transition hover:bg-primary hover:text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Children */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
              <Baby className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-medium">Children</div>
              <div className="text-sm text-muted-foreground">Under 18 years</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChildrenChange(children - 1)}
              disabled={!canDecreaseChildren}
              className="h-8 w-8 p-0 booking-transition hover:bg-accent hover:text-accent-foreground"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <span className="w-8 text-center font-medium">{children}</span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChildrenChange(children + 1)}
              disabled={!canIncreaseChildren}
              className="h-8 w-8 p-0 booking-transition hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {totalPeople >= maxPeople && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            You've reached the maximum of 6 people per session.
          </div>
        )}
      </CardContent>
    </Card>
  );
};