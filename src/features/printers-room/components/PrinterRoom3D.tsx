'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import type { Printer } from '../../../shared/types';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
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
export function PrinterRoom3D({ printers, electricityRate = 0, currency = '₽', onEditPrinter, onDeletePrinter, onAddPrinter }: PrinterRoom3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PrinterRoomScene | null>(null);
  const latestPrinters = useRef(printers);
  const cameraMode = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Printer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [topView, setTopView] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const selected = printers.find(p => p.id === selectedId) ?? null;

  useEffect(() => { latestPrinters.current = printers; sceneRef.current?.updatePrinters(printers); }, [printers]);
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const scene = new PrinterRoomScene({ canvas: canvasRef.current, container: containerRef.current,
      printers: latestPrinters.current, onSelectPrinter: printer => setSelectedId(printer?.id ?? null), onHoverPrinter: setHovered,
      onReady: () => setReady(true), onError: setError });
    sceneRef.current = scene;
    scene.setTopView(cameraMode.current);
    return () => { scene.dispose(); sceneRef.current = null; };
  }, [retry, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  const reset = useCallback(() => sceneRef.current?.resetFocus(), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { reset(); setExpanded(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reset]);

  const content = (
    <div className={expanded ? 'fixed inset-3 z-50 bg-[#10171d] rounded-xl border border-white/15 shadow-2xl' : 'relative'}>
      <div ref={containerRef} className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#10171d] ${expanded ? 'h-full' : 'h-[560px] sm:h-[700px]'}`}>
        <canvas ref={canvasRef} aria-label="Интерактивная 3D-комната принтеров" className="block h-full w-full touch-none outline-none" />
        {ready && !error && <>
          <PrinterRoomOverlay printersCount={printers.length} printers={printers} selectedId={selectedId ?? undefined} hasSelection={Boolean(selected)}
            topView={topView} onTopView={top => { cameraMode.current = top; setTopView(top); sceneRef.current?.setTopView(top); }}
            onResetFocus={reset} onZoomIn={() => sceneRef.current?.zoomIn()} onZoomOut={() => sceneRef.current?.zoomOut()}
            onSelect={id => sceneRef.current?.selectPrinterById(id)} onFullscreen={() => setExpanded(value => !value)} />
          <div className="pointer-events-none absolute top-24 left-3 sm:left-5 max-w-64 text-[10px] font-mono text-neutral-400">
            Визуальная модель: Bambu Lab A1
          </div>
          {hovered && !selected && <div className="pointer-events-none absolute top-32 left-3 sm:left-5 rounded-lg border border-white/15 bg-[#111a22]/95 px-3 py-2 text-xs text-neutral-100">
            {hovered.name}<span className="block mt-1 text-[10px] text-neutral-400">Нажмите, чтобы открыть</span>
          </div>}
        </>}
        {(!ready || error) && <div className="absolute inset-0 flex items-center justify-center bg-[#10171d]/90 p-6 text-center">
          <div className="max-w-sm space-y-3 text-sm text-neutral-300" role={error ? 'alert' : 'status'}>
            {error ? <><AlertCircle className="mx-auto text-amber-400" /><p>{error}</p><CockpitButton className="mx-auto" onClick={() => {
              setError(null); setReady(false); setRetry(value => value + 1);
            }}>Повторить</CockpitButton></> : <p>Собираем мастерскую…</p>}
          </div>
        </div>}
        <PrinterInfoDrawer printer={selected} electricityRate={electricityRate} currency={currency} onClose={reset} onEdit={onEditPrinter} onDelete={onDeletePrinter} />
        {ready && !error && printers.length === 0 && <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-xs rounded-xl border border-white/15 bg-[#151e25]/95 p-5 text-center backdrop-blur-md">
            <h4 className="text-sm text-neutral-100">Мастерская пуста</h4><p className="mt-2 text-xs text-neutral-400">Добавьте принтер — стол и комната подстроятся автоматически.</p>
            {onAddPrinter && <CockpitButton onClick={onAddPrinter} className="mx-auto mt-4">Добавить принтер</CockpitButton>}
          </div>
        </div>}
      </div>
    </div>
  );
  return expanded ? createPortal(content, document.body) : content;
}
