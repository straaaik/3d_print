'use client';

import React, { Suspense } from 'react';
import { SettingsFormModern } from './SettingsFormModern';

export function SettingsForm({ isExpanded = false }: { isExpanded?: boolean }) {
  return <Suspense fallback={<p className="p-5 font-mono text-xs text-neutral-400">Загрузка настроек…</p>}><SettingsFormModern isExpanded={isExpanded} /></Suspense>;
}
