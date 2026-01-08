import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const gradients = [
  "from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border-red-200",
  "from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-orange-200",
  "from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border-amber-200",
  "from-lime-50 to-green-50 hover:from-lime-100 hover:to-green-100 border-lime-200",
  "from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200",
  "from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 border-teal-200",
  "from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border-cyan-200",
  "from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200",
  "from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 border-indigo-200",
  "from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-violet-200",
];

export function FAQSection() {
  const { t } = useTranslation();
  
  // Use returnObjects: true to get the array from translation files
  const faqItems = t('faq.items', { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <section className="w-full py-24 bg-background relative overflow-hidden">
      <div className="container px-4 mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            {t('faq.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('faq.subtitle')}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {Array.isArray(faqItems) && faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className={`border rounded-2xl px-2 transition-all duration-300 hover:shadow-md bg-gradient-to-r ${gradients[index % gradients.length]}`}
            >
              <AccordionTrigger className="hover:no-underline px-4 py-4 text-lg font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
