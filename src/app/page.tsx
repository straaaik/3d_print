'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../entities/model/DataProvider';

export default function HomePage() {
  const router = useRouter();
  const { isLoading } = useData();

  useEffect(() => {
    if (!isLoading) {
      router.replace('/orders');
    }
  }, [isLoading, router]);

  return (
    <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4 select-none">
        <div className="w-10 h-10 rounded-full border-4 border-[#242930] border-t-[#FF6B00] animate-spin" />
        <p className="text-gray-400 text-sm font-semibold animate-pulse">
          Перенаправление на /orders...
        </p>
      </div>
    </div>
  );
}
