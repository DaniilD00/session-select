import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  // Stagger siblings by passing their index.
  delay?: number;
}

// Fades content up once as it scrolls into view. Content is visible by
// default and only hidden after mount, so prerendered HTML, crawlers and
// visitors who prefer reduced motion always see everything.
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at mount: nothing to animate in.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        state === "hidden" && "translate-y-6 opacity-0",
        className
      )}
      style={state === "shown" ? { transitionDelay: `${delay * 90}ms` } : undefined}
    >
      {children}
    </div>
  );
}
