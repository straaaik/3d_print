'use client';

import { AuthProvider } from '../../entities/model/AuthProvider';

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
