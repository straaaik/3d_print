import type { BackgroundPreferences, BackgroundVariant } from './backgroundPreferences';

/** Based on InteractiveDotGrid (3917db4): a regular grid, repulsion and click waves.
 * Motion supplies frame time; each mark retains a short, independently fading wake. */
export function createParticleBackground(canvas: HTMLCanvasElement, variant: BackgroundVariant,
  contrast: BackgroundPreferences['contrast'], preview = false) {
  const context = canvas.getContext('2d');
  const cache = document.createElement('canvas');
  const base = cache.getContext('2d');
  const brightness = { quiet: 0.65, balanced: 1, clear: 1.5 }[contrast] * (preview ? 1.8 : 1);
  const colors = Array.from({ length: 128 }, (_, i) => `rgba(255,255,255,${i / 127})`);
  const accents = Array.from({ length: 128 }, (_, i) => `rgba(12,180,224,${i / 127})`);
  const radius = variant === 'dots' ? 145 : 150;
  const restingAlpha = (variant === 'dots' ? 0.16 : 0.12) * brightness;
  let width = 0;
  let height = 0;
  let count = 0;
  let points = new Float32Array(0);
  let transformed = new Float32Array(0);
  let active = new Uint32Array(0);
  let hasResidual = false;
  const colorIndex = (alpha: number) => Math.min(127, Math.max(0, Math.round(alpha * 127)));

  function particle(ctx: CanvasRenderingContext2D, x: number, y: number, response = 0) {
    if (variant === 'crosses') {
      // Constant pigment and geometry: translation/rotation never change brightness/size.
      ctx.fillStyle = colors[colorIndex(restingAlpha)];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(response);
      ctx.beginPath();
      ctx.rect(-3, -0.5, 6, 1);
      ctx.rect(-0.5, -3, 1, 6);
      ctx.fill();
      ctx.restore();
      return;
    }
    const dotRadius = 0.85 + response * 0.75;
    if (response > 0.001) {
      ctx.fillStyle = accents[colorIndex(response * 0.35 * brightness)];
      ctx.beginPath();
      ctx.arc(x, y, dotRadius + response * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = colors[colorIndex(restingAlpha + response * 0.8 * brightness)];
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function resize() {
    if (!context || !base) return;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(4_000_000 / Math.max(1, width * height)));
    canvas.width = cache.width = Math.max(1, Math.round(width * ratio));
    canvas.height = cache.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    base.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (variant === 'none') { count = 0; return; }
    const spacing = Math.max(variant === 'dots' ? 12 : 26, Math.sqrt(width * height / 8500));
    const columns = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    count = columns * rows;
    points = new Float32Array(count * 2);
    transformed = new Float32Array(count * 3);
    active = new Uint32Array(count);
    const offsetX = (width - (columns - 1) * spacing) / 2;
    const offsetY = (height - (rows - 1) * spacing) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        const x = col * spacing + offsetX;
        const y = row * spacing + offsetY;
        points[index * 2] = x;
        points[index * 2 + 1] = y;
        transformed[index * 3] = x;
        transformed[index * 3 + 1] = y;
        particle(base, x, y);
      }
    }
    hasResidual = false;
  }

  function draw(mouseX: number, mouseY: number, hover: number, rippleX: number, rippleY: number, progress: number, deltaMs = 1000 / 60) {
    if (!context || !width || !height) return false;
    context.clearRect(0, 0, width, height);
    context.drawImage(cache, 0, 0, width, height);
    const hasRipple = variant === 'dots' && progress > 0 && progress < 1;
    if (hover < 0.001 && !hasRipple && !hasResidual) return false;
    // Frame-rate-independent damping, with a slower release than attack for a short wake.
    const dt = Math.min(40, Math.max(1, deltaMs)) / 1000;
    const positionMix = 1 - Math.exp(-dt / (variant === 'dots' ? 0.24 : 0.12));
    const attackMix = 1 - Math.exp(-dt / (variant === 'dots' ? 0.18 : 0.12));
    const releaseMix = 1 - Math.exp(-dt / (variant === 'dots' ? 0.7 : 0.18));
    const waveRadius = progress * Math.min(width, height) * 0.45;
    const waveStrength = Math.sin(Math.min(1, progress / 0.12) * Math.PI / 2) * Math.pow(1 - progress, 1.5);
    let activeCount = 0;
    hasResidual = false;
    for (let i = 0; i < count; i++) {
      const px = points[i * 2];
      const py = points[i * 2 + 1];
      const dx = px - mouseX;
      const dy = py - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const proximity = Math.max(0, 1 - distance / radius);
      const force = proximity * proximity * hover;
      let x = px;
      let y = py;
      let response = force * 1.15;
      if (variant === 'crosses') {
        response = force * Math.PI * 0.8;
        if (distance > 0.001) { x -= dx / distance * force * 4; y -= dy / distance * force * 4; }
      } else {
        if (distance > 0.001) { x += dx / distance * force * 8.5; y += dy / distance * force * 8.5; }
        if (hasRipple) {
          const wx = px - rippleX;
          const wy = py - rippleY;
          const distanceToClick = Math.sqrt(wx * wx + wy * wy);
          const phase = distanceToClick - waveRadius;
          const band = Math.max(0, 1 - Math.abs(phase) / 105);
          const envelope = (1 - Math.cos(band * Math.PI)) * 0.5;
          // Alternating crest/trough, not a single expanding illuminated disc.
          const wave = Math.sin(phase / 14) * envelope * waveStrength;
          if (distanceToClick > 0.001) { x += wx / distanceToClick * wave * 8; y += wy / distanceToClick * wave * 8; }
          response = Math.max(response, Math.abs(wave) * 0.65);
        }
      }
      const index = i * 3;
      const responseMix = response > transformed[index + 2] ? attackMix : releaseMix;
      transformed[index] += (x - transformed[index]) * positionMix;
      transformed[index + 1] += (y - transformed[index + 1]) * positionMix;
      transformed[index + 2] += (response - transformed[index + 2]) * responseMix;
      if (Math.abs(x - transformed[index]) < 0.005) transformed[index] = x;
      else hasResidual = true;
      if (Math.abs(y - transformed[index + 1]) < 0.005) transformed[index + 1] = y;
      else hasResidual = true;
      if (Math.abs(response - transformed[index + 2]) < 0.0005) transformed[index + 2] = response;
      else hasResidual = true;
      if (transformed[index + 2] < 0.001 && Math.abs(transformed[index] - px) < 0.005 && Math.abs(transformed[index + 1] - py) < 0.005) continue;
      active[activeCount++] = i;
      const half = variant === 'crosses' ? 4 : 2;
      // Erase all resting marks before drawing moved marks to avoid duplicate dots/trails.
      context.clearRect(px - half, py - half, half * 2, half * 2);
    }
    for (let n = 0; n < activeCount; n++) {
      const i = active[n] * 3;
      particle(context, transformed[i], transformed[i + 1], transformed[i + 2]);
    }
    return hasResidual;
  }

  function reset() {
    for (let i = 0; i < count; i++) {
      transformed[i * 3] = points[i * 2];
      transformed[i * 3 + 1] = points[i * 2 + 1];
      transformed[i * 3 + 2] = 0;
    }
    hasResidual = false;
  }
  return { resize, draw, reset };
}
