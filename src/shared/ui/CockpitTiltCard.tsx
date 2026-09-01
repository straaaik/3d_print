'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from 'motion/react';

export type CockpitTiltTone = 'cyan' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky' | 'neutral';

export interface CockpitTiltCardProps {
  children: React.ReactNode;
  backContent?: React.ReactNode;
  tone?: CockpitTiltTone;
  className?: string;
  containerClassName?: string;
  maxTilt?: number;
  as?: 'div' | 'article' | 'section';
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  transition?: Transition;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onFlipChange?: (isFlipped: boolean) => void;
}

const TONE_SPOTLIGHTS: Record<CockpitTiltTone, { primary: string; secondary: string; border: string }> = {
  cyan: {
    primary: 'rgba(6, 182, 212, 0.09)',
    secondary: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(6, 182, 212, 0.28)',
  },
  rose: {
    primary: 'rgba(244, 63, 94, 0.09)',
    secondary: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(244, 63, 94, 0.28)',
  },
  emerald: {
    primary: 'rgba(52, 211, 153, 0.09)',
    secondary: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(52, 211, 153, 0.28)',
  },
  amber: {
    primary: 'rgba(245, 158, 11, 0.09)',
    secondary: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(245, 158, 11, 0.28)',
  },
  violet: {
    primary: 'rgba(168, 85, 247, 0.09)',
    secondary: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(168, 85, 247, 0.28)',
  },
  sky: {
    primary: 'rgba(56, 189, 248, 0.09)',
    secondary: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(56, 189, 248, 0.28)',
  },
  neutral: {
    primary: 'rgba(255, 255, 255, 0.07)',
    secondary: 'rgba(255, 255, 255, 0.02)',
    border: 'rgba(255, 255, 255, 0.22)',
  },
};

