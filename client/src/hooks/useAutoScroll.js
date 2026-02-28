import { useState, useRef, useEffect } from 'react';

export function useAutoScroll(containerRef) {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(30);
  const speedRef = useRef(speed);
  const rafId = useRef(null);
  const lastTime = useRef(null);

  speedRef.current = speed;

  useEffect(() => {
    if (!on) return;

    lastTime.current = null;

    function tick() {
      const el = containerRef.current;
      const now = performance.now();
      if (el && lastTime.current !== null) {
        const dt = (now - lastTime.current) / 1000;
        el.scrollTop += speedRef.current * dt;
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
