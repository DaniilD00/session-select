import { PixelBackground } from "@/components/PixelBackground";
import { openConsentSettings } from "@/lib/consent";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6 relative overflow-hidden">
      <PixelBackground />
      <div className="max-w-3xl mx-auto relative z-10 bg-black p-8 rounded-xl border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-blue-400">Integritetspolicy</h1>
        
        <div className="space-y-6 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Inledning</h2>
            <p>
              Välkommen till Ready Pixel Go. Vi värnar om din personliga integritet och strävar efter att alltid skydda dina personuppgifter på bästa sätt. Denna integritetspolicy förklarar hur vi samlar in och använder din personliga information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Vilka uppgifter vi samlar in</h2>
            <p>
              När du gör en bokning hos oss samlar vi in följande information:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Namn</li>
              <li>E-postadress</li>
              <li>Telefonnummer</li>
              <li>Bokningsdetaljer (datum, tid, antal personer)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Hur vi använder dina uppgifter</h2>
            <p>
              Vi använder dina uppgifter för att:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Hantera och bekräfta din bokning</li>
              <li>Kommunicera med dig gällande din bokning (t.ex. vid ändringar eller avbokningar)</li>
              <li>Hantera betalningar via vår betalningsleverantör (Stripe)</li>
              <li>Förbättra vår tjänst och kundupplevelse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Delning av information</h2>
            <p>
              Vi säljer aldrig dina personuppgifter till tredje part. Vi delar endast nödvändig information med betrodda partners (såsom Stripe för betalningshantering, Resend för e-postutskick och Cloudflare för skydd mot automatiserade bokningar) för att kunna leverera våra tjänster till dig.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Dina rättigheter</h2>
            <p>
              Du har rätt att begära ett utdrag av de uppgifter vi har om dig, samt att begära att vi rättar eller raderar dina uppgifter. Kontakta oss på <a href="mailto:info@readypixelgo.se" className="text-blue-400 hover:underline font-medium">info@readypixelgo.se</a> om du vill utöva dessa rättigheter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Cookies och liknande tekniker</h2>
            <p>
              Vi använder cookies och lokal lagring i din webbläsare. Nödvändiga cookies används alltid eftersom sidan inte fungerar utan dem. Övriga används bara om du har gett ditt samtycke, och du kan när som helst ändra eller återkalla det.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <span className="font-semibold text-white">Nödvändiga</span> – sparar ditt cookieval, språk och tema, samt används av Stripe (betalning) och Cloudflare Turnstile (skydd mot robotar vid bokning).
              </li>
              <li>
                <span className="font-semibold text-white">Analys (kräver samtycke)</span> – Contentsquare samlar in hur besökare använder sidan, t.ex. klick och scrollning, så att vi kan förbättra den. Uppgifterna används inte för marknadsföring.
              </li>
              <li>
                <span className="font-semibold text-white">Karta (kräver samtycke)</span> – Google Maps visas i avsnittet Hitta hit. När kartan laddas kan Google sätta egna cookies och ta del av din IP-adress.
              </li>
            </ul>
            <p className="mt-3">
              Ditt val sparas i 12 månader, därefter frågar vi igen.
            </p>
            <button
              type="button"
              onClick={openConsentSettings}
              className="mt-4 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Ändra cookie-inställningar
            </button>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Kontakt</h2>
            <p>
              Om du har frågor om vår integritetspolicy, vänligen kontakta oss på:
              <br />
              E-post: <a href="mailto:info@readypixelgo.se" className="text-blue-400 hover:underline font-medium">info@readypixelgo.se</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
