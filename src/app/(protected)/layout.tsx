'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';
import { DataProvider } from '../../entities/model/DataProvider';
import { OrderModalProvider } from '../../entities/model/OrderModalContext';
import { ToastProvider } from '../../entities/model/ToastProvider';
import { AuthGuard } from '../../shared/ui/AuthGuard';
import { CockpitTransitionProvider } from '../../shared/ui/CockpitContentTransition';
import { PixelCurtainProvider } from '../../shared/ui/PixelCurtain';
import { ProtectedPageReadiness } from '../../shared/ui/page-transition/ProtectedPageReadiness';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10">
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <ProtectedPageReadiness />
              <OrderModalProvider>
                <AuthGuard>
                  <PixelCurtainProvider>
                    <CockpitTransitionProvider>{children}</CockpitTransitionProvider>
                  </PixelCurtainProvider>
                </AuthGuard>
              </OrderModalProvider>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
    </div>
  );
}
