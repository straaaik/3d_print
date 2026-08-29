'use client';

import React, { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  speed: number;
}

interface InteractiveDotGridProps {
  /** Расстояние между точками в пикселях (по умолчанию 12) */
  spacing?: number;
  /** Радиус взаимодействия с курсором (по умолчанию 120) */
  repulsionRadius?: number;
  /** Максимальное смещение точки в пикселях (по умолчанию 5) */
  maxDisplacement?: number;
  /** Основной цвет точек в покое */
  dotColor?: string;
  /** Акцентный цвет подсветки точек у курсора (по умолчанию #0CB4E0) */
  activeColor?: string;
  className?: string;
}

/**
 * Проверяет, находится ли элемент в рабочей зоне (формы, таблицы, карточки, кнопки, меню навигации)
 */
function isInsideWorkArea(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'input, select, textarea, button, a, table, thead, tbody, tr, th, td, form, dialog, nav, header, footer, [role="dialog"], [role="menu"], [role="tabpanel"], [role="grid"], [data-work-area], .card, .modal'
    )
  );
}

export function InteractiveDotGrid({
  spacing = 12,
  repulsionRadius = 120,
  maxDisplacement = 5,
  dotColor = 'rgba(255, 255, 255, 0.16)',
  activeColor = 'rgba(12, 180, 224, 0.95)',
  className = '',
}: InteractiveDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Проверка prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animFrameId: number | null = null;
    let isRunning = false;

    // Сглаженное состояние мыши с жидкостной инерцией
    let rawMouseX = -1000;
    let rawMouseY = -1000;
    let smoothMouseX = -1000;
    let smoothMouseY = -1000;
    let isMouseActive = false;

    let pendingX = -1000;
    let pendingY = -1000;
    let pendingTarget: EventTarget | null = null;
    let hasPendingMove = false;

    // Сетка точек
    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let totalDots = 0;

    // Offscreen Canvas для кэширования статической сетки (0% CPU при рендере)
    let offscreenCanvas: HTMLCanvasElement | null = null;

    // Буферы для позиций и анимации (Float32Array)
    let originX: Float32Array;
    let originY: Float32Array;
    let currX: Float32Array;
    let currY: Float32Array;
    let targetX: Float32Array;
    let targetY: Float32Array;
    let glow: Float32Array;
    let targetGlow: Float32Array;

    const activeIndices = new Set<number>();
    const ripples: Ripple[] = [];

    const initGrid = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      cols = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
      totalDots = cols * rows;

      originX = new Float32Array(totalDots);
      originY = new Float32Array(totalDots);
      currX = new Float32Array(totalDots);
      currY = new Float32Array(totalDots);
      targetX = new Float32Array(totalDots);
      targetY = new Float32Array(totalDots);
      glow = new Float32Array(totalDots);
      targetGlow = new Float32Array(totalDots);

      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * spacing + offsetX;
          const y = r * spacing + offsetY;

          originX[idx] = x;
          originY[idx] = y;
          currX[idx] = x;
          currY[idx] = y;
          targetX[idx] = x;
          targetY[idx] = y;
          glow[idx] = 0;
          targetGlow[idx] = 0;
        }
      }

      // Создаем и кэшируем статическую сетку на Offscreen Canvas
      offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const offCtx = offscreenCanvas.getContext('2d');
      if (offCtx) {
        offCtx.scale(dpr, dpr);
        offCtx.fillStyle = dotColor;

        const path = new Path2D();
        const radius = 0.85;
        const twoPi = Math.PI * 2;

        for (let i = 0; i < totalDots; i++) {
          path.moveTo(originX[i] + radius, originY[i]);
          path.arc(originX[i], originY[i], radius, 0, twoPi);
        }
        offCtx.fill(path);
      }

      activeIndices.clear();
      drawStaticFrame();
    };

    // Мгновенный блит фонового кэша (0.01ms на GPU)
    const drawStaticFrame = () => {
      ctx.clearRect(0, 0, width, height);
      if (offscreenCanvas) {
        ctx.drawImage(offscreenCanvas, 0, 0, width, height);
      }
    };

    const updateTargets = () => {
      if (prefersReducedMotion) return;

      // Применяем отложенное положение мыши
      if (hasPendingMove) {
        hasPendingMove = false;
        if (isInsideWorkArea(pendingTarget)) {
          isMouseActive = false;
          rawMouseX = -1000;
          rawMouseY = -1000;
        } else {
          isMouseActive = true;
          rawMouseX = pendingX;
          rawMouseY = pendingY;
          if (smoothMouseX < -500) {
            smoothMouseX = rawMouseX;
            smoothMouseY = rawMouseY;
          }
        }
      }

      // Плавная жидкостная интерполяция центра курсора
      if (isMouseActive && rawMouseX >= 0) {
        smoothMouseX += (rawMouseX - smoothMouseX) * 0.08;
        smoothMouseY += (rawMouseY - smoothMouseY) * 0.08;
      } else {
        smoothMouseX = -1000;
        smoothMouseY = -1000;
      }

      const rSq = repulsionRadius * repulsionRadius;

      // Сбрасываем цели для затронутых точек
      activeIndices.forEach((idx) => {
        targetX[idx] = originX[idx];
        targetY[idx] = originY[idx];
        targetGlow[idx] = 0;
      });

      if (isMouseActive && smoothMouseX >= 0 && smoothMouseY >= 0) {
        const colMin = Math.max(0, Math.floor((smoothMouseX - repulsionRadius) / spacing) - 1);
        const colMax = Math.min(cols - 1, Math.ceil((smoothMouseX + repulsionRadius) / spacing) + 1);
        const rowMin = Math.max(0, Math.floor((smoothMouseY - repulsionRadius) / spacing) - 1);
        const rowMax = Math.min(rows - 1, Math.ceil((smoothMouseY + repulsionRadius) / spacing) + 1);

        for (let r = rowMin; r <= rowMax; r++) {
          for (let c = colMin; c <= colMax; c++) {
            const idx = r * cols + c;
            const ox = originX[idx];
            const oy = originY[idx];

            const dx = ox - smoothMouseX;
            const dy = oy - smoothMouseY;
            const distSq = dx * dx + dy * dy;

            if (distSq < rSq && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              // Мягкая степенная кривая отталкивания
              const force = Math.pow(1 - dist / repulsionRadius, 2.0);
              const angle = Math.atan2(dy, dx);

              const disp = maxDisplacement * force;
              targetX[idx] = ox + Math.cos(angle) * disp;
              targetY[idx] = oy + Math.sin(angle) * disp;
              targetGlow[idx] = Math.min(1.0, force * 1.2);

              activeIndices.add(idx);
            }
          }
        }
      }

      // Обработка волн от клика (медленные и медитативные)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += ripple.speed;
        ripple.strength *= 0.982;

        if (ripple.strength < 0.02 || ripple.radius > ripple.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        const bandThickness = 45;
        const innerR = Math.max(0, ripple.radius - bandThickness);
        const outerR = ripple.radius + bandThickness;
        const innerRSq = innerR * innerR;
        const outerRSq = outerR * outerR;

        const colMin = Math.max(0, Math.floor((ripple.x - outerR) / spacing) - 1);
        const colMax = Math.min(cols - 1, Math.ceil((ripple.x + outerR) / spacing) + 1);
        const rowMin = Math.max(0, Math.floor((ripple.y - outerR) / spacing) - 1);
        const rowMax = Math.min(rows - 1, Math.ceil((ripple.y + outerR) / spacing) + 1);

        for (let r = rowMin; r <= rowMax; r++) {
          for (let c = colMin; c <= colMax; c++) {
            const idx = r * cols + c;
            const ox = originX[idx];
            const oy = originY[idx];

            const dx = ox - ripple.x;
            const dy = oy - ripple.y;
            const distSq = dx * dx + dy * dy;

            if (distSq >= innerRSq && distSq <= outerRSq && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const diff = Math.abs(dist - ripple.radius);
              const waveFactor = (1 - diff / bandThickness) * ripple.strength;
              const angle = Math.atan2(dy, dx);

              const disp = maxDisplacement * 1.2 * waveFactor;
              targetX[idx] += Math.cos(angle) * disp;
              targetY[idx] += Math.sin(angle) * disp;
              targetGlow[idx] = Math.max(targetGlow[idx], waveFactor * 0.8);

              activeIndices.add(idx);
            }
          }
        }
      }
    };

    // Главный цикл рендера (ультра-плавный, замедленный, медитативный)
    const render = () => {
      updateTargets();

      ctx.clearRect(0, 0, width, height);

      // 1. Отрисовываем всю статическую сетку за один GPU-вызов
      if (offscreenCanvas) {
        ctx.drawImage(offscreenCanvas, 0, 0, width, height);
      }

      // 2. Отрисовываем ТОЛЬКО смещенные/подсвеченные точки (~20-40 штук)
      let hasSignificantMotion = false;
      const toRemove: number[] = [];
      const baseRadius = 0.85;
      const twoPi = Math.PI * 2;

      // Очень мягкие и медленные коэффициенты интерполяции
      const lerpPos = 0.038;
      const lerpGlow = 0.032;

      activeIndices.forEach((idx) => {
        currX[idx] += (targetX[idx] - currX[idx]) * lerpPos;
        currY[idx] += (targetY[idx] - currY[idx]) * lerpPos;
        glow[idx] += (targetGlow[idx] - glow[idx]) * lerpGlow;

        const distFromOrigin = Math.abs(currX[idx] - originX[idx]) + Math.abs(currY[idx] - originY[idx]);
        const isStillMoving = distFromOrigin > 0.02 || glow[idx] > 0.005;

        if (isStillMoving) {
          hasSignificantMotion = true;
        } else if (!isMouseActive && targetGlow[idx] === 0) {
          currX[idx] = originX[idx];
          currY[idx] = originY[idx];
          glow[idx] = 0;
          toRemove.push(idx);
        }

        const g = glow[idx];
        const activeRadius = baseRadius + g * 0.6;

        // Если точка смещена, стираем ее исходную позицию с канваса, чтобы не было дубля
        if (distFromOrigin > 0.3) {
          ctx.clearRect(
            originX[idx] - baseRadius - 1,
            originY[idx] - baseRadius - 1,
            baseRadius * 2 + 2,
            baseRadius * 2 + 2
          );
        }

        if (g > 0.02) {
          // Неоновый ореол
          ctx.beginPath();
          ctx.arc(currX[idx], currY[idx], activeRadius + g * 2.2, 0, twoPi);
          ctx.fillStyle = `rgba(12, 180, 224, ${g * 0.35})`;
          ctx.fill();

          // Яркое ядро точки
          ctx.beginPath();
          ctx.arc(currX[idx], currY[idx], activeRadius, 0, twoPi);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + g * 0.6})`;
          ctx.fill();
        } else if (distFromOrigin > 0.3) {
          ctx.beginPath();
          ctx.arc(currX[idx], currY[idx], activeRadius, 0, twoPi);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }
      });

      toRemove.forEach((idx) => activeIndices.delete(idx));

      if (isMouseActive || ripples.length > 0 || hasSignificantMotion || activeIndices.size > 0) {
        animFrameId = requestAnimationFrame(render);
      } else {
        isRunning = false;
        animFrameId = null;
        drawStaticFrame();
      }
    };

    const startAnimation = () => {
      if (prefersReducedMotion) return;
      if (!isRunning) {
        isRunning = true;
        animFrameId = requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      pendingTarget = e.target;
      hasPendingMove = true;
      startAnimation();
    };

    const handlePointerLeave = () => {
      isMouseActive = false;
      hasPendingMove = false;
      rawMouseX = -1000;
      rawMouseY = -1000;
      startAnimation();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0 && !isInsideWorkArea(e.target)) {
        ripples.push({
          x: e.clientX,
          y: e.clientY,
          radius: 8,
          maxRadius: Math.min(width, height) * 0.35,
          strength: 1.0,
          speed: 1.8,
        });
        startAnimation();
      }
    };

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initGrid();
      }, 100);
    };

    initGrid();

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [spacing, repulsionRadius, maxDisplacement, dotColor, activeColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
    />
  );
}
