import { useState, useRef, useEffect, useCallback } from 'react';

// speed slider 1–100 → actual px/s via exponential curve
// 1 → ~5 px/s, 50 → ~30 px/s, 100 → ~120 px/s
function sliderToPxPerSec(v) {
  return 5 * Math.pow(1.032, v);
}

export function useAutoScroll(containerRef) {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(40); // slider value 1-100
  const lastTime = useRef(null);
  const accum = useRef(0);
  const rafId = useRef(null);

  const tick = useCallback(() => {
    if (!containerRef.current) return;
    const now = performance.now();
    if (lastTime.current !== null) {
      const dt = (now - lastTime.current) / 1000;
      accum.current += sliderToPxPerSec(speed) * dt;
      const px = Math.floor(accum.current);
      if (px >= 1) {
        containerRef.current.scrollTop += px;
        accum.current -= px;
      }
    }
    lastTime.current = now;
    rafId.current = requestAnimationFrame(tick);
  }, [containerRef, speed]);

  useEffect(() => {
    if (on) {
      lastTime.current = null;
      accum.current = 0;
      rafId.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [on, tick]);

  return { on, setOn, speed, setSpeed };
}
