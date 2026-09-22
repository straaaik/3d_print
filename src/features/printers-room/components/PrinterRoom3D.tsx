'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import type { Printer } from '../../../shared/types';
import { PrinterRoomScene } from '../scene/PrinterRoomScene';
import { PrinterInfoDrawer } from './PrinterInfoDrawer';
import { PrinterRoomOverlay } from './PrinterRoomOverlay';

export interface PrinterRoom3DProps {
  printers: Printer[];
  electricityRate?: number;
  currency?: string;
  onEditPrinter: (printer: Printer) => void;
  onDeletePrinter: (printer: Printer) => void;
  onAddPrinter?: () => void;
}

export function PrinterRoom3D({
  printers,
  electricityRate = 0,
  currency = '₽',
  onEditPrinter,
  onDeletePrinter,
  onAddPrinter,
}: PrinterRoom3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PrinterRoomScene | null>(null);

  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [, setHoveredPrinter] = useState<Printer | null>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // Check WebGL availability
  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        setWebGlSupported(false);
      }
    } catch {
      setWebGlSupported(false);
    }
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!webGlSupported) return;
    if (!containerRef.current || !canvasRef.current) return;

    const scene = new PrinterRoomScene({
      canvas: canvasRef.current,
      container: containerRef.current,
      printers,
      onSelectPrinter: (printer) => {
        setSelectedPrinter(printer);
      },
      onHoverPrinter: (printer) => {
        setHoveredPrinter(printer);
      },
    });

    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [webGlSupported]); // Only run on mount / WebGL ready

  // Update printers reactively when list changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updatePrinters(printers);
      // If the selected printer was deleted, clear selection
      if (selectedPrinter && !printers.some((p) => p.id === selectedPrinter.id)) {
        setSelectedPrinter(null);
      }
    }
  }, [printers]);

  // Handle Escape key to reset focus
  const handleResetFocus = useCallback(() => {
    setSelectedPrinter(null);
    sceneRef.current?.resetFocus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleResetFocus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResetFocus]);

  if (!webGlSupported) {
    return (
      <div className="w-full h-[540px] rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col items-center justify-center p-6 text-center text-neutral-300">
        <AlertCircle size={36} className="text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-white">Аппаратное 3D-ускорение недоступно</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          Ваш браузер или видеокарта временно не поддерживают WebGL. Вы можете переключиться в режим таблицы или карточек.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[580px] sm:h-[640px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0e0e12] via-[#121216] to-[#0a0a0d] border border-white/10 select-none shadow-2xl"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block outline-none cursor-default"
      />

      {/* Floating HUD overlay */}
      <PrinterRoomOverlay
        printersCount={printers.length}
        hasSelection={Boolean(selectedPrinter)}
        onResetFocus={handleResetFocus}
      />

      {/* Slide-out detail drawer */}
      <PrinterInfoDrawer
        printer={selectedPrinter}
        electricityRate={electricityRate}
        currency={currency}
        onClose={handleResetFocus}
        onEdit={(printer) => {
          onEditPrinter(printer);
        }}
        onDelete={(printer) => {
          onDeletePrinter(printer);
        }}
      />

      {/* Empty room CTA when 0 printers added */}
      {printers.length === 0 && onAddPrinter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-10">
          <div className="pointer-events-auto p-6 rounded-2xl bg-neutral-900/85 backdrop-blur-md border border-white/10 shadow-2xl max-w-sm flex flex-col items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Plus size={20} />
            </span>
            <div className="text-center">
              <h4 className="font-semibold text-sm text-white">Мастерская пуста</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Добавьте первый 3D-принтер, чтобы он появился в вашей 3D-комнате.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddPrinter}
              className="mt-1 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Добавить 3D-принтер
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
