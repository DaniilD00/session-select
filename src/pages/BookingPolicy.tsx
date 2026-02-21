import { PixelBackground } from "@/components/PixelBackground";

const BookingPolicy = () => {
  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6 relative overflow-hidden">
      <PixelBackground />
      <div className="max-w-3xl mx-auto relative z-10 bg-black p-8 rounded-xl border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-blue-400">Bokning & Betalningspolicy</h1>
        
        <div className="space-y-6 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Genomförande av bokning</h2>
            <p>
              För att en bokning ska vara giltig och fullständigt genomförd krävs en godkänd betalning. När du reserverar en tid hålls den preliminärt i 5 minuter. Om betalningen inte slutförs inom denna tidsram kommer tiden automatiskt att släppas och bli tillgänglig för andra kunder.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Betalningsmetoder</h2>
            <p>
              Vi accepterar betalningar via vår säkra betalningspartner Stripe. Du kan betala med de vanligaste betal- och kreditkorten. Alla priser anges i Svenska Kronor (SEK) och inkluderar moms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Ombokning</h2>
            <p>
              Vi förstår att planer kan ändras. Du kan boka om din tid kostnadsfritt genom att kontakta oss via telefon (<a href="tel:+46766147730" className="text-blue-400 hover:underline font-medium">+46 76-614 77 30</a>) eller e-post (<a href="mailto:info@readypixelgo.se" className="text-blue-400 hover:underline font-medium">info@readypixelgo.se</a>) <strong>senast 48 timmar</strong> innan din bokade tid startar. Vid ombokning senare än 48 timmar innan start kan vi tyvärr inte garantera att en kostnadsfri ändring är möjlig.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Avbokning och Återbetalning</h2>
            <p>
              Om du önskar avboka din tid och få en återbetalning kan detta göras genom att kontakta oss. Vid en godkänd återbetalning tillkommer en <strong>återbetalningsavgift på 149 kr</strong> för att täcka administrativa kostnader och transaktionsavgifter. Denna avgift dras automatiskt av från det belopp som återbetalas till dig.
            </p>
            <p className="mt-2">
              Vänligen notera att det kan ta <strong>upp till 14 dagar</strong> innan återbetalningen är helt genomförd och pengarna syns på ditt bankkonto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Utebliven ankomst</h2>
            <p>
              Vid utebliven ankomst utan föregående avbokning utgår ingen återbetalning. Vi rekommenderar att ni hör av er i god tid om ni får förhinder.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Kontakt för ändringar</h2>
            <p>
              För alla ärenden gällande ombokning, avbokning eller frågor om din betalning, vänligen kontakta oss på:
              <br />
              Telefon: <a href="tel:+46766147730" className="text-blue-400 hover:underline font-medium">+46 76-614 77 30</a>
              <br />
              E-post: <a href="mailto:info@readypixelgo.se" className="text-blue-400 hover:underline font-medium">info@readypixelgo.se</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BookingPolicy;
