'use client';

import type { HTMLMotionProps } from 'motion/react';
import { motion, useReducedMotion } from 'motion/react';

type StaticMotionProps<T extends 'div' | 'span' | 'tr'> = Omit<
  HTMLMotionProps<T>,
  'animate' | 'initial' | 'transition'
>;

export interface MotionPulseProps extends StaticMotionProps<'span'> {
  active?: boolean;
}

export interface MotionPulseDivProps extends StaticMotionProps<'div'> {
  active?: boolean;
}

const pulseAnimation = { opacity: [0.55, 1, 0.55] };
const pulseTransition = { duration: 1.8, ease: 'easeInOut' as const, repeat: Infinity };

export function MotionPulse({ active = true, className = '', ...props }: MotionPulseProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      {...props}
      className={`inline-block ${className}`}
      initial={false}
      animate={active && !shouldReduceMotion ? pulseAnimation : { opacity: 1 }}
      transition={active && !shouldReduceMotion ? pulseTransition : { duration: 0 }}
    />
  );
}

export function MotionPulseDiv({ active = true, ...props }: MotionPulseDivProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      {...props}
      initial={false}
      animate={active && !shouldReduceMotion ? pulseAnimation : { opacity: 1 }}
      transition={active && !shouldReduceMotion ? pulseTransition : { duration: 0 }}
    />
  );
}

export interface MotionPulseRowProps extends StaticMotionProps<'tr'> {
  active?: boolean;
}

export function MotionPulseRow({ active = true, ...props }: MotionPulseRowProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.tr
      {...props}
      initial={false}
      animate={active && !shouldReduceMotion ? pulseAnimation : { opacity: 1 }}
      transition={active && !shouldReduceMotion ? pulseTransition : { duration: 0 }}
    />
  );
}

export type MotionPingProps = StaticMotionProps<'span'>;

export function MotionPing(props: MotionPingProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      {...props}
      initial={false}
      animate={shouldReduceMotion
        ? { opacity: 0.35, scale: 1 }
        : { opacity: [0.7, 0], scale: [1, 2] }}
      transition={shouldReduceMotion
        ? { duration: 0 }
        : { duration: 1.2, ease: 'easeOut', repeat: Infinity }}
    />
  );
}

export interface MotionSpinnerProps extends StaticMotionProps<'span'> {
  active?: boolean;
}

export function MotionSpinner({ active = true, className = '', ...props }: MotionSpinnerProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      {...props}
      className={`inline-block ${className}`}
      initial={false}
      animate={active && !shouldReduceMotion ? { rotate: 360 } : { rotate: 0 }}
      transition={active && !shouldReduceMotion
        ? { duration: 0.8, ease: 'linear', repeat: Infinity }
        : { duration: 0 }}
    />
  );
}

export type MotionRevealDivProps = StaticMotionProps<'div'>;

export function MotionRevealDiv(props: MotionRevealDivProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      {...props}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
