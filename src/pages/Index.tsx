import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, CreditCard, MapPin, Navigation, Mail } from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import { PixelBackground } from "@/components/PixelBackground";
import { ImageGallery } from "@/components/ImageGallery";
import { CompanyInfo } from "@/components/CompanyInfo";
import { FAQSection } from "@/components/FAQSection";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import heroImage from "@/assets/hero-booking.jpg";

const Index = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Check for search param from navigation
    if (searchParams.get("action") === "book") {
      setIsBookingModalOpen(true);
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      setSearchParams(newParams, { replace: true });
    }

    // Check for custom event from Navbar on same page
    const handleOpenModal = () => setIsBookingModalOpen(true);
    window.addEventListener("open-booking-modal", handleOpenModal);

    return () => {
      window.removeEventListener("open-booking-modal", handleOpenModal);
    };
  }, [searchParams, setSearchParams]);

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
              className="booking-gradient text-white hover:opacity-90 booking-spring text-xl px-12 py-6 h-auto font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
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

      <ImageGallery />
      
      <CompanyInfo />

      <FAQSection />

      {/* Features Section */}
      <section className="py-24 bg-muted/10 relative">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="booking-card rounded-2xl p-8 booking-transition hover:scale-105">
              <div className="w-16 h-16 booking-gradient rounded-full flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t('features.timing.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('features.timing.description')}
              </p>
            </div>

            <div className="booking-card rounded-2xl p-8 booking-transition hover:scale-105">
              <div className="w-16 h-16 booking-gradient rounded-full flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t('features.groups.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('features.groups.description')}
              </p>
            </div>

            <div className="booking-card rounded-2xl p-8 booking-transition hover:scale-105">
              <div className="w-16 h-16 booking-gradient rounded-full flex items-center justify-center mb-6">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t('features.payment.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('features.payment.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 opacity-30" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-16">
            {t('pricing.subtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="booking-card rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-2">1-2 {t('pricing.guests')}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('pricing.adults')}</p>
                  <p className="text-3xl font-bold text-primary flex items-baseline justify-center gap-1">
                    350 SEK <span className="text-lg font-normal text-muted-foreground">/p</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('pricing.under18')}</p>
                  <p className="text-3xl font-bold text-primary flex items-baseline justify-center gap-1">
                    300 SEK <span className="text-lg font-normal text-muted-foreground">/p</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="booking-card rounded-2xl p-8 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  {t('pricing.popular')}
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">3-4 {t('pricing.guests')}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('pricing.adults')}</p>
                  <p className="text-3xl font-bold text-primary flex items-baseline justify-center gap-1">
                    330 SEK <span className="text-lg font-normal text-muted-foreground">/p</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('pricing.under18')}</p>
                  <p className="text-3xl font-bold text-primary flex items-baseline justify-center gap-1">
                    280 SEK <span className="text-lg font-normal text-muted-foreground">/p</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="booking-card rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-2">5-6 {t('pricing.guests')}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('pricing.adults')}</p>
                  <p className="text-3xl font-bold text-primary flex items-baseline justify-center gap-1">
                    300 SEK <span className="text-lg font-normal text-muted-foreground">/p</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('pricing.under18')}</p>
                  <p className="text-3xl font-bold text-primary flex items-baseline justify-center gap-1">
                    250 SEK <span className="text-lg font-normal text-muted-foreground">/p</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mt-8">
            {t('pricing.note')}
          </p>
        </div>
      </section>

      {/* Social Media Section */}
      <section className="py-24 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              {t('social.title')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('social.subtitle')}
            </p>
          </div>

          {/* Instagram Feed */}
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Video 1 - Excite */}
              <div className="aspect-square booking-card overflow-hidden rounded-2xl booking-transition hover:shadow-xl">
                <video
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  <source src="/social/excite.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Image - RPG Post */}
              <a
                href="https://instagram.com/readypixelgo_swe"
                target="_blank"
                rel="noreferrer"
                className="aspect-square booking-card overflow-hidden rounded-2xl booking-transition hover:scale-105 hover:shadow-xl block"
              >
                <img
                  src="/social/RPG_inlagg.png"
                  alt="Ready Pixel Go"
                  className="w-full h-full object-cover"
                />
              </a>

              {/* Video 2 - Run */}
              <div className="aspect-square booking-card overflow-hidden rounded-2xl booking-transition hover:shadow-xl">
                <video
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  <source src="/social/run.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button asChild size="lg" className="booking-gradient text-white">
                <a
                  href="https://instagram.com/readypixelgo_swe"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('social.followUs')}
                </a>
              </Button>
            </div>
          </div>

          {/* Social Media Icons */}
          <div className="flex justify-center items-center gap-6">
            <a
              href="https://instagram.com/readypixelgo_swe"
              target="_blank"
              rel="noreferrer"
              className="booking-transition hover:scale-110"
            >
              <img
                src="/social/instagram-rounded-small.png"
                alt="Instagram"
                className="w-16 h-16 rounded-xl shadow-lg"
              />
            </a>
            <a
              href="https://facebook.com/readypixelgo"
              target="_blank"
              rel="noreferrer"
              className="booking-transition hover:scale-110"
            >
              <img
                src="/social/facebook-rounded-small.png"
                alt="Facebook"
                className="w-16 h-16 rounded-xl shadow-lg"
              />
            </a>
            <a
              href="https://www.tiktok.com/@readypixelgo"
              target="_blank"
              rel="noreferrer"
              className="booking-transition hover:scale-110"
            >
              <img
                src="/social/tiktok-rounded-small.png"
                alt="TikTok"
                className="w-16 h-16 rounded-xl shadow-lg"
              />
            </a>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6 grid gap-12 lg:grid-cols-[420px,1fr]">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              {t('location.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('location.description')}
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t('location.address')}</p>
                  <p className="text-muted-foreground">{t('location.addressValue')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <Navigation className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t('location.directions')}</p>
                  <p className="text-muted-foreground">
                    {t('location.directionsValue')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t('location.email')}</p>
                  <a href="mailto:info@readypixelgo.se" className="text-muted-foreground hover:text-primary transition-colors">
                    info@readypixelgo.se
                  </a>
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
                  {t('location.googleMaps')}
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href="https://maps.apple.com/?address=Sundbybergsv%C3%A4gen%201,171%2073,Solna,Sweden"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('location.appleMaps')}
                </a>
              </Button>
            </div>
          </div>
          <div className="booking-card rounded-2xl overflow-hidden shadow-xl h-full min-h-[360px]">
            <iframe
              title="Map showing Sundbybergsvägen 1F"
              src="https://maps.google.com/maps?q=Sundbybergsv%C3%A4gen%201f%20Solna&t=&z=15&ie=UTF8&iwloc=&output=embed"
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