'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';
import { PublicPageReady } from '../../shared/ui/page-transition/PageReadySurface';

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider><PublicPageReady viewKey="/about">{children}</PublicPageReady></AuthProvider>
  );
}
