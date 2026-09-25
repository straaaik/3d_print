'use client';

import React from 'react';
import { AuthProvider } from '../../entities/model/AuthProvider';
import { DataProvider } from '../../entities/model/DataProvider';
import { ToastProvider } from '../../entities/model/ToastProvider';
import { ModalsShowcase } from '../../widgets/ModalsShowcase/ModalsShowcase';

export default function ModalsTestPage() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <ModalsShowcase />
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
