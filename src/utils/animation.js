import { useEffect, useState, useRef } from 'react';

// Tween from 0 → target on mount over `duration` ms. Uses an ease-out cubic
// so the number visually settles (fast at the start, slow at the finish)
// rather than ticking linearly. `prefers-reduced-motion: reduce` short-
// circuits the animation entirely and snaps to the target value.
export function useAnimatedNumber(target, duration = 700) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    startRef.current = start;
    fromRef.current = value;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOut(t);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // We deliberately omit `value` from deps — including it would chase
    // its own tail every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
