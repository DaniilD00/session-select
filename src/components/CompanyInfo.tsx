
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Zap, Users, Flag } from "lucide-react"
import { useTranslation } from "react-i18next"

const cardStyles = [
  {
    icon: Flag,
    color: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-400/80 dark:border-emerald-500/80",
    dimBorderColor: "border-emerald-900/10 dark:border-emerald-100/10",
    shadowColor: "hover:shadow-emerald-500/30",
    glowColor: "shadow-[0_0_30px_-5px_rgba(52,211,153,0.3)]",
    bgColor: "bg-emerald-100/40 dark:bg-emerald-950/20",
    rotate: "-rotate-1"
  },
  {
    icon: Zap,
    color: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-400/80 dark:border-blue-500/80",
    dimBorderColor: "border-blue-900/10 dark:border-blue-100/10",
    shadowColor: "hover:shadow-blue-500/30",
    glowColor: "shadow-[0_0_30px_-5px_rgba(96,165,250,0.3)]",
    bgColor: "bg-blue-100/40 dark:bg-blue-950/20",
    rotate: "rotate-2"
  },
  {
    icon: Trophy,
    color: "text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-400/80 dark:border-rose-500/80",
    dimBorderColor: "border-rose-900/10 dark:border-rose-100/10",
    shadowColor: "hover:shadow-rose-500/30",
    glowColor: "shadow-[0_0_30px_-5px_rgba(251,113,133,0.3)]",
    bgColor: "bg-rose-100/40 dark:bg-rose-950/20",
    rotate: "-rotate-2"
  },
  {
    icon: Users,
    color: "text-slate-700 dark:text-slate-400",
    borderColor: "border-slate-400/80 dark:border-slate-500/80",
    dimBorderColor: "border-slate-900/10 dark:border-slate-100/10",
    shadowColor: "hover:shadow-slate-500/30",
    glowColor: "shadow-[0_0_30px_-5px_rgba(148,163,184,0.3)]",
    bgColor: "bg-slate-100/40 dark:bg-slate-950/20",
    rotate: "rotate-1"
  }
]

interface InfoCardData {
  icon: typeof Flag;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  borderColor: string;
  dimBorderColor: string;
  shadowColor: string;
  glowColor: string;
  bgColor: string;
  rotate: string;
}

function InfoCard({ card, index }: { card: InfoCardData, index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.2, rootMargin: "-20%" }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div 
      ref={ref} 
      className={`${index % 2 === 0 ? 'mt-0' : 'md:mt-12'} transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
    >
      <Card className={`
        h-full border-2 backdrop-blur-md transition-all duration-700 hover:scale-105
        ${card.bgColor} 
        ${isVisible ? card.borderColor : card.dimBorderColor}
        ${isVisible ? card.glowColor : 'shadow-none'}
        ${card.shadowColor}
        ${card.rotate}
        hover:rotate-0
        hover:shadow-xl
        hover:bg-opacity-80
      `}>
        <CardHeader className="space-y-3 pb-4">
          <div className={`w-14 h-14 rounded-2xl bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 flex items-center justify-center ${card.color} shadow-sm mb-2 transition-transform duration-500 ${isVisible ? 'scale-100' : 'scale-0'}`}>
            <card.icon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <CardTitle className={`text-xl font-bold tracking-tight text-foreground`}>{card.title}</CardTitle>
            <p className={`text-xs font-bold uppercase tracking-wider ${card.color}`}>{card.subtitle}</p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-sm font-medium">
            {card.description}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function CompanyInfo() {
  const { t } = useTranslation();
  
  const cardContent = t('companyInfo.cards', { returnObjects: true });
  const infoCards: InfoCardData[] = Array.isArray(cardContent) ? cardStyles.map((style, index) => ({
    ...style,
    title: cardContent[index]?.title || '',
    subtitle: cardContent[index]?.subtitle || '',
    description: cardContent[index]?.description || '',
  })) : [];

  return (
    <section className="w-full pt-8 pb-4 relative overflow-hidden bg-background">
      {/* Abstract background elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="container px-4 mx-auto">
        <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
          {t('companyInfo.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8">
          {infoCards.map((card, index) => (
            <InfoCard key={index} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
