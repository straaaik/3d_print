'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, RotateCw, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, X, Save, Eye, ZoomIn, ZoomOut, Type, MousePointer2, Plus, Paintbrush, Eraser, Check, Pencil, Trash2 } from 'lucide-react';
import type { WorkshopScene, HoverPlacementInfo } from './WorkshopScene';
import type { FurnitureKind, ModelKey, Room, RoomLabel, Workshop } from './model';
import type { Filament, Printer } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDeleteModal } from '../../shared/ui/CockpitDeleteModal';
import { WorkshopInspectionMenu } from './WorkshopInspectionMenu';
import { WorkshopAddCatalog } from './WorkshopAddCatalog';
import { SpatialProperties } from './SpatialProperties';

interface Props {
  layout: Workshop;
  room: Room;
  filaments: Filament[];
  printers: Printer[];
  edit: boolean;
  grid: number;
  selected: string | null;
  focusToken: number;
  onSelect: (id: string, kind: 'furniture' | 'placement') => void;
  onMove: (id: string, x: number, z: number, roomId?: string) => void;
  onMovePlacement?: (placementId: string, targetSlotId: string) => void;
  onRotate?: (id: string, rotation: number) => void;
  onDelete?: (id: string, kind: 'furniture' | 'placement') => void;
  onModelChange?: (placementId: string, model: ModelKey) => void;
  onRoomSelect: (id:string) => void;
  onCreateRoomFromTiles?: (tiles: Array<[number, number]>) => void;
  onResizeRoom: (id:string,width:number,depth:number) => void;
  onDeleteRoom?: (id:string) => void;
  onCreateFurniture: (roomId:string,kind:FurnitureKind,x:number,z:number,width:number,depth:number) => void;
  onResizeFurniture: (id:string,width:number,depth:number) => void;
  onLabelSelect: (roomId:string,labelId:string) => void;
  onMoveLabel?: (roomId:string,labelId:string,u:number,v:number) => void;
  onUpdateLabel?: (roomId:string,labelId:string,patch:Partial<RoomLabel>) => void;
  onDeleteRoomLabel?: (roomId:string,labelId:string) => void;
  onPlaceLabel: (roomId:string,surface:RoomLabel['surface'],u:number,v:number,text?:string,color?:string) => void;
  selectedLabel?: RoomLabel;
  roomEditorOpen?: boolean;
  onSaveRoom: (room:Room) => void;
  onSaveLabel: (label:RoomLabel) => void;
  onDeleteLabel: () => void;
  onCloseSpatialEditor: () => void;
  onResetWorkshop?: () => void;
  onPlacePrinter?: (printer: Printer) => void;
  onPlaceFilament?: (filament: Filament) => void;
  onCamera: (camera: NonNullable<Room['camera']>) => void;
  onSave?: () => void;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  onExitEdit?: () => void;
  activePrinterIds?: Set<string>;
  onToggleActivePrinter?: (printerId: string) => void;
}

