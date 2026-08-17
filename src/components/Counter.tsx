'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Count a number up when it scrolls into view.
 *
 * Counting is not decoration here. These figures are the whole claim, and a
 * number that arrives instantly reads as a label, while one that climbs reads
 * as a measurement. It settles on the exact value, never an approximation.
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
  /* Seed with the real figure so the server-rendered HTML carries the number.
     A page that ships "0" is wrong in every screenshot, in every crawler, and
     for anyone whose JavaScript has not arrived yet. The animation is an
     enhancement on top of a correct page, not the only way to see the value. */
  const [value, setValue] = useState(to);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || started) return;

    /* Respect a reduced-motion preference by simply showing the answer. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStarted(true);
      return;
    }

    setValue(0);

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setStarted(true);
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          /* Ease out: fast at first, settling rather than stopping dead. */
          const eased = 1 - (1 - t) ** 3;
          setValue(Math.round(to * eased));
          if (t < 1) requestAnimationFrame(tick);
          else setValue(to);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [to, durationMs, started]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
