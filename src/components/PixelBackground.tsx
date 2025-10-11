import { useEffect, useRef } from 'react';

interface Pixel {
  x: number;
  y: number;
  isOn: boolean;
  fadeProgress: number;
  targetState: boolean;
}

export const PixelBackground = () => {
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

    // Animation loop
    let lastTime = 0;
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
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
          
          // Red color with varying intensity
          const alpha = intensity * 0.9;
          ctx.fillStyle = `rgba(220, 38, 38, ${alpha})`;
          ctx.fillRect(pixel.x, pixel.y, PIXEL_SIZE, PIXEL_SIZE);
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#0a0a0a' }}
    />
  );
};
