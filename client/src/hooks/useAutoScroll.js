import { useState, useRef, useEffect, useCallback } from 'react';

export function useAutoScroll(containerRef) {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(30);
  const lastTime = useRef(null);
  const rafId = useRef(null);

  const tick = useCallback(() => {
    if (!containerRef.current) return;
    const now = performance.now();
    if (lastTime.current !== null) {
      const dt = (now - lastTime.current) / 1000;
      containerRef.current.scrollTop += speed * dt;
    }
    lastTime.current = now;
    rafId.current = requestAnimationFrame(tick);
  }, [containerRef, speed]);

  useEffect(() => {
    if (on) {
      lastTime.current = null;
      rafId.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [on, tick]);

  return { on, setOn, speed, setSpeed };
}
