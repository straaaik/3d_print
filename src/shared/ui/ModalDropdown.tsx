'use client';

import React from 'react';
import { CockpitDropdown, type CockpitDropdownProps } from './CockpitDropdown';

/** Modal form layout: one label above the existing shared dropdown. */
export function ModalDropdown({ label, sublabel, ariaLabel, ...props }: CockpitDropdownProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-400">
          <span>{label}</span>
          {sublabel && <span className="text-[11px] text-neutral-500">{sublabel}</span>}
        </div>
      )}
      <CockpitDropdown {...props} ariaLabel={ariaLabel || (typeof label === 'string' ? label : undefined)} />
    </div>
  );
}
