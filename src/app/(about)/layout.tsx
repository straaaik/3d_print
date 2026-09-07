'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';
import { AppMotionProvider } from '../../shared/ui/AppMotionProvider';

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppMotionProvider>
      <AuthProvider>{children}</AuthProvider>
    </AppMotionProvider>
  );
}
