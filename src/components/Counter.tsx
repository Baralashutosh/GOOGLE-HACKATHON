'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Count a number up when it scrolls into view.
 *
 * Counting is not decoration here. These figures are the whole claim, and a
 * number that arrives instantly reads as a label, while one that climbs reads
 * as a measurement. It settles on the exact value, never an approximation.
 *
 * Seeded with the real figure so the server-rendered HTML carries the number.
 * A page that ships "0" is wrong in every screenshot, in every crawler, and for
 * anyone whose JavaScript has not arrived. The animation is an enhancement on
 * top of a correct page, not the only way to see the value.
 */
export function Counter({
  to,
  suffix = '',
  prefix = '',
  durationMs = 1400,
  className = '',
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  /* A ref, not state: nothing renders from it, and writing state straight into
     an effect body is both a lint error and a wasted render. */
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || started.current) return;

    /* Anyone who asked not to be moved simply keeps the seeded value. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      started.current = true;
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        const begin = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - begin) / durationMs);
          /* Ease out: fast at first, settling rather than stopping dead. */
          const eased = 1 - (1 - t) ** 3;
          setValue(Math.round(to * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        /* The first frame lands near zero on its own, so there is no need to
           blank the value first and no flash of an empty figure. */
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
