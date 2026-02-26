import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, ExternalLink, CheckCircle2, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const GOOGLE_REVIEW_URL = "https://g.page/r/CbqGSHZ5h-1_EAE/review";

/* ───────── Firework helpers ───────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const FIREWORK_COLORS = [
  "#ff4444", "#ff8800", "#ffdd00", "#44ff44", "#4488ff",
  "#aa44ff", "#ff44aa", "#00ffcc", "#ff6644", "#88ff44",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createBurst(cx: number, cy: number, count: number): Particle[] {
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(2, 7);
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: randomBetween(0.6, 1.2),
      color,
      size: randomBetween(2, 5),
    };
  });
}

/* ───────── Floating background dots ───────── */
function FloatingDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const dots = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: randomBetween(2, 5),
      dx: randomBetween(-0.3, 0.3),
      dy: randomBetween(-0.3, 0.3),
      alpha: randomBetween(0.15, 0.35),
    }));

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.dx;
        d.y += d.dy;
        if (d.x < 0 || d.x > w) d.dx *= -1;
        if (d.y < 0 || d.y > h) d.dy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${d.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ───────── Firework canvas overlay ───────── */
function FireworkCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    // Launch multiple bursts
    const launchBursts = () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const cx = randomBetween(w * 0.15, w * 0.85);
          const cy = randomBetween(h * 0.15, h * 0.55);
          particlesRef.current.push(...createBurst(cx, cy, 50));
        }, i * 300);
      }
    };
    launchBursts();

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      ctx.clearRect(0, 0, w, h);
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 3 * dt; // gravity
        p.life -= dt / p.maxLife;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  );
}

