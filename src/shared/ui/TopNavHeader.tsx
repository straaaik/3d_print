'use client';

import React from 'react';
import { MainNavbar, MainNavbarProps } from './MainNavbar';
import { UserProfileMenu } from '../../widgets/UserMenu/UserProfileMenu';

export interface TopNavHeaderProps extends MainNavbarProps {
  showUserMenu?: boolean;
}

export function TopNavHeader({ className = '', onNavigate, showUserMenu = true }: TopNavHeaderProps) {
  return (
    <div className={`relative w-full flex items-center justify-center ${className}`}>
      {/* Центрированный главный навбар */}
      <MainNavbar onNavigate={onNavigate} />

      {/* Профиль пользователя строго в правом верхнем углу */}
      {showUserMenu && (
        <div className="hidden xl:block absolute right-0 top-1/2 -translate-y-1/2">
          <UserProfileMenu />
        </div>
      )}
    </div>
  );
}
