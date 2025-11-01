import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, CreditCard, MapPin, Navigation } from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import { PixelBackground } from "@/components/PixelBackground";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import heroImage from "@/assets/hero-booking.jpg";

const Index = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <PixelBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {t('hero.title')}
            <span className="block bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              size="lg"
              className="bg-white text-primary hover:bg-blue-50 text-xl px-12 py-6 h-auto booking-button-shadow booking-spring font-semibold"
            >
              <Calendar className="mr-3 h-6 w-6" />
              {t('hero.bookButton')}
            </Button>
            <Button asChild variant="secondary" size="lg" className="h-auto text-xl px-8 py-6">
              <Link to="/launch">{t('hero.discountButton')}</Link>
            </Button>
          </div>
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
            Tiered rates for adults and guests under 18 depending on group size
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="booking-card rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-2">1-2 Guests</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Adults</p>
                  <p className="text-3xl font-bold text-primary">350 SEK</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Under 18</p>
                  <p className="text-3xl font-bold text-primary">300 SEK</p>
                </div>
              </div>
            </div>

            <div className="booking-card rounded-2xl p-8 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Popular
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">3-4 Guests</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Adults</p>
                  <p className="text-3xl font-bold text-primary">330 SEK</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Under 18</p>
                  <p className="text-3xl font-bold text-primary">280 SEK</p>
                </div>
              </div>
            </div>

            <div className="booking-card rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-2">5-6 Guests</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Adults</p>
                  <p className="text-3xl font-bold text-primary">300 SEK</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Under 18</p>
                  <p className="text-3xl font-bold text-primary">250 SEK</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mt-8">
            *Pricing applied automatically at checkout based on the number of adults and guests under 18.
          </p>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 grid gap-12 lg:grid-cols-[420px,1fr]">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              Where We Are
            </h2>
            <p className="text-lg text-muted-foreground">
              We are right next to Solna centrum with quick access to the metro, buses, and parking garages.
              Drop by a few minutes before your session to settle in or grab a coffee nearby.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Street address</p>
                  <p className="text-muted-foreground">Sundbybergsvägen 1, 171 73 Solna</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <Navigation className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Getting here</p>
                  <p className="text-muted-foreground">
                    2 minutes from the Solna centrum subway (blue line) and several bus lines. Parking is available in the nearby garages.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a
                  href="https://maps.google.com/?q=Sundbybergsv%C3%A4gen+1+Solna"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href="https://maps.apple.com/?address=Sundbybergsv%C3%A4gen%201,171%2073,Solna,Sweden"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Apple Maps
                </a>
              </Button>
            </div>
          </div>
          <div className="booking-card rounded-2xl overflow-hidden shadow-xl h-full min-h-[360px]">
            <iframe
              title="Map showing Sundbybergsvägen 1"
              src="https://maps.google.com/maps?q=Sundbybergsv%C3%A4gen%201%20Solna&t=&z=15&ie=UTF8&iwloc=&output=embed"
              allowFullScreen
              loading="lazy"
              className="h-full w-full border-0"
            />
          </div>
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