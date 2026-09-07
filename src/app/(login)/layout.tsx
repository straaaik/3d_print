'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';
import { ToastProvider } from '../../entities/model/ToastProvider';
import { AppMotionProvider } from '../../shared/ui/AppMotionProvider';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10">
      <AppMotionProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </AppMotionProvider>
    </div>
  );
}
