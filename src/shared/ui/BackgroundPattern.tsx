'use client';

import { useEffect, useRef } from 'react';
import type { BackgroundVariant } from '../lib/backgroundPreferences';
import { createParticleBackground } from '../lib/particleBackground';

/** Static previews share the real field geometry without animation listeners. */
export function BackgroundPattern({ variant, className = '' }: { variant: BackgroundVariant; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || variant === 'none') return;
    const field = createParticleBackground(ref.current, variant, 'clear', true);
    const draw = () => { field.resize(); field.draw(-1000, -1000, 0, -1000, -1000, 0); };
    const observer = new ResizeObserver(draw);
    observer.observe(ref.current);
    draw();
    return () => observer.disconnect();
  }, [variant]);
  return variant === 'none' ? null : <canvas ref={ref} aria-hidden="true" className={`h-full w-full ${className}`} />;
}
