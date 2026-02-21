import { PixelBackground } from "@/components/PixelBackground";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6 relative overflow-hidden">
      <PixelBackground />
      <div className="max-w-3xl mx-auto relative z-10 bg-black p-8 rounded-xl border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-blue-400">Användarvillkor</h1>
        
        <div className="space-y-6 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Allmänt</h2>
            <p>
              Dessa användarvillkor gäller för alla besökare och kunder hos Ready Pixel Go. Genom att boka och delta i våra aktiviteter godkänner du dessa villkor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Åldersgräns och Ansvar</h2>
            <p>
              Barn under 12 år måste ha sällskap av en vuxen. Den person som genomför bokningen ansvarar för att hela sällskapet följer våra regler och instruktioner.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Ankomsttid</h2>
            <p>
              Vi rekommenderar att ni anländer 10-15 minuter innan er bokade tid för genomgång av regler och instruktioner. Vid sen ankomst kan vi inte garantera att ni får spela hela er bokade tid, då detta skulle påverka efterföljande grupper.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Utrustning och Skadegörelse</h2>
            <p>
              Vår utrustning och våra lokaler är designade för att vara säkra och hållbara. Deltagare förväntas hantera utrustningen med försiktighet och följa personalens anvisningar. Vid uppsåtlig skadegörelse eller grov oaktsamhet kan kunden bli ersättningsskyldig för reparation eller utbyte av utrustning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Säkerhet och Uppförande</h2>
            <p>
              För allas säkerhet och trivsel förbehåller vi oss rätten att neka inträde eller avbryta spelet för personer som uppträder störande, aggressivt eller är märkbart påverkade av alkohol eller droger. I sådana fall utgår ingen återbetalning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Ansvarsbegränsning</h2>
            <p>
              Deltagande i våra aktiviteter sker på egen risk. Ready Pixel Go ansvarar inte för personskador eller förlorade/skadade personliga tillhörigheter under besöket, såvida det inte beror på grov vårdslöshet från vår sida.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Ändringar av villkor</h2>
            <p>
              Vi förbehåller oss rätten att när som helst uppdatera dessa användarvillkor. De villkor som var publicerade vid tidpunkten för din bokning är de som gäller för ditt besök.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
