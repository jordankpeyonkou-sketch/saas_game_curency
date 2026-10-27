import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  to: number;
  suffix?: string;
  duration?: number;
  decimals?: number;
}

export function AnimatedCounter({ to, suffix = '', duration = 1600, decimals = 0 }: CounterProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(to * eased);
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}
