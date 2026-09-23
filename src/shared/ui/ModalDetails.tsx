'use client';

import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface ModalDetailsProps {
  title: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** Secondary form fields stay out of the primary editing flow. */
export function ModalDetails({ title, summary, children, defaultOpen = false }: ModalDetailsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div className="border-t border-[#2a2a30]">
      <motion.button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        whileHover={{ color: 'var(--cockpit-accent-color)' }}
        transition={{ duration: 0.15 }}
        className="flex w-full items-center justify-between gap-3 py-3 text-left font-mono text-xs text-neutral-400 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/40"
      >
        <span>{title}</span>
        <span className="flex min-w-0 items-center gap-2">
          {!isOpen && summary && <span className="flex min-w-0 items-center truncate text-[11px] text-neutral-500">{summary}</span>}
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </motion.span>
        </span>
      </motion.button>
      <div id={contentId}>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pb-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
