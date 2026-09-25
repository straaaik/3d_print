'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Edit3, RotateCcw, RotateCw } from 'lucide-react';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { useAuth } from '../../entities/model/AuthProvider';
import { useData } from '../../entities/model/DataProvider';
import { useWorkshop } from './useWorkshop';
import { WorkshopCanvas } from './WorkshopCanvas';
import {
  createFurniture,
  placeEntity,
  removeFurniture,
  createRoomFromTiles,
  resizeRoom,
  removeRoom,
  resetWorkshop,
  resizeFurnitureOnGrid,
  defaultRoomLabels,
  updateRoomLabels,
  updateRoomLabel,
  deleteRoomLabel,
  syncWorkshopPlacements,
  uid,
  updateFurniture,
  pushWorkshopHistory,
  undoWorkshopHistory,
  redoWorkshopHistory,
  type FurnitureKind,
  type ModelKey,
  type Room,
  type RoomLabel,
  type Workshop,
} from './model';
import type { Filament, Printer } from '../../shared/types';

export default function WorkshopPage() {
  const { currentUser } = useAuth();
  return currentUser ? <Workspace key={currentUser.id} userId={currentUser.id} /> : null;
}

function Workspace({ userId }: { userId: string }) {
  const { printers, filaments, orders = [], savedCalculations = [], isLoading } = useData();
  const { layout, change, save, status, busy, conflict, resolveConflict } = useWorkshop(userId);
  const [activeRoom, setActiveRoom] = usePersistentState('3d_workshop_active_room', '');
  const [edit, setEdit] = useState(false);
  const baselineLayout = useRef<Workshop | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const grid = 0.25;
  const [selection, setSelection] = useState<{ id: string; kind: 'furniture' | 'placement' } | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const cameraViews = useRef(new Map<string, NonNullable<Room['camera']>>());
  const undoStack = useRef<Workshop[]>([]);
  const redoStack = useRef<Workshop[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const hasUnsavedChanges = useMemo(() => {
    if (!edit || !baselineLayout.current || !layout) return false;
    return JSON.stringify(layout) !== JSON.stringify(baselineLayout.current);
  }, [edit, layout]);

  useEffect(() => {
    if (!activeRoom && layout?.rooms[0]?.id) {
      setActiveRoom(layout.rooms[0].id);
    }
  }, [activeRoom, layout, setActiveRoom]);

  // Вычисление активных 3D-принтеров (заказы в статусе 'Печать')
  const activePrinterIds = useMemo(() => {
    const ids = new Set<string>();
    const printingOrders = (orders || []).filter((o) => o.status === 'Печать');
    for (const order of printingOrders) {
      if (order.product_id) {
        const calc = (savedCalculations || []).find((c) => c.id === order.product_id);
        if (calc?.printer_id) ids.add(calc.printer_id);
      }
      for (const p of printers) {
        if (
          (order.notes && order.notes.includes(p.name)) ||
          (order.title && order.title.includes(p.name))
        ) {
          ids.add(p.id);
        }
      }
    }
    return ids;
  }, [orders, savedCalculations, printers]);

  useEffect(() => {
    if (!layout || isLoading) return;
    const synced = syncWorkshopPlacements(layout, printers, filaments);
    if (synced !== layout) {
      change(synced);
    }
  }, [layout, printers, filaments, isLoading, change]);

  function handleUndo() {
    const cur = layoutRef.current;
    if (!cur || undoStack.current.length === 0) return;
    const prev = undoWorkshopHistory({ undoStack: undoStack.current, redoStack: redoStack.current }, cur);
    if (prev) {
      change(prev);
      setCanUndo(undoStack.current.length > 0);
      setCanRedo(true);
    }
  }

  function handleRedo() {
    const cur = layoutRef.current;
    if (!cur || redoStack.current.length === 0) return;
    const next = redoWorkshopHistory({ undoStack: undoStack.current, redoStack: redoStack.current }, cur);
    if (next) {
      change(next);
      setCanUndo(true);
      setCanRedo(redoStack.current.length > 0);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) ||
        (typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement) ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        Boolean(target?.isContentEditable);
      if (isInput) return;

      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      const code = e.code;
      const isZ = key === 'z' || key === 'я' || code === 'KeyZ';
      const isY = key === 'y' || key === 'н' || code === 'KeyY';

      if (isZ && !e.shiftKey) {
        if (undoStack.current.length > 0) {
          if (e.cancelable) e.preventDefault();
          handleUndo();
        }
      } else if ((isZ && e.shiftKey) || isY) {
        if (redoStack.current.length > 0) {
          if (e.cancelable) e.preventDefault();
          handleRedo();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!layout || isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans">
        <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-[1540px] space-y-5">
          <div className="flex justify-center">
            <MainNavbar activeTab="workshop" />
          </div>
          <div className="relative rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden font-mono">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-neutral-900/60 text-xs select-none">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-4 w-px bg-white/15" />
                <span className="font-bold tracking-wider text-neutral-200">3D-LABS // МАСТЕРСКАЯ</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
                ЗАГРУЗКА
              </span>
            </div>
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 p-12 text-center text-neutral-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-xs font-mono text-neutral-300">Инициализация 3D-пространства мастерской…</p>
            </div>
            <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500 select-none">
              <span>DATABASE: SUPABASE CLOUD</span>
              <span>CONNECTING…</span>
            </div>
          </div>
        </main>
        <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>3D LABS · WORKSHOP RUNTIME v2.4</span>
            <span>ИНТЕРАКТИВНОЕ 3D-ПРОСТРАНСТВО МАСТЕРСКОЙ</span>
          </div>
        </footer>
      </div>
    );
  }

  const currentActiveRoom = activeRoom || (layout.rooms[0]?.id ?? '');
  const room = layout.rooms.find((r) => r.id === currentActiveRoom) ?? layout.rooms[0];

  function commit(next: Workshop) {
    if (layout) {
      pushWorkshopHistory({ undoStack: undoStack.current, redoStack: redoStack.current }, layout);
      setCanUndo(true);
      setCanRedo(false);
    }
    change({
      ...next,
      rooms: next.rooms.map((r) => (cameraViews.current.has(r.id) ? { ...r, camera: cameraViews.current.get(r.id) } : r)),
    });
  }

  function attempt(action: () => void) {
    try {
      action();
    } catch (error) {
      console.error('Workshop action failed:', error);
    }
  }

  function select(id: string, kind: 'furniture' | 'placement') {
    if (!id) {
      setSelection(null);
      return;
    }
    setSelection({ id, kind });
    const furnitureId =
      kind === 'furniture'
        ? id
        : layout!.slots.find((slot) => slot.id === layout!.placements.find((item) => item.id === id)?.slotId)?.furnitureId;
    const owner = layout!.furniture.find((item) => item.id === furnitureId);
    if (owner && owner.roomId !== currentActiveRoom) {
      setActiveRoom(owner.roomId);
    }
    setSelectedLabel(null);
  }

  function handleToggleEdit() {
    if (edit) {
      if (hasUnsavedChanges) {
        setShowUnsavedModal(true);
      } else {
        setEdit(false);
        setSelection(null);
        setSelectedLabel(null);
        undoStack.current = [];
        redoStack.current = [];
        setCanUndo(false);
        setCanRedo(false);
      }
    } else {
      baselineLayout.current = JSON.parse(JSON.stringify(layout));
      setEdit(true);
    }
  }

  function handleRequestExitEdit() {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      setEdit(false);
      setSelection(null);
      setSelectedLabel(null);
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
    }
  }

  function handleSaveAndExit() {
    if (!layout) return;
    const withCameras: Workshop = {
      ...layout,
      rooms: layout.rooms.map((r) => (cameraViews.current.has(r.id) ? { ...r, camera: cameraViews.current.get(r.id) } : r)),
    };
    change(withCameras);
    void save();
    baselineLayout.current = JSON.parse(JSON.stringify(withCameras));
    setShowUnsavedModal(false);
    setEdit(false);
    setSelection(null);
    setSelectedLabel(null);
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }

  function handleDiscardAndExit() {
    if (baselineLayout.current) {
      change(baselineLayout.current);
    }
    setShowUnsavedModal(false);
    setEdit(false);
    setSelection(null);
    setSelectedLabel(null);
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }

  function handleRotate(id: string, rotation: number) {
    attempt(() => {
      const f = layout!.furniture.find((item) => item.id === id);
      if (!f) return;
      const next = { ...f, rotation };
      commit(updateFurniture(layout!, next));
      select(id, 'furniture');
    });
  }

  function handleDelete(id: string, kind: 'furniture' | 'placement') {
    if (kind === 'furniture') {
      commit(removeFurniture(layout!, id));
      select('', 'furniture');
    } else {
      commit({ ...layout!, placements: layout!.placements.filter((p) => p.id !== id) });
      select('', 'furniture');
    }
  }

  function handleModelChange(placementId: string, model: ModelKey) {
    commit({
      ...layout!,
      placements: layout!.placements.map((p) => (p.id === placementId ? { ...p, model } : p)),
    });
  }

  function handleMovePlacement(placementId: string, targetSlotId: string) {
    if (!layout) return;
    const placement = layout.placements.find((p) => p.id === placementId);
    if (!placement || placement.slotId === targetSlotId) return;

    const targetSlot = layout.slots.find((s) => s.id === targetSlotId);
    if (!targetSlot) return;

    const existingPlacement = layout.placements.find((p) => p.slotId === targetSlotId);
    if (existingPlacement) {
      // Swap placements
      const currentSlotId = placement.slotId;
      const nextPlacements = layout.placements.map((p) => {
        if (p.id === placement.id) return { ...p, slotId: targetSlotId };
        if (p.id === existingPlacement.id) return { ...p, slotId: currentSlotId };
        return p;
      });
      commit({ ...layout, placements: nextPlacements });
      select(placement.id, 'placement');
    } else {
      const nextPlacements = layout.placements.map((p) =>
        p.id === placement.id ? { ...p, slotId: targetSlotId } : p
      );
      commit({ ...layout, placements: nextPlacements });
      select(placement.id, 'placement');
    }
  }

  function switchRoom(id: string) {
    setActiveRoom(id);
    setSelection(null);
    setSelectedLabel(null);
  }


  function handleCreateRoomFromTiles(tiles: Array<[number, number]>) {
    if(!edit)return;
    attempt(()=>{
      const next=createRoomFromTiles(layout!,tiles);
      commit(next);
      const newRoom = next.rooms.at(-1);
      if(newRoom){
        switchRoom(newRoom.id);
      }
    });
  }

  function handleSaveRoom(next: Room) {
    if(!layout) return;
    attempt(() => {
      if(!next.name.trim()||next.name.length>80)throw new Error('Название комнаты: от 1 до 80 символов.');
      commit({
        ...layout,
        rooms: layout.rooms.map((r) => (r.id === next.id ? { ...r, name: next.name.trim() } : r)),
      });
    });
  }

  function handleResizeRoom(id:string,width:number,depth:number){
    if(!edit)return;
    attempt(()=>commit(resizeRoom(layout!,id,width,depth)));
  }

  function handleCreateFurniture(roomId:string,kind:FurnitureKind,x:number,z:number,width:number,depth:number){
    if(!edit)return;
    attempt(()=>{
      const f=createFurniture(roomId,kind);
      const isLengthOnly = ['table', 'printer_rack', 'filament_rack'].includes(kind);
      const targetDepth = isLengthOnly ? f.depth : depth;
      const decor=['plant','boxes','cabinet'].includes(kind);
      const columns=decor?0:Math.min(16,Math.max(1,Math.floor(width/(kind==='filament_rack'?.16:.6))));
      commit(updateFurniture(layout!,{...f,x,z,width,depth:targetDepth,columns}));
      setActiveRoom(roomId);select(f.id,'furniture');
    });
  }

  function handleResizeFurniture(id:string,width:number,depth:number){
    if(!edit)return;
    attempt(()=>{
      const f = layout?.furniture.find((item) => item.id === id);
      const isLengthOnly = f && ['table', 'printer_rack', 'filament_rack'].includes(f.kind);
      const targetDepth = isLengthOnly ? f.depth : depth;
      commit(resizeFurnitureOnGrid(layout!,id,width,targetDepth));
    });
  }

  function handleLabelSelect(roomId:string,labelId:string){
    if(!edit)return;
    setActiveRoom(roomId);setSelection(null);setSelectedLabel(labelId);
  }

  function handlePlaceLabel(
    roomId: string,
    surface: RoomLabel['surface'],
    u: number,
    v: number,
    text?: string,
    color?: string
  ) {
    if (!edit) return;
    attempt(() => {
      const target = layout!.rooms.find((r) => r.id === roomId)!;
      const label: RoomLabel = {
        id: uid(),
        text: text && text.trim() ? text.trim() : 'Новая надпись',
        color: color || '#dde1e7',
        surface,
        u,
        v,
        size: 0.35,
        rotation: 0,
      };
      commit(updateRoomLabels(layout!, roomId, [...defaultRoomLabels(target), label]));
      handleLabelSelect(roomId, label.id);
    });
  }

  function handleMoveLabel(roomId: string, labelId: string, u: number, v: number) {
    if (!edit) return;
    attempt(() => {
      commit(updateRoomLabel(layout!, roomId, labelId, { u, v }));
    });
  }

  function handleUpdateLabel(roomId: string, labelId: string, patch: Partial<RoomLabel>) {
    if (!edit) return;
    attempt(() => {
      commit(updateRoomLabel(layout!, roomId, labelId, patch));
    });
  }

  function handleSaveLabel(label: RoomLabel) {
    if (!edit || !layout) return;
    const targetRoom = layout.rooms.find((r) =>
      (r.labels ?? defaultRoomLabels(r)).some((item) => item.id === label.id)
    ) ?? room;
    if (!targetRoom) return;
    attempt(() =>
      commit(
        updateRoomLabels(
          layout!,
          targetRoom.id,
          defaultRoomLabels(targetRoom).map((item) => (item.id === label.id ? label : item))
        )
      )
    );
  }

  function handleDeleteLabel() {
    if (!edit || !selectedLabel || !layout) return;
    const targetRoom = layout.rooms.find((r) =>
      (r.labels ?? defaultRoomLabels(r)).some((item) => item.id === selectedLabel)
    ) ?? room;
    if (!targetRoom) return;
    handleDeleteRoomLabel(targetRoom.id, selectedLabel);
  }

  function handleDeleteRoomLabel(roomId: string, labelId: string) {
    if (!edit || !layout) return;
    attempt(() => {
      commit(deleteRoomLabel(layout, roomId, labelId));
      if (selectedLabel === labelId) setSelectedLabel(null);
    });
  }

  function handleDeleteRoom(roomId: string) {
    if (!edit) return;
    attempt(() => {
      if (layout!.rooms.length <= 1) {
        handleResetWorkshop();
        return;
      }
      const next = removeRoom(layout!, roomId, true);
      commit(next);
      setActiveRoom(next.rooms[0]?.id ?? '');
      setSelection(null);
      setSelectedLabel(null);
    });
  }

  function handleResetWorkshop() {
    attempt(() => {
      const next = resetWorkshop();
      commit(next);
      setActiveRoom(next.rooms[0]?.id ?? '');
      setSelection(null);
      setSelectedLabel(null);
      cameraViews.current.clear();
    });
  }

  function search(id: string) {
    const found = layout!.placements.find((p) => p.kind === 'printer' && p.entityId === id);
    if (found) {
      const slot = layout!.slots.find((s) => s.id === found.slotId);
      const f = layout!.furniture.find((item) => item.id === slot?.furnitureId);
      if (f && f.roomId !== currentActiveRoom) setActiveRoom(f.roomId);
      select(found.id, 'placement');
      setFocusToken((n) => n + 1);
    }
  }

  function handlePlacePrinter(printer: Printer) {
    if (!room || !layout) return;
    const occupied = new Set(layout.placements.map((p) => p.slotId));
    const freeSlot = layout.slots.find(
      (s) =>
        s.kind === 'printer' &&
        !occupied.has(s.id) &&
        layout!.furniture.some((f) => f.id === s.furnitureId && f.roomId === room.id)
    );
    if (!freeSlot) {
      return;
    }
    const model = printer.model_3d ?? (/(p1|p1s|p1p|x1)/i.test(printer.name) ? 'p1' : 'a1');
    const next = placeEntity(layout, 'printer', printer.id, freeSlot.id, model);
    commit(next);
    const p = next.placements.find((x) => x.kind === 'printer' && x.entityId === printer.id);
    if (p) select(p.id, 'placement');
  }

  function handlePlaceFilament(filament: Filament) {
    if (!room || !layout) return;
    const occupied = new Set(layout.placements.map((p) => p.slotId));
    const freeSlot = layout.slots.find(
      (s) =>
        s.kind === 'filament' &&
        !occupied.has(s.id) &&
        layout!.furniture.some((f) => f.id === s.furnitureId && f.roomId === room.id)
    );
    if (!freeSlot) {
      return;
    }
    const next = placeEntity(layout, 'filament', filament.id, freeSlot.id, 'a1');
    commit(next);
    const p = next.placements.find((x) => x.kind === 'filament' && x.entityId === filament.id);
    if (p) select(p.id, 'placement');
  }

  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans">
      <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-[1540px] space-y-5">
        {/* Верхняя навигация */}
        <div className="flex justify-center">
          <MainNavbar activeTab="workshop" />
        </div>

        {/* Meridian Cockpit Container */}
        <section className="relative rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden font-mono">
          {/* 1. Верхняя панель (Topbar): Терминальные точки + Заголовок + Режимы + Сохранение */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/60 px-4 sm:px-5 py-3 font-mono text-xs select-none">
            <div className="flex items-center gap-3">
              {/* Терминальные индикаторы */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-4 w-px bg-white/15" />
              <h1 className="font-bold tracking-wider text-neutral-200 uppercase">
                3D-LABS // МАСТЕРСКАЯ
              </h1>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ONLINE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CockpitButton
                icon={RotateCcw}
                disabled={!canUndo}
                onClick={handleUndo}
                title="Отменить действие (Ctrl+Z)"
                tooltipShortcut="Ctrl+Z"
              >
                Отменить
              </CockpitButton>
              <CockpitButton
                icon={RotateCw}
                disabled={!canRedo}
                onClick={handleRedo}
                title="Повторить действие (Ctrl+Y)"
                tooltipShortcut="Ctrl+Y"
              >
                Повторить
              </CockpitButton>
              <CockpitButton
                isActive={edit}
                icon={Edit3}
                onClick={handleToggleEdit}
                title={edit ? 'Выйти из режима редактирования' : 'Режим редактирования расстановки оборудования и мебели'}
              >
                Редактировать
              </CockpitButton>
            </div>
          </div>

          {/* 2. Подпанель управления комнатами и поиска */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.015] px-4 sm:px-5 py-3 text-xs">
            <div className="min-w-52 flex-1">
              <CockpitDropdown
                ariaLabel="Найти принтер"
                searchable
                placeholder="Найти принтер в мастерской..."
                value=""
                options={printers.map((p) => ({
                  value: p.id,
                  label: p.name,
                  subtext: layout.placements.some((x) => x.kind === 'printer' && x.entityId === p.id)
                    ? 'Размещён'
                    : 'Не размещён',
                }))}
                onChange={search}
              />
            </div>
          </div>

          {/* 3. Рабочая область: 3D Сцена */}
          <div className="relative w-full touch-none select-none overscroll-none">
            {conflict && (
              <div className="absolute top-4 right-4 z-30 max-w-sm space-y-2 rounded-xl border border-white/20 bg-neutral-950/95 p-4 text-xs font-mono shadow-2xl backdrop-blur-md">
                <p>Облачная планировка изменилась. Выберите копию:</p>
                <div className="flex gap-2">
                  <CockpitButton
                    onClick={() => {
                      cameraViews.current.clear();
                      void resolveConflict('cloud');
                    }}
                  >
                    Загрузить облачную
                  </CockpitButton>
                  <CockpitButton onClick={() => void resolveConflict('local')}>
                    Оставить локальную
                  </CockpitButton>
                </div>
              </div>
            )}

            {room ? (
              <WorkshopCanvas
                layout={layout}
                room={room}
                filaments={filaments}
                printers={printers}
                edit={edit}
                grid={grid}
                selected={selection?.id ?? null}
                focusToken={focusToken}
                onSelect={select}
                onMove={(id, x, z, targetRoomId) =>
                  attempt(() => {
                    const f = layout.furniture.find((item) => item.id === id)!;
                    const nextRoomId = targetRoomId ?? f.roomId;
                    commit(updateFurniture(layout, { ...f, roomId: nextRoomId, x, z }));
                    if (nextRoomId !== activeRoom) {
                      setActiveRoom(nextRoomId);
                    }
                    select(id, 'furniture');
                  })
                }
                onMovePlacement={handleMovePlacement}
                onRotate={handleRotate}
                onDelete={handleDelete}
                onModelChange={handleModelChange}
                onRoomSelect={switchRoom}
                onCreateRoomFromTiles={handleCreateRoomFromTiles}
                onResizeRoom={handleResizeRoom}
                onDeleteRoom={handleDeleteRoom}
                onCreateFurniture={handleCreateFurniture}
                onResizeFurniture={handleResizeFurniture}
                onLabelSelect={handleLabelSelect}
                onMoveLabel={handleMoveLabel}
                onUpdateLabel={handleUpdateLabel}
                onDeleteRoomLabel={handleDeleteRoomLabel}
                onPlaceLabel={handlePlaceLabel}
                selectedLabel={
                  selectedLabel
                    ? layout.rooms.flatMap((r) => defaultRoomLabels(r)).find((label) => label.id === selectedLabel)
                    : undefined
                }
                onSaveRoom={handleSaveRoom}
                onSaveLabel={handleSaveLabel}
                onDeleteLabel={handleDeleteLabel}
                onCloseSpatialEditor={() => setSelectedLabel(null)}
                onResetWorkshop={handleResetWorkshop}
                onPlacePrinter={handlePlacePrinter}
                onPlaceFilament={handlePlaceFilament}
                onCamera={(camera) => {
                  cameraViews.current.set(room.id, camera);
                  change({
                    ...layout,
                    rooms: layout.rooms.map((r) => (r.id === room.id ? { ...r, camera } : r)),
                  });
                }}
                onSave={handleSaveAndExit}
                saving={busy}
                hasUnsavedChanges={hasUnsavedChanges}
                onExitEdit={handleRequestExitEdit}
                activePrinterIds={activePrinterIds}
              />
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center gap-4 text-neutral-400 font-mono">
                <p>{edit?'Создайте первую комнату, затем измените её размеры маркером в 3D.':'Включите редактирование, чтобы создать первую комнату.'}</p>
                {edit&&<CockpitButton onClick={()=>{
                  const first:Room={id:uid(),name:'Основная мастерская',width:4,depth:4,labels:[]};
                  commit({...layout,rooms:[first]});switchRoom(first.id);
                }}>Создать первую комнату</CockpitButton>}
              </div>
            )}
          </div>

          {/* 4. Нижняя панель телеметрии (Statusbar) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 sm:px-5 py-2.5 font-mono text-[10px] text-neutral-500 select-none bg-neutral-950">
            <div className="flex items-center gap-3">
              <span>DATABASE: SUPABASE CLOUD • CACHE: LOCALSTORAGE</span>
              <span className="text-neutral-700">|</span>
              <span role="status">{status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{layout.placements.filter((p) => p.kind === 'printer').length} ПРИНТЕРОВ</span>
              <span className="text-neutral-700">•</span>
              <span>{layout.placements.filter((p) => p.kind === 'filament').length} КАТУШЕК</span>
              <span className="text-neutral-700">|</span>
              <span>RUNTIME READY</span>
            </div>
          </div>

          {/* Модальное окно подтверждения при выходе с несохранёнными изменениями */}
          <CockpitModal
            isOpen={showUnsavedModal}
            onClose={() => setShowUnsavedModal(false)}
            title="Несохранённые изменения"
            subtitle="Редактор мастерской"
            stamp="ВНИМАНИЕ"
            maxWidth="md"
            footer={
              <div className="flex flex-wrap items-center justify-end gap-2 w-full font-mono text-xs">
                <CockpitButton onClick={() => setShowUnsavedModal(false)}>
                  Отмена
                </CockpitButton>
                <button
                  type="button"
                  onClick={handleDiscardAndExit}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-rose-300 hover:bg-rose-900/50 hover:text-rose-100 active:scale-95 transition-all"
                >
                  Выйти без сохранения
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndExit}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/80 hover:bg-emerald-600 px-3.5 py-1.5 text-white font-semibold active:scale-95 transition-all shadow-md shadow-emerald-950"
                >
                  Сохранить и выйти
                </button>
              </div>
            }
          >
            <div className="space-y-3 font-mono text-xs text-neutral-300 leading-relaxed py-2">
              <p>
                В мастерскую были внесены изменения (расстановка оборудования, комнат или надписей), которые пока не были сохранены.
              </p>
              <p className="text-neutral-400">
                При выходе без сохранения все изменения этой сессии редактирования будут отменены и возвращены к исходному состоянию.
              </p>
            </div>
          </CockpitModal>
        </section>

      </main>

      {/* Глобальный подвал */}
      <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>3D LABS · WORKSHOP RUNTIME v2.4</span>
          <span>ИНТЕРАКТИВНОЕ 3D-ПРОСТРАНСТВО МАСТЕРСКОЙ</span>
        </div>
      </footer>
    </div>
  );
}
