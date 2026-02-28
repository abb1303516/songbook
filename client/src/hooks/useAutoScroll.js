import { useState, useRef, useEffect } from 'react';

export function useAutoScroll(containerRef) {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(50); // slider 1-100
  const speedRef = useRef(speed);
  const rafId = useRef(null);
  const lastTime = useRef(null);

  // Ref keeps current speed without restarting the animation loop
  speedRef.current = speed;

  useEffect(() => {
    if (!on) return;

    lastTime.current = null;

    function tick() {
      const el = containerRef.current;
      const now = performance.now();
      if (el && lastTime.current !== null) {
        const dt = (now - lastTime.current) / 1000;
        // Quadratic curve: slider 1→5 px/s, 50→~30 px/s, 100→80 px/s
        const pxPerSec = 5 + 75 * Math.pow(speedRef.current / 100, 1.5);
        el.scrollTop += pxPerSec * dt;
      }
      lastTime.current = now;
      rafId.current = requestAnimationFrame(tick);
    }

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [on, containerRef]);

  return { on, setOn, speed, setSpeed };
}
