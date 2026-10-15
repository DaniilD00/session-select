import { useEffect, useRef } from 'react';

interface Pixel {
  x: number;
  y: number;
  isOn: boolean;
  fadeProgress: number;
  targetState: boolean;
}

interface PixelBackgroundProps {
  // Pixel colour as an "r, g, b" string, dropped straight into rgba().
  pixelColor?: string;
  // Canvas clear (background) colour.
  clearColor?: string;
}

export const PixelBackground = ({
  pixelColor = "220, 38, 38",
  clearColor = "#0a0a0a",
}: PixelBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initializePixels();
    };

    const PIXEL_SIZE = 60; // Size of each pixel block
    const PIXEL_GAP = 8; // Gap between pixels

    const initializePixels = () => {
      pixelsRef.current = [];
      const cols = Math.ceil(canvas.width / (PIXEL_SIZE + PIXEL_GAP));
      const rows = Math.ceil(canvas.height / (PIXEL_SIZE + PIXEL_GAP));

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          pixelsRef.current.push({
            x: col * (PIXEL_SIZE + PIXEL_GAP),
            y: row * (PIXEL_SIZE + PIXEL_GAP),
            isOn: Math.random() > 0.5,
            fadeProgress: Math.random(),
            targetState: Math.random() > 0.5,
          });
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Visitors who prefer reduced motion get one still frame.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // Animation loop
    let lastTime = 0;
    const animate = (currentTime: number) => {
      // Clamp so a resumed loop (tab switch, scrolled back) doesn't jump.
      const deltaTime = lastTime ? Math.min(0.1, (currentTime - lastTime) / 1000) : 0;
      lastTime = currentTime;

      // Clear canvas
      ctx.fillStyle = clearColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw pixels
      pixelsRef.current.forEach((pixel) => {
        // Randomly decide to switch state
        if (Math.random() < 0.002) {
          pixel.targetState = !pixel.targetState;
        }

        // Fade towards target state
        const fadeSpeed = 0.8 + Math.random() * 0.4; // Random fade speed for variety
        if (pixel.targetState && pixel.fadeProgress < 1) {
          pixel.fadeProgress = Math.min(1, pixel.fadeProgress + deltaTime * fadeSpeed);
        } else if (!pixel.targetState && pixel.fadeProgress > 0) {
          pixel.fadeProgress = Math.max(0, pixel.fadeProgress - deltaTime * fadeSpeed);
        }

        // Draw pixel as square
        if (pixel.fadeProgress > 0.01) {
          const intensity = pixel.fadeProgress;

          // Location colour with varying intensity
          const alpha = intensity * 0.9;
          ctx.fillStyle = `rgba(${pixelColor}, ${alpha})`;
          ctx.fillRect(pixel.x, pixel.y, PIXEL_SIZE, PIXEL_SIZE);
        }
      });

      if (!reduceMotion && running) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Only animate while the canvas is on screen — it's a full-width canvas
    // redrawn every frame, which is wasted work once scrolled past.
    let running = false;
    const start = () => {
      if (running) return;
      running = true;
      lastTime = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    const stop = () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    let observer: IntersectionObserver | null = null;
    if (reduceMotion) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
      observer.observe(canvas);
    } else {
      start();
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      observer?.disconnect();
      stop();
    };
  }, [pixelColor, clearColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: clearColor }}
    />
  );
};