export function WorkshopCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<WorkshopScene | null>(null),
    latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const [status, setStatus] = useState('Загрузка 3D-сцены…');
  const [hoverPlacement, setHoverPlacement] = useState<HoverPlacementInfo | null>(null);
  const [authoringHint,setAuthoringHint]=useState<string|null>(null);
  const [showControls,setShowControls]=useState(false);
  const [gridBuilderActive, setGridBuilderActive] = useState(false);
  const [gridBuilderTool, setGridBuilderTool] = useState<'brush' | 'eraser'>('brush');
  const [gridTileCount, setGridTileCount] = useState(0);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [roomName, setRoomName] = useState(props.room.name);
  useEffect(() => {
    setRoomName(props.room.name);
  }, [props.room.id, props.room.name]);
  const [isDeleteRoomConfirmOpen, setIsDeleteRoomConfirmOpen] = useState(false);
  const top = props.room.camera?.top ?? false;

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      props.onResetWorkshop?.();
      setIsResetConfirmOpen(false);
    } finally {
      setIsResetting(false);
    }
  };

  const handleStartGridBuilder = () => {
    setGridBuilderActive(true);
    setGridBuilderTool('brush');
    setGridTileCount(0);
    scene.current?.startGridRoomBuilder('brush', (count) => {
      setGridTileCount(count);
    });
  };

  const handleToolChange = (tool: 'brush' | 'eraser') => {
    setGridBuilderTool(tool);
    scene.current?.setGridRoomBuilderTool(tool);
  };

  const handleCancelGridBuilder = () => {
    setGridBuilderActive(false);
    setGridTileCount(0);
    scene.current?.cancelGridRoomBuilder();
  };

  const handleCreateRoomFromTiles = () => {
    const tiles = scene.current?.finishGridRoomBuilder();
    setGridBuilderActive(false);
    setGridTileCount(0);
    if (!tiles || tiles.length === 0) return;
    props.onCreateRoomFromTiles?.(tiles);
  };

  useEffect(() => {
    if (!gridBuilderActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelGridBuilder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridBuilderActive]);

  useEffect(() => {
    if (!props.edit && gridBuilderActive) {
      handleCancelGridBuilder();
    }
  }, [props.edit, gridBuilderActive]);

  useEffect(() => {
    let cancelled = false;
    void import('./WorkshopScene').then(({ WorkshopScene }) => {
      if (cancelled || !canvas.current || !container.current) return;
      try {
        const instance = new WorkshopScene({
          canvas: canvas.current,
          container: container.current,
          onSelect: (...args) => latest.current.onSelect(...args),
          onMove: (...args) => latest.current.onMove(...args),
          onMovePlacement: (pId, sId) => latest.current.onMovePlacement?.(pId, sId),
          onModelChange: (pId, model) => latest.current.onModelChange?.(pId, model),
          onRotate: (id, rot) => latest.current.onRotate?.(id, rot),
          onDelete: (id, kind) => latest.current.onDelete?.(id, kind),
          onRoomSelect: id=>latest.current.onRoomSelect(id),
          onResizeRoom: (...args)=>latest.current.onResizeRoom(...args),
          onDeleteRoom: (id)=>latest.current.onDeleteRoom?.(id),
          onCreateFurniture: (...args)=>latest.current.onCreateFurniture(...args),
          onResizeFurniture: (...args)=>latest.current.onResizeFurniture(...args),
          onLabelSelect: (...args)=>latest.current.onLabelSelect(...args),
          onMoveLabel: (...args)=>latest.current.onMoveLabel?.(...args),
          onUpdateLabel: (...args)=>latest.current.onUpdateLabel?.(...args),
          onDeleteLabel: (roomId, labelId)=>latest.current.onDeleteRoomLabel?.(roomId, labelId),
          onPlaceLabel: (...args)=>latest.current.onPlaceLabel(...args),
          onAuthoringHint: setAuthoringHint,
          onCamera: (c) => latest.current.onCamera(c),
          onReady: () => setStatus(''),
          onError: setStatus,
          onHoverPlacement: setHoverPlacement,
        });
        scene.current = instance;
        const p = latest.current;
        instance.setInvertControls(false);
        instance.update(p.layout, p.room, p.filaments, p.printers, p.activePrinterIds);
        instance.setEdit(p.edit, p.grid);
      } catch {
        setStatus('WebGL недоступен. Планировка и списки остаются доступны.');
      }
    });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.update(props.layout, props.room, props.filaments, props.printers, props.activePrinterIds);
  }, [props.layout, props.room, props.filaments, props.printers, props.activePrinterIds]);
  useEffect(() => {
    scene.current?.setEdit(props.edit, props.grid);
  }, [props.edit, props.grid]);
  useEffect(() => {
    scene.current?.select(props.selected);
  }, [props.selected, props.focusToken]);
  useEffect(() => {
    scene.current?.setSelectedLabel(props.selectedLabel?.id ?? null);
  }, [props.selectedLabel]);

  const selectedFurniture = props.layout.furniture.find((f) => f.id === props.selected);
  const selectedPlacement = props.layout.placements.find((p) => p.id === props.selected);
  const selectedEntity = selectedPlacement
    ? (selectedPlacement.kind === 'printer' ? props.printers : props.filaments).find(
        (item) => item.id === selectedPlacement.entityId
      )
    : null;
  const selectedSlot = selectedPlacement
    ? props.layout.slots.find((s) => s.id === selectedPlacement.slotId)
    : undefined;
  const placementFurniture = selectedSlot
    ? props.layout.furniture.find((f) => f.id === selectedSlot.furnitureId)
    : undefined;

  const stepMove = (dx: number, dz: number) => {
    if (!selectedFurniture) return;
    props.onMove(selectedFurniture.id, selectedFurniture.x + dx, selectedFurniture.z + dz);
  };

  const handleRotate = () => {
    if (!selectedFurniture) return;
    const nextRot = (selectedFurniture.rotation + 90) % 360;
    props.onRotate?.(selectedFurniture.id, nextRot);
  };

  const stepMovePlacement = (axis: 'x' | 'z', dir: number) => {
    if (!selectedPlacement || !scene.current) return;
    const nextSlot = scene.current.findAdjacentSlot(selectedPlacement.id, axis, dir);
    if (nextSlot) {
      props.onMovePlacement?.(selectedPlacement.id, nextSlot.id);
    }
  };

  return (
    <div
      ref={container}
      className={`relative h-[72vh] min-h-[500px] w-full overflow-hidden ${
        props.edit
          ? 'rounded-xl border border-white/20'
          : 'border-0'
      } bg-[#111a24] lg:h-[calc(100vh-190px)] lg:min-h-[680px] touch-none select-none overscroll-none`}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <canvas
        ref={canvas}
        aria-label="3D-план мастерской"
        className="block h-full w-full touch-none select-none overscroll-none"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          overscrollBehavior: 'none',
        }}
      />
      {status && (
        <div role="status" className="absolute inset-x-4 top-20 rounded-lg border border-white/15 bg-neutral-950/90 p-3 text-xs">
          {status}
        </div>
      )}

      {/* Edit mode active indicator banner & action buttons */}
      {props.edit && (
        <div className="absolute top-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-neutral-950/95 px-3 py-2 font-mono text-[11px] shadow-2xl backdrop-blur-md select-none">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-400" />
            <span className="font-semibold tracking-wider text-neutral-300">РЕДАКТОР</span>
          </div>

          {/* Кнопка Добавить комнату */}
          <div className="h-3.5 w-px bg-white/20" />
          <button
            type="button"
            onClick={gridBuilderActive ? handleCancelGridBuilder : handleStartGridBuilder}
            title={gridBuilderActive ? 'Завершить или отменить создание комнаты' : 'Создать новую комнату по клеточкам'}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase transition-all active:scale-95 ${
              gridBuilderActive
                ? 'border-amber-400 bg-amber-500/30 text-amber-200 shadow-sm shadow-amber-500/30'
                : 'border-amber-500/50 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 hover:text-amber-100'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span>Добавить комнату</span>
          </button>

          {/* Кнопка сбросить всю мастерскую */}
          {props.onResetWorkshop && (
            <>
              <div className="h-3.5 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                title="Сбросить мастерскую к одной стандартной комнате"
                className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/40 px-2.5 py-0.5 text-rose-300 hover:bg-rose-900/50 hover:text-rose-100 active:scale-95 transition-all"
              >
                <RotateCcw className="h-3 w-3 text-rose-400" />
                <span>Сбросить всё</span>
              </button>
            </>
          )}

          {/* Кнопка сохранить */}
          {props.onSave && (
            <button
              type="button"
              disabled={props.saving}
              onClick={props.onSave}
              title={props.hasUnsavedChanges ? 'Есть несохранённые изменения · Сохранить и выйти' : 'Сохранить текущее состояние планировки'}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wider transition-all disabled:opacity-50 active:scale-95 ${
                props.hasUnsavedChanges
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.35)] animate-pulse hover:bg-emerald-500/35'
                  : 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-100'
              }`}
            >
              <Save className="h-3 w-3 text-emerald-400" />
              <span>{props.saving ? 'Сохранение…' : 'Сохранить'}</span>
            </button>
          )}

          {/* Кнопка выйти из редактирования */}
          {props.onExitEdit && (
            <button
              type="button"
              onClick={props.onExitEdit}
              title="Выйти из режима редактирования в обзор"
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-neutral-300 hover:bg-white/20 hover:text-white active:scale-95 transition-all"
            >
              <Eye className="h-3 w-3 text-neutral-400" />
              <span>Выйти из редактирования</span>
            </button>
          )}
        </div>
      )}

      {/* Top info badges */}
      <div className={`absolute left-4 ${props.edit ? 'top-20' : 'top-4'} z-20 flex flex-col gap-2 font-mono pointer-events-none`}>
        {/* Row 1: Metrics */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-neutral-950/80 px-3 py-2 shadow-lg backdrop-blur-md">
            <strong className="text-xl font-bold text-white">
              {
                props.layout.placements.filter(
                  (p) =>
                    p.kind === 'printer' &&
                    props.layout.slots.some(
                      (s) => s.id === p.slotId && props.layout.furniture.some((f) => f.id === s.furnitureId && f.roomId === props.room.id)
                    )
                ).length
              }
            </strong>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">ПРИНТЕРОВ В КОМНАТЕ</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-neutral-950/80 px-3 py-2 shadow-lg backdrop-blur-md">
            <strong className="text-xl font-bold text-white">
              {props.room.width} × {props.room.depth}
            </strong>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
              МЕТРАЖ ({props.room.tiles && props.room.tiles.length > 0 ? props.room.tiles.length : props.room.width * props.room.depth} М²)
            </p>
          </div>
        </div>

        {/* Row 2: Room name (editable) & Delete room button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="pointer-events-auto flex flex-col justify-between rounded-lg border border-white/10 bg-neutral-950/80 px-3 py-1.5 shadow-lg backdrop-blur-md transition-colors focus-within:border-cyan-400/60 focus-within:bg-neutral-950/95 min-w-[200px] max-w-[280px]">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                aria-label="Название комнаты"
                value={roomName}
                onChange={(e) => {
                  const val = e.target.value;
                  setRoomName(val);
                  if (val.trim()) {
                    props.onSaveRoom({ ...props.room, name: val.trim() });
                  }
                }}
                maxLength={80}
                placeholder="Название комнаты"
                className="w-full bg-transparent font-mono text-sm font-bold text-white placeholder-neutral-500 focus:outline-none"
              />
              <Pencil className="h-3 w-3 shrink-0 text-neutral-400 opacity-60 pointer-events-none" />
            </div>
            <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
              НАЗВАНИЕ КОМНАТЫ
            </p>
          </div>

          {props.edit && props.layout.rooms.length > 1 && (
            <button
              type="button"
              onClick={() => setIsDeleteRoomConfirmOpen(true)}
              title={`Удалить комнату «${props.room.name}»`}
              className="pointer-events-auto flex flex-col justify-between rounded-lg border border-rose-500/30 bg-neutral-950/80 px-3 py-1.5 text-rose-400 shadow-lg backdrop-blur-md transition-all hover:border-rose-500/60 hover:bg-rose-950/40 active:scale-95"
            >
              <div className="flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span className="font-mono text-xs font-bold text-rose-300">УДАЛИТЬ</span>
              </div>
              <p className="text-[10px] font-mono text-rose-400/80 uppercase tracking-wider">
                КОМНАТУ
              </p>
            </button>
          )}
        </div>
      </div>

      {/* View angle & zoom buttons */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-950/90 p-1.5 z-10 font-mono text-xs">
        <CockpitButton isActive={!top} onClick={() => scene.current?.setTop(false)}>
          3D
        </CockpitButton>
        <CockpitButton isActive={top} onClick={() => scene.current?.setTop(true)}>
          2D
        </CockpitButton>
        <CockpitButton
          onClick={() => {
            scene.current?.overview();
            props.onSelect('', 'furniture');
          }}
        >
          Общий вид
        </CockpitButton>
        <div className="h-4 w-px bg-white/20 mx-0.5" />
        <button
          type="button"
          title="Повернуть камеру влево (45°)"
          onClick={() => scene.current?.rotateView(Math.PI / 4)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Повернуть камеру вправо (45°)"
          onClick={() => scene.current?.rotateView(-Math.PI / 4)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white transition-all"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-white/20 mx-0.5" />
        <button
          type="button"
          title="Приблизить (+)"
          onClick={() => scene.current?.zoomIn()}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white transition-all"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Отдалить (-)"
          onClick={() => scene.current?.zoomOut()}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white transition-all"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-white/20 mx-0.5" />
        <CockpitButton icon={MousePointer2} isActive={showControls} onClick={()=>setShowControls(value=>!value)}>Управление</CockpitButton>
      </div>

      {showControls&&<div className="absolute bottom-16 left-4 z-30 max-w-[min(380px,calc(100%-32px))] rounded-xl border border-white/15 bg-neutral-950/95 p-3.5 font-mono text-[11px] leading-relaxed text-neutral-300 shadow-2xl backdrop-blur-md">
        <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
          <MousePointer2 className="h-3.5 w-3.5 text-cyan-400" />
          <span>Управление 3D-пространством:</span>
        </p>
        <p>• <strong className="text-cyan-300">Левая кнопка</strong> — выбор объектов (клик), панорамирование и рисование пола</p>
        <p>• <strong className="text-indigo-300">Правая кнопка / Колёсико</strong> — свободное вращение камеры 360°</p>
        <p>• <strong className="text-sky-300">Прокрутка колёсика</strong> — приближение / отдаление (зум)</p>
        <p className="mt-2 text-neutral-400 border-t border-white/10 pt-2">На сенсорном экране: один палец — перемещение/рисование, два — масштаб и вращение. Esc — отмена.</p>
      </div>}
      {/* Floating Cockpit HUD for Grid Room Builder */}
      {props.edit && gridBuilderActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-500/40 bg-neutral-950/95 p-2 font-mono text-xs text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1 border-r border-white/15 pr-2">
            <button
              type="button"
              onClick={() => handleToolChange('brush')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                gridBuilderTool === 'brush'
                  ? 'border-sky-400 bg-sky-500/25 text-sky-200 shadow-sm shadow-sky-500/20'
                  : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5 text-sky-400" />
              <span>Пол</span>
            </button>
            <button
              type="button"
              onClick={() => handleToolChange('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                gridBuilderTool === 'eraser'
                  ? 'border-rose-400 bg-rose-500/25 text-rose-200 shadow-sm shadow-rose-500/20'
                  : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Eraser className="w-3.5 h-3.5 text-rose-400" />
              <span>Ластик</span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-2 text-neutral-300">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider">Выбрано:</span>
            <span className="font-bold text-sky-300 text-sm">{gridTileCount} м²</span>
          </div>

          {/* Быстрые кнопки вращения камеры прямо в панели создания комнаты */}
          <div className="flex items-center gap-1 border-l border-white/15 pl-2" title="Вращение камеры (также правой кнопкой мыши или нажатием колёсика)">
            <button
              type="button"
              title="Повернуть камеру влево (45°)"
              onClick={() => scene.current?.rotateView(Math.PI / 4)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Повернуть камеру вправо (45°)"
              onClick={() => scene.current?.rotateView(-Math.PI / 4)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/15 pl-2">
            <button
              type="button"
              disabled={gridTileCount === 0}
              onClick={handleCreateRoomFromTiles}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-md shadow-emerald-950"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Создать комнату</span>
            </button>
            <button
              type="button"
              onClick={handleCancelGridBuilder}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-neutral-400 hover:text-rose-200 hover:bg-rose-950/40 hover:border-rose-500/30 transition-all active:scale-95"
              title="Отмена (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Отмена</span>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {props.edit && props.selectedLabel && (
          <SpatialProperties
            key={`label-${props.selectedLabel.id}`}
            room={props.room}
            label={props.selectedLabel}
            onSaveLabel={props.onSaveLabel}
            onDeleteLabel={props.onDeleteLabel}
            onClose={props.onCloseSpatialEditor}
          />
        )}
      </AnimatePresence>

      {/* 3D Floating Hover Badge for Printers and Filaments */}
      <AnimatePresence>
        {!props.edit && hoverPlacement && (
          <motion.div
            key={hoverPlacement.placementId}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 3 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pointer-events-none absolute z-30 flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-950/90 px-2.5 py-1 text-xs font-mono text-neutral-200 shadow-xl shadow-black/80 backdrop-blur-md select-none -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: hoverPlacement.screenX,
              top: hoverPlacement.screenY,
            }}
          >
            {/* Status dot / color swatch */}
            {hoverPlacement.kind === 'printer' ? (
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  hoverPlacement.isActive
                    ? 'bg-emerald-400 ring-2 ring-emerald-500/30'
                    : 'bg-neutral-500'
                }`}
              />
            ) : (
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: hoverPlacement.color || '#a3a3a3' }}
              />
            )}

            {/* Name only */}
            <span className="font-medium tracking-tight text-white whitespace-nowrap">
              {hoverPlacement.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IN-SCENE EDIT CONTROLS: Floating quick action bar when furniture is selected in edit mode */}
      {props.edit && selectedFurniture && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-neutral-950/95 px-4 py-2.5 text-xs font-mono text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-white/15 pr-3">
            <span className="font-semibold text-cyan-400">{selectedFurniture.name}</span>
            <span className="text-[10px] text-neutral-400">
              {selectedFurniture.width} × {selectedFurniture.depth} м
            </span>
          </div>

          {/* D-Pad Arrow buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Сдвинуть влево (-X)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMove(-props.grid, 0)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Сдвинуть назад (-Z)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMove(0, -props.grid)}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Сдвинуть вперёд (+Z)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMove(0, props.grid)}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Сдвинуть вправо (+X)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMove(props.grid, 0)}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {/* Rotate button */}
          <button
            type="button"
            title="Повернуть на 90° (клавиша R)"
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-indigo-300 hover:bg-indigo-500/25 active:scale-95"
            onClick={handleRotate}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{selectedFurniture.rotation}°</span>
            <span className="text-[10px] text-indigo-400/80">[R]</span>
          </button>

          <div className="h-4 w-px bg-white/15" />

          {/* Delete button */}
          <button
            type="button"
            title="Удалить объект из сцены (клавиша Del)"
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-rose-300 hover:bg-rose-500/25 active:scale-95"
            onClick={() => props.onDelete?.(selectedFurniture.id, 'furniture')}
          >
            <span>Удалить</span>
            <span className="text-[10px] text-rose-400/80">[Del]</span>
          </button>

          {/* Deselect */}
          <button
            type="button"
            title="Снять выделение"
            className="ml-1 rounded-lg p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            onClick={() => props.onSelect('', 'furniture')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* IN-SCENE EDIT CONTROLS: Floating quick action bar when placement (printer/filament) is selected in edit mode */}
      {props.edit && selectedPlacement && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/40 bg-neutral-950/95 px-4 py-2.5 text-xs font-mono text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-white/15 pr-3">
            <span className="font-semibold text-cyan-400">
              {selectedEntity?.name ?? (selectedPlacement.kind === 'printer' ? '3D-Принтер' : 'Филамент')}
            </span>
            <span className="text-[10px] text-neutral-400">
              {placementFurniture ? placementFurniture.name : 'Слот'} {selectedSlot ? `· Слот #${selectedSlot.index + 1}` : ''}
            </span>
          </div>

          {/* D-Pad Arrow buttons for moving printer between slots */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Переместить влево (-X)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMovePlacement('x', -1)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Переместить назад (-Z)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMovePlacement('z', -1)}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Переместить вперёд (+Z)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMovePlacement('z', 1)}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Переместить вправо (+X)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-neutral-300 hover:text-white"
              onClick={() => stepMovePlacement('x', 1)}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedPlacement.kind === 'printer' && (
            <>
              <div className="h-4 w-px bg-white/15" />
              {/* Model toggle button: A1 (Open) vs P1 (Enclosed) */}
              <button
                type="button"
                title="Переключить корпус 3D-модели (клавиша R)"
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-indigo-300 hover:bg-indigo-500/25 active:scale-95"
                onClick={() => {
                  const nextModel: ModelKey = selectedPlacement.model === 'a1' ? 'p1' : 'a1';
                  props.onModelChange?.(selectedPlacement.id, nextModel);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{selectedPlacement.model === 'a1' ? 'A1 (Открытый)' : 'P1 (Закрытый)'}</span>
                <span className="text-[10px] text-indigo-400/80">[R]</span>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-white/15" />

          {/* Delete / unplace button */}
          <button
            type="button"
            title="Убрать со стола в инвентарь (клавиша Del)"
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-rose-300 hover:bg-rose-500/25 active:scale-95"
            onClick={() => props.onDelete?.(selectedPlacement.id, 'placement')}
          >
            <span>Убрать со стола</span>
            <span className="text-[10px] text-rose-400/80">[Del]</span>
          </button>

          {/* Deselect */}
          <button
            type="button"
            title="Снять выделение"
            className="ml-1 rounded-lg p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            onClick={() => props.onSelect('', 'furniture')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* EQUIPMENT & MATERIAL INSPECTION MENU: Full-featured cockpit panel (View mode only) */}
      <AnimatePresence>
        {!props.edit && selectedPlacement && (
          <WorkshopInspectionMenu
            placement={selectedPlacement}
            entity={selectedEntity}
            furniture={placementFurniture}
            slot={selectedSlot}
            room={props.layout.rooms.find(room=>room.id===placementFurniture?.roomId)??props.room}
            isActive={
              selectedPlacement.kind === 'printer' &&
              (Boolean(props.activePrinterIds?.has(selectedPlacement.entityId)) ||
                Boolean(props.activePrinterIds?.has(selectedPlacement.id)))
            }
            onClose={() => {
              scene.current?.overview();
              props.onSelect('', 'furniture');
            }}
            onModelChange={props.onModelChange}
          />
        )}
      </AnimatePresence>

      {/* 3D OBJECT ADD CATALOG: Right sidebar in edit mode */}
      {props.edit && (
        <WorkshopAddCatalog
          layout={props.layout}
          room={props.room}
          printers={props.printers}
          filaments={props.filaments}
          onAddFurniture={kind=>{props.onCloseSpatialEditor();scene.current?.beginFurniturePlacement(kind);}}
          onPlacePrinter={props.onPlacePrinter ?? (() => {})}
          onPlaceFilament={props.onPlaceFilament ?? (() => {})}
          onAddLabel={(preset) => {
            props.onCloseSpatialEditor();
            scene.current?.beginLabelPlacement(undefined, preset?.text, preset?.color);
          }}
          onSelectLabel={(roomId, labelId) => {
            props.onLabelSelect(roomId, labelId);
          }}
          onDeleteLabel={(roomId, labelId) => {
            props.onDeleteRoomLabel?.(roomId, labelId);
          }}
        />
      )}

      {/* Модальное окно подтверждения удаления выбранной комнаты */}
      <CockpitDeleteModal
        isOpen={isDeleteRoomConfirmOpen}
        onClose={() => setIsDeleteRoomConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteRoomConfirmOpen(false);
          props.onDeleteRoom?.(props.room.id);
        }}
        title="Удаление помещения"
        itemName={props.room.name}
        itemDetails={`${props.room.width} × ${props.room.depth} м`}
        description="Вы действительно хотите удалить эту комнату? Всё оборудование и мебель внутри неё будут также удалены."
      />

      {/* Модальное окно подтверждения сброса мастерской */}
      <CockpitDeleteModal
        isOpen={isResetConfirmOpen}
        onClose={() => !isResetting && setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        isDeleting={isResetting}
        title="Сброс мастерской"
        itemName="Вся мастерская"
        itemDetails="Сброс до базовой конфигурации"
        description="Внимание! Вы действительно хотите сбросить всю мастерскую до одной стандартной комнаты? Все добавленные комнаты, мебель и надписи будут удалены. Действие необратимо."
      />
    </div>
  );
}
