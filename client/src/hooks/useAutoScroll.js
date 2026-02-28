import { useState, useRef, useEffect } from 'react';

// Speed range based on typical song tempos and display metrics:
//   Font 16px × lineHeight 1.4 = 22px per text line, ~44px with chords
//   Slow ballad  (60 BPM, 1 line / 4s)   → ~11 px/s
//   Medium tempo (120 BPM, 1 line / 2.5s) → ~18 px/s
//   Fast song    (180 BPM, 1 line / 1.5s) → ~30 px/s
// Slider 0–100 → 8–50 px/s linearly (with buffer for extremes)
const MIN_SPEED = 8;
const MAX_SPEED = 50;

export function useAutoScroll(containerRef) {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(30); // slider 0–100; 30 ≈ 20 px/s
  const speedRef = useRef(speed);
  const rafId = useRef(null);
  const lastTime = useRef(null);
  const accum = useRef(0);

  speedRef.current = speed;

  useEffect(() => {
    if (!on) return;

    lastTime.current = null;
    accum.current = 0;

    function tick() {
      const el = containerRef.current;
      const now = performance.now();
      if (el && lastTime.current !== null) {
        const dt = (now - lastTime.current) / 1000;
        const pxPerSec = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * (speedRef.current / 100);
        accum.current += pxPerSec * dt;
        if (accum.current >= 1) {
          const px = Math.floor(accum.current);
          el.scrollTop += px;
          accum.current -= px;
        }
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
