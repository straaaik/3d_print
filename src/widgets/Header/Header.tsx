'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: 'calculator', label: 'Калькулятор' },
  { id: 'filaments', label: 'Филаменты' },
  { id: 'printers', label: 'Принтеры' },
  { id: 'settings', label: 'Настройки' },
];

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 select-none">
      {/* Логотип и Название */}
      <div className="flex items-center gap-3">
        {/* SVG сопла 3D-принтера с выходящей нитью */}
        <div className="w-8 h-8 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Сопло (верхняя часть) - голубой Primary #0CB4E0 */}
            <path d="M16 4L6 20H26L16 4Z" fill="#0CB4E0" />
            {/* Выходящий пластик (нижняя часть) - голубой Primary #0CB4E0 */}
            <path d="M13 22H19V28C19 29.1 18.1 30 17 30H15C13.9 30 13 29.1 13 28V22Z" fill="#0CB4E0" />
            {/* Тонкий акцент сопла */}
            <path d="M16 4L11 12H21L16 4Z" fill="#0CB4E0" opacity="0.6" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">
            Стоимость печати
          </h1>
          <p className="text-neutral-accent text-xs font-medium">
            локальный калькулятор • данные хранятся в этом браузере
          </p>
        </div>
      </div>

      {/* Табы */}
      <nav className="bg-[#16181d] border border-[#242930] p-1 rounded-xl flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 focus:outline-none cursor-pointer ${
                isActive ? 'text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              {/* Скользящий фон с использованием Framer Motion */}
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  className="absolute inset-0 bg-primary rounded-lg z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
