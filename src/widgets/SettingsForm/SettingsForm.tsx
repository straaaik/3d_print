'use client';

import React from 'react';
import { SettingsFormModern } from './SettingsFormModern';

export function SettingsForm({ isExpanded = false }: { isExpanded?: boolean }) {
  return <SettingsFormModern isExpanded={isExpanded} />;
}
