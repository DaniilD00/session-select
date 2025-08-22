import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, CreditCard } from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import heroImage from "@/assets/hero-booking.jpg";

const Index = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Premium event space"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 booking-gradient opacity-80" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Book Your Perfect
            <span className="block bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Event Experience
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Premium event spaces with flexible booking, professional service, and unforgettable experiences for groups of 1-6 people.
          </p>
          
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            size="lg"
            className="bg-white text-primary hover:bg-blue-50 text-xl px-12 py-6 h-auto booking-button-shadow booking-spring font-semibold"
          >
            <Calendar className="mr-3 h-6 w-6" />
            Book a Session
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Why Choose Our Event Space?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional, flexible, and designed for memorable experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="booking-card rounded-2xl p-8 booking-transition hover:scale-105">
              <div className="w-16 h-16 booking-gradient rounded-full flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Flexible Timing</h3>
              <p className="text-muted-foreground leading-relaxed">
                45-minute sessions from 10:00 to 20:00. Choose the perfect time that works for your schedule.
              </p>
            </div>

            <div className="booking-card rounded-2xl p-8 booking-transition hover:scale-105">
              <div className="w-16 h-16 booking-gradient rounded-full flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Group Packages</h3>
              <p className="text-muted-foreground leading-relaxed">
                Accommodate 1-6 people with special pricing for larger groups. Perfect for teams and families.
              </p>
            </div>

            <div className="booking-card rounded-2xl p-8 booking-transition hover:scale-105">
              <div className="w-16 h-16 booking-gradient rounded-full flex items-center justify-center mb-6">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Easy Payment</h3>
              <p className="text-muted-foreground leading-relaxed">
                Multiple payment options including cards, Swish, and Klarna. Secure and convenient booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground mb-16">
            Fair pricing that scales with your group size
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="booking-card rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-2">1-2 People</h3>
              <div className="text-3xl font-bold text-primary mb-4">300 SEK</div>
              <p className="text-muted-foreground">per person</p>
            </div>

            <div className="booking-card rounded-2xl p-8 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Popular
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">3-4 People</h3>
              <div className="text-3xl font-bold text-primary mb-4">280 SEK</div>
              <p className="text-muted-foreground">per person</p>
            </div>

            <div className="booking-card rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-2">5-6 People</h3>
              <div className="text-3xl font-bold text-primary mb-4">250 SEK</div>
              <p className="text-muted-foreground">per person</p>
            </div>
          </div>

          <p className="text-muted-foreground mt-8">
            *Children under 18: Same pricing structure applies
          </p>
        </div>
      </section>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  );
};

export default Index;