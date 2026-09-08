'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { animate, cancelFrame, frame, useMotionValue, useSpring } from 'motion/react';
import { useBackgroundPreferences } from '../lib/backgroundPreferences';
import { createParticleBackground } from '../lib/particleBackground';

const mediaQuery = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
function subscribeMedia(callback: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const getMedia = () => window.matchMedia(mediaQuery).matches;
const serverMedia = () => false;
const spring = { stiffness: 100, damping: 26, mass: 0.7, restDelta: 0.1, restSpeed: 0.1 };

function isWorkArea(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    'input, select, textarea, button, a, table, form, dialog, nav, header, footer, [role="dialog"], [role="menu"], [role="tabpanel"], [role="grid"], [data-work-area], .card, .modal',
  ));
}

export function AppBackground() {
  const { preferences } = useBackgroundPreferences();
  const allowed = useSyncExternalStore(subscribeMedia, getMedia, serverMedia);
  const interactive = allowed && preferences.interactive && preferences.variant !== 'none';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const x = useSpring(-1000, spring);
  const y = useSpring(-1000, spring);
  const hover = useSpring(0, { stiffness: 120, damping: 24, restDelta: 0.001, restSpeed: 0.001 });
  const ripple = useMotionValue(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || preferences.variant === 'none') return;
    const field = createParticleBackground(canvas, preferences.variant, preferences.contrast);
    let visible = false;
    let rippleX = -1000;
    let rippleY = -1000;
    const draw = ({ delta }: { delta: number }) => {
      if (document.hidden) return;
      const settling = field.draw(x.get(), y.get(), hover.get(), rippleX, rippleY, ripple.get(), delta);
      // Local particle inertia outlives the cursor spring, but stops once the wake settles.
      if (settling) frame.render(draw);
    };
    // Motion batches all spring changes into one canvas render per frame.
    const schedule = () => { frame.render(draw); };
    const resize = () => { field.resize(); schedule(); };
    const unsubscribe = [x, y, hover, ripple].map(value => value.on('change', schedule));
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || document.hidden) return;
      if (isWorkArea(event.target)) { visible = false; hover.set(0); return; }
      if (!visible) { x.jump(event.clientX); y.jump(event.clientY); }
      else { x.set(event.clientX); y.set(event.clientY); }
      visible = true;
      hover.set(1);
    };
    const click = (event: MouseEvent) => {
      if (preferences.variant !== 'dots' || event.button !== 0 || event.detail === 0 ||
        document.hidden || isWorkArea(event.target) || ripple.isAnimating()) return;
      rippleX = event.clientX;
      rippleY = event.clientY;
      ripple.jump(0);
      animate(ripple, 1, { duration: 3.8, ease: 'linear' });
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) { visible = false; hover.set(0); }
    };
    const stop = () => {
      visible = false;
      hover.jump(0);
      ripple.jump(1);
      x.stop();
      y.stop();
      cancelFrame(draw);
      field.reset();
      if (!document.hidden) field.draw(-1000, -1000, 0, -1000, -1000, 1);
    };
    if (interactive) {
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerout', leave, { passive: true });
      window.addEventListener('click', click, { passive: true });
      window.addEventListener('blur', stop);
      document.addEventListener('visibilitychange', stop);
    }
    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', leave);
      window.removeEventListener('click', click);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
      unsubscribe.forEach(remove => remove());
      stop();
    };
  }, [interactive, preferences.variant, preferences.contrast, x, y, hover, ripple]);

  return (
    <div aria-hidden="true" data-app-background={preferences.variant}
      data-background-motion={interactive ? 'interactive' : 'static'}
      className="pointer-events-none fixed inset-0 -z-10" style={{ contain: 'strict' }}>
      {preferences.variant !== 'none' && <canvas ref={canvasRef} className="h-full w-full" />}
    </div>
  );
}