export const CockpitTiltCard = React.memo(function CockpitTiltCard({
  children,
  backContent,
  tone = 'neutral',
  className = '',
  containerClassName = '',
  maxTilt = 7,
  as = 'div',
  initial,
  animate,
  transition,
  onClick,
  onFlipChange,
}: CockpitTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPressedRef = useRef(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAxis, setFlipAxis] = useState<'x' | 'y'>('y');

  const shouldReduceMotion = useReducedMotion();

  // Motion values for hover tilt
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawScale = useMotionValue(1);
  const rawTranslateZ = useMotionValue(0);

  // Motion values for 180-degree flip
  const rawFlipX = useMotionValue(0);
  const rawFlipY = useMotionValue(0);

  // Motion values for subtle cursor spotlight
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const glareOpacity = useMotionValue(0);

  // Springs for natural, tactile response
  const springConfig = { stiffness: 350, damping: 26, mass: 0.45 };
  const flipSpringConfig = { stiffness: 260, damping: 24, mass: 0.6 };

  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);
  const scale = useSpring(rawScale, { stiffness: 420, damping: 28, mass: 0.35 });
  const translateZ = useSpring(rawTranslateZ, springConfig);
  const smoothGlareOpacity = useSpring(glareOpacity, { stiffness: 300, damping: 25 });

  const flipX = useSpring(rawFlipX, flipSpringConfig);
  const flipY = useSpring(rawFlipY, flipSpringConfig);

  // Combined rotation (hover tilt + flip)
  const combinedRotateX = useTransform([rotateX, flipX], ([rx, fx]) => Number(rx) + Number(fx));
  const combinedRotateY = useTransform([rotateY, flipY], ([ry, fy]) => Number(ry) + Number(fy));

  const palette = TONE_SPOTLIGHTS[tone] || TONE_SPOTLIGHTS.neutral;
  const glareBackground = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, ${palette.primary}, ${palette.secondary} 40%, transparent 80%)`;
  const borderGlareBackground = useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, ${palette.border}, transparent 70%)`;

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mouseX.set(x);
      mouseY.set(y);

      // Normalized coordinates from -1 (top/left) to +1 (bottom/right)
      const normX = (x / rect.width - 0.5) * 2;
      const normY = (y / rect.height - 0.5) * 2;

      // Invert normY so hovering/pressing top tilts top inward (rotateX > 0)
      const tiltFactor = isPressedRef.current ? maxTilt * 1.35 : maxTilt;

      // When flipped 180 degrees horizontally, horizontal tilt relative to screen is inverted
      const currentFlipY = rawFlipY.get();
      const isCurrentlyYFlipped = Math.abs(currentFlipY) > 90;
      const currentFlipX = rawFlipX.get();
      const isCurrentlyXFlipped = Math.abs(currentFlipX) > 90;

      const targetX = isCurrentlyXFlipped ? normY * tiltFactor : -normY * tiltFactor;
      const targetY = isCurrentlyYFlipped ? -normX * tiltFactor : normX * tiltFactor;

      rawRotateX.set(targetX);
      rawRotateY.set(targetY);
    },
    [shouldReduceMotion, maxTilt, mouseX, mouseY, rawRotateX, rawRotateY, rawFlipX, rawFlipY]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
      glareOpacity.set(1);
    },
    [glareOpacity, mouseX, mouseY]
  );

  const handlePointerLeave = useCallback(() => {
    isPressedRef.current = false;
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawScale.set(1);
    rawTranslateZ.set(0);
    glareOpacity.set(0);

    // Auto flip back to front when mouse leaves the card
    if (isFlipped) {
      setIsFlipped(false);
      rawFlipX.set(0);
      rawFlipY.set(0);
      onFlipChange?.(false);
    }
  }, [rawRotateX, rawRotateY, rawScale, rawTranslateZ, glareOpacity, isFlipped, rawFlipX, rawFlipY, onFlipChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Don't intercept if clicking on a button, input, or other active control
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [data-no-flip="true"]')) {
        return;
      }

      isPressedRef.current = true;
      rawScale.set(0.982);
      rawTranslateZ.set(-4);
    },
    [rawScale, rawTranslateZ]
  );

  const handlePointerUp = useCallback(() => {
    isPressedRef.current = false;
    rawScale.set(1);
    rawTranslateZ.set(0);
  }, [rawScale, rawTranslateZ]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore click flip if clicking specific interactive buttons
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [data-no-flip="true"]')) {
        onClick?.(e);
        return;
      }

      if (backContent) {
        if (isFlipped) {
          // Flip back to front
          setIsFlipped(false);
          rawFlipX.set(0);
          rawFlipY.set(0);
          onFlipChange?.(false);
        } else {
          // Determine flip direction based on click position relative to card center
          const rect = cardRef.current?.getBoundingClientRect();
          if (rect) {
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const normX = (clickX / rect.width - 0.5) * 2;
            const normY = (clickY / rect.height - 0.5) * 2;

            if (Math.abs(normX) >= Math.abs(normY)) {
              // Horizontal flip
              setFlipAxis('y');
              rawFlipX.set(0);
              rawFlipY.set(normX >= 0 ? 180 : -180);
            } else {
              // Vertical flip
              setFlipAxis('x');
              rawFlipY.set(0);
              rawFlipX.set(normY >= 0 ? -180 : 180);
            }
            setIsFlipped(true);
            onFlipChange?.(true);
          }
        }
      }

      onClick?.(e);
    },
    [backContent, isFlipped, onClick, onFlipChange, rawFlipX, rawFlipY]
  );

  const Component = as === 'article' ? motion.article : as === 'section' ? motion.section : motion.div;

  const backTransform =
    flipAxis === 'x'
      ? 'rotateX(180deg) translateZ(1px)'
      : 'rotateY(180deg) translateZ(1px)';

  return (
    <div
      style={{ perspective: 1200 }}
      className={`h-full w-full select-none ${containerClassName}`}
    >
      <Component
        ref={cardRef}
        initial={initial}
        animate={animate}
        transition={transition}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        style={
          shouldReduceMotion
            ? undefined
            : {
                rotateX: combinedRotateX,
                rotateY: combinedRotateY,
                scale,
                translateZ,
                transformStyle: 'preserve-3d',
              }
        }
        className={`relative h-full w-full ${backContent ? 'cursor-pointer' : ''}`}
      >
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div
          style={
            shouldReduceMotion
              ? undefined
              : {
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg) translateZ(1px)',
                }
          }
          className={`relative z-10 flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-sm transition-colors hover:border-white/20 ${className} ${isFlipped && shouldReduceMotion ? 'hidden' : ''}`}
        >
          {/* Мягкий рассеянный световой след курсора */}
          {!shouldReduceMotion && (
            <>
              <motion.div
                aria-hidden="true"
                style={{ opacity: smoothGlareOpacity, background: glareBackground }}
                className="pointer-events-none absolute inset-0 z-20 rounded-xl transition-opacity"
              />
              <motion.div
                aria-hidden="true"
                style={{
                  opacity: smoothGlareOpacity,
                  background: borderGlareBackground,
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  padding: '1px',
                }}
                className="pointer-events-none absolute inset-0 z-20 rounded-xl"
              />
            </>
          )}
          {children}
        </div>

        {/* ОБРАТНАЯ СТОРОНА (ПРИ НАЖАТИИ / FLIP) */}
        {backContent && (
          <div
            style={
              shouldReduceMotion
                ? undefined
                : {
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: backTransform,
                  }
            }
            className={`absolute inset-0 z-10 flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border border-white/15 bg-neutral-950/95 p-3.5 shadow-sm backdrop-blur-xl ${className} ${!isFlipped && shouldReduceMotion ? 'hidden' : ''}`}
          >
            {/* Мягкий рассеянный световой след курсора на обратной стороне */}
            {!shouldReduceMotion && (
              <>
                <motion.div
                  aria-hidden="true"
                  style={{ opacity: smoothGlareOpacity, background: glareBackground }}
                  className="pointer-events-none absolute inset-0 z-20 rounded-xl transition-opacity"
                />
                <motion.div
                  aria-hidden="true"
                  style={{
                    opacity: smoothGlareOpacity,
                    background: borderGlareBackground,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '1px',
                  }}
                  className="pointer-events-none absolute inset-0 z-20 rounded-xl"
                />
              </>
            )}
            <div className="relative z-10 flex h-full w-full flex-col justify-between">
              {backContent}
            </div>
          </div>
        )}
      </Component>
    </div>
  );
});
