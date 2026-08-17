'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';

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
        <div className="w-12 h-12 rounded-xl bg-[#0CB4E0]/15 border border-[#0CB4E0]/30 flex items-center justify-center text-[#0CB4E0] shadow-md shadow-[#0CB4E0]/10 shrink-0">
          <Calculator className="w-6 h-6" />
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
