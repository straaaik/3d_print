'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';
import { ToastProvider } from '../../entities/model/ToastProvider';
import { PublicPageReady } from '../../shared/ui/page-transition/PageReadySurface';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10">
        <ToastProvider>
          <AuthProvider><PublicPageReady viewKey="/login">{children}</PublicPageReady></AuthProvider>
        </ToastProvider>
    </div>
  );
}
