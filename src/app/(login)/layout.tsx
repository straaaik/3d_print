'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';
import { ToastProvider } from '../../entities/model/ToastProvider';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10">
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </div>
  );
}