/* ───────── Star row component ───────── */
function StarRating({
  value,
  hoverValue,
  onHover,
  onLeave,
  onChange,
  icon: Icon = Star,
  count = 10,
  starClass = "w-7 h-7",
  fillColor = "fill-yellow-400 text-yellow-400",
}: {
  value: number;
  hoverValue: number;
  onHover: (n: number) => void;
  onLeave: () => void;
  onChange: (n: number) => void;
  icon?: React.ElementType;
  count?: number;
  starClass?: string;
  fillColor?: string;
}) {
  const display = hoverValue || value;
  return (
    <div className="flex justify-center flex-wrap gap-0.5 sm:gap-1">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className="p-0.5 sm:p-1 transition-transform hover:scale-110 focus:outline-none"
          onMouseEnter={() => onHover(n)}
          onMouseLeave={onLeave}
          onClick={() => onChange(n)}
        >
          <Icon
            className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
              n <= display ? fillColor : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ───────── Main component ───────── */
export default function Review() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const isPreview = searchParams.get("preview") === "true";
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [gameRating, setGameRating] = useState(0);
  const [hoverGameRating, setHoverGameRating] = useState(0);
  const [enjoyed, setEnjoyed] = useState("");
  const [improve, setImprove] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [foundUs, setFoundUs] = useState("");

  // Check if token is valid
  useEffect(() => {
    const check = async () => {
      if (isPreview) {
        setLoading(false);
        return;
      }
      if (!token) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("submit-review", {
          body: { action: "check", token },
        });
        if (error || data?.error) {
          if (data?.alreadySubmitted) {
            setAlreadySubmitted(true);
          } else {
            setInvalid(true);
          }
        }
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [token]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      toast({ title: t("review.ratingRequired"), variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Preview mode — skip API, just show result
    if (isPreview) {
      await new Promise((r) => setTimeout(r, 600));
      setShowFireworks(true);
      setSubmitted(true);
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("submit-review", {
        body: {
          action: "submit",
          token,
          rating,
          game_rating: gameRating || null,
          enjoyed: enjoyed.trim(),
          improve: improve.trim(),
          age_range: ageRange || null,
          found_us: foundUs || null,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setShowFireworks(true);
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      toast({ title: t("review.submitFailed"), description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [rating, gameRating, enjoyed, improve, ageRange, foundUs, token, isPreview, toast, t]);

  const bgClass = "min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] relative overflow-hidden";

  // Loading state
  if (loading) {
    return (
      <div className={`${bgClass} flex items-center justify-center p-4`}>
        <FloatingDots />
        <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>{t("review.loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid / missing token
  if (invalid) {
    return (
      <div className={`${bgClass} flex items-center justify-center p-4`}>
        <FloatingDots />
        <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("review.invalidToken")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted
  if (alreadySubmitted) {
    return (
      <div className={`${bgClass} flex items-center justify-center p-4`}>
        <FloatingDots />
        <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-lg mb-1">{t("review.alreadyTitle")}</p>
            <p className="text-muted-foreground">{t("review.alreadyDescription")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Successfully submitted
  if (submitted) {
    const showGoogle = rating >= 8;
    return (
      <div className={`${bgClass} flex items-center justify-center p-4`}>
        <FloatingDots />
        <FireworkCanvas active={showFireworks} />
        <Card className="w-full max-w-lg relative z-10 bg-white/95 backdrop-blur">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">{t("review.thankYou")}</h2>
            <p className="text-muted-foreground">{t("review.thankYouDesc")}</p>

            {showGoogle && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <p className="font-medium text-blue-800">{t("review.googlePrompt")}</p>
                <Button asChild size="lg" className="w-full">
                  <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("review.leaveGoogleReview")}
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review form
  return (
    <div className={`${bgClass} py-12 px-4`}>
      <FloatingDots />
      <div className="max-w-lg mx-auto space-y-6 relative z-10">
        <Card className="bg-white/95 backdrop-blur shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("review.title")}</CardTitle>
            <p className="text-muted-foreground mt-1">{t("review.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating (1-10) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t("review.ratingLabel")}</Label>
              <StarRating
                value={rating}
                hoverValue={hoverRating}
                onHover={setHoverRating}
                onLeave={() => setHoverRating(0)}
                onChange={setRating}
              />
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {rating}/10
                </p>
              )}
            </div>

            {/* Game Selection Rating (1-10) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                {t("review.gameRatingLabel")}
              </Label>
              <StarRating
                value={gameRating}
                hoverValue={hoverGameRating}
                onHover={setHoverGameRating}
                onLeave={() => setHoverGameRating(0)}
                onChange={setGameRating}
                fillColor="fill-purple-400 text-purple-400"
              />
              {gameRating > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {gameRating}/10
                </p>
              )}
            </div>

            {/* What did you enjoy most? */}
            <div className="space-y-2">
              <Label htmlFor="enjoyed">{t("review.enjoyedLabel")}</Label>
              <Textarea
                id="enjoyed"
                placeholder={t("review.enjoyedPlaceholder")}
                value={enjoyed}
                onChange={(e) => setEnjoyed(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Anything we could improve? */}
            <div className="space-y-2">
              <Label htmlFor="improve">{t("review.improveLabel")}</Label>
              <Textarea
                id="improve"
                placeholder={t("review.improvePlaceholder")}
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Optional demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageRange">{t("review.ageLabel")}</Label>
                <select
                  id="ageRange"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("review.selectOption")}</option>
                  <option value="under_18">{t("review.ageUnder18")}</option>
                  <option value="18-24">{t("review.age18_24")}</option>
                  <option value="25-34">{t("review.age25_34")}</option>
                  <option value="35-44">{t("review.age35_44")}</option>
                  <option value="45-54">{t("review.age45_54")}</option>
                  <option value="55-65">{t("review.age55_65")}</option>
                  <option value="65+">{t("review.age65plus")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundUs">{t("review.foundUsLabel")}</Label>
                <select
                  id="foundUs"
                  value={foundUs}
                  onChange={(e) => setFoundUs(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("review.selectOption")}</option>
                  <option value="google">{t("review.foundGoogle")}</option>
                  <option value="instagram">{t("review.foundInstagram")}</option>
                  <option value="tiktok">{t("review.foundTiktok")}</option>
                  <option value="friends_family">{t("review.foundFriends")}</option>
                  <option value="walk_in">{t("review.foundWalkIn")}</option>
                  <option value="other">{t("review.foundOther")}</option>
                </select>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? t("review.submitting") : t("review.submit")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
