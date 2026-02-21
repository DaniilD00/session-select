import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Swords, Move, Sparkles } from "lucide-react";

function FloorCard({ children, index }: { children: React.ReactNode, index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only animate once
        }
      },
      { threshold: 0.2, rootMargin: "50px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}
      style={{ transitionDelay: `${index * 200}ms` }}
    >
      {children}
    </div>
  );
}

export const FloorInfo = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-black relative overflow-hidden">
      {/* Sharp, square-like gradient transition around the borders to hide the section lines */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>
      
      {/* Fun pulsating dark gradient in the background */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_60%)] animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_50%)] animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(192,38,211,0.1)_0%,transparent_50%)] animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] z-10" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-30 mt-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('floor.title')}
          </h2>
          <p className="text-xl text-blue-100/80 max-w-3xl mx-auto leading-relaxed">
            {t('floor.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Game Modes */}
          <FloorCard index={0}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 group shadow-lg hover:shadow-blue-500/20 h-full">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Swords className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">{t('floor.modes.title')}</h3>
              <p 
                className="text-gray-400 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t('floor.modes.description') }}
              />
            </div>
          </FloorCard>

          {/* Size */}
          <FloorCard index={1}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 group shadow-lg hover:shadow-emerald-500/20 h-full">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <Move className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">{t('floor.size.title')}</h3>
              <div className="mb-3">
                <span className="inline-block bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg font-bold text-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  4.8m × 9.6m
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                {t('floor.size.description')}
              </p>
            </div>
          </FloorCard>

          {/* Tech */}
          <FloorCard index={2}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 group shadow-lg hover:shadow-purple-500/20 h-full">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Sparkles className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">{t('floor.tech.title')}</h3>
              
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg font-bold text-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] transform group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                  {t('floor.tech.badge')}
                </span>
              </div>
              
              <p className="text-gray-400 leading-relaxed">
                {t('floor.tech.description')}
              </p>
            </div>
          </FloorCard>
        </div>
      </div>
    </section>
  );
};
