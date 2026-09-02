/**
 * Na Etacie - Celebratory Canvas Confetti & Sparkle Burst Engine (2026)
 * 
 * High-performance, zero-dependency canvas particle engine.
 * Renders celebratory bursts using requestAnimationFrame and GPU compositing.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
  shape: 'rect' | 'circle' | 'sparkle';
}

const CELEBRATION_COLORS = [
  '#10b981', // Emerald
  '#059669', // Dark Emerald
  '#3b82f6', // Electric Blue
  '#f59e0b', // Amber Gold
  '#fbbf24', // Yellow Gold
  '#8b5cf6', // Purple Glow
  '#ec4899', // Pink
];

let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;
const activeParticles: Particle[] = [];
let animationFrameId: number | null = null;

function ensureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof window === 'undefined') return null;

  if (!activeCanvas || !document.body.contains(activeCanvas)) {
    activeCanvas = document.createElement('canvas');
    activeCanvas.id = 'naetacie-confetti-canvas';
    activeCanvas.style.position = 'fixed';
    activeCanvas.style.inset = '0';
    activeCanvas.style.width = '100vw';
    activeCanvas.style.height = '100vh';
    activeCanvas.style.pointerEvents = 'none';
    activeCanvas.style.zIndex = '99999';
    document.body.appendChild(activeCanvas);
  }

  activeCanvas.width = window.innerWidth * window.devicePixelRatio;
  activeCanvas.height = window.innerHeight * window.devicePixelRatio;

  if (!activeCtx) {
    activeCtx = activeCanvas.getContext('2d');
  }

  return activeCtx ? { canvas: activeCanvas, ctx: activeCtx } : null;
}

/**
 * Fires a celebratory confetti particle burst from an origin point (x, y normalized 0..1 or pixel coordinates).
 */
export function fireConfetti(options?: {
  originX?: number; // 0..1 (default: 0.5)
  originY?: number; // 0..1 (default: 0.6)
  particleCount?: number;
  spread?: number;
  colors?: string[];
}): void {
  if (typeof window === 'undefined') return;

  const ctxData = ensureCanvas();
  if (!ctxData) return;

  const { canvas } = ctxData;
  const count = options?.particleCount ?? 65;
  const originX = (options?.originX ?? 0.5) * canvas.width;
  const originY = (options?.originY ?? 0.6) * canvas.height;
  const spread = options?.spread ?? 70;
  const palette = options?.colors ?? CELEBRATION_COLORS;

  const newParticles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI / 180) * (-90 + (Math.random() - 0.5) * spread * 2);
    const speed = 8 + Math.random() * 16;
    const shapes: Array<'rect' | 'circle' | 'sparkle'> = ['rect', 'circle', 'sparkle'];

    newParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
      vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4),
      size: 5 + Math.random() * 7,
      color: palette[Math.floor(Math.random() * palette.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      decay: 0.012 + Math.random() * 0.018,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }

  activeParticles.push(...newParticles);

  if (!animationFrameId) {
    runParticleLoop();
  }
}

function runParticleLoop() {
  if (!activeCtx || !activeCanvas || activeParticles.length === 0) {
    if (activeCanvas && activeCtx) {
      activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    }
    animationFrameId = null;
    return;
  }

  activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.38; // gravity
    p.vx *= 0.985; // air resistance
    p.rotation += p.rotationSpeed;
    p.opacity -= p.decay;

    if (p.opacity <= 0 || p.y > activeCanvas.height) {
      activeParticles.splice(i, 1);
      continue;
    }

    activeCtx.save();
    activeCtx.globalAlpha = Math.max(0, p.opacity);
    activeCtx.translate(p.x, p.y);
    activeCtx.rotate((p.rotation * Math.PI) / 180);
    activeCtx.fillStyle = p.color;

    if (p.shape === 'rect') {
      activeCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else if (p.shape === 'circle') {
      activeCtx.beginPath();
      activeCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      activeCtx.fill();
    } else {
      // 4-point star sparkle
      activeCtx.beginPath();
      activeCtx.moveTo(0, -p.size);
      activeCtx.lineTo(p.size * 0.3, -p.size * 0.3);
      activeCtx.lineTo(p.size, 0);
      activeCtx.lineTo(p.size * 0.3, p.size * 0.3);
      activeCtx.lineTo(0, p.size);
      activeCtx.lineTo(-p.size * 0.3, p.size * 0.3);
      activeCtx.lineTo(-p.size, 0);
      activeCtx.lineTo(-p.size * 0.3, -p.size * 0.3);
      activeCtx.closePath();
      activeCtx.fill();
    }

    activeCtx.restore();
  }

  animationFrameId = requestAnimationFrame(runParticleLoop);
}
