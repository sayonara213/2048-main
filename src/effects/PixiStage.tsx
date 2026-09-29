import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { fxBus, type FxEvent } from './fxBus';
import { tileStyle } from './tileColors';
import { useEffects } from './useEffects';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  spin: number;
  drag: number;
  grow: number;
}

interface Glow {
  g: Sprite;
  /** Anchor as a fraction of the screen. */
  fx: number;
  fy: number;
  /** Drift radius as a fraction of the screen. */
  ampX: number;
  ampY: number;
  /** Radians per ms: every glow takes at least a minute per loop. */
  speed: number;
  phase: number;
}

const MAX_PARTICLES = 700;
const TAU = Math.PI * 2;

// The three Lagoon aurora glows: CSS variable, position and size (fractions of the screen).
const GLOWS = [
  { name: '--glow-teal', fx: 0.15, fy: 0.1, rx: 0.6, ry: 0.5, loopMs: 70_000 },
  { name: '--glow-sea', fx: 0.95, fy: 0.45, rx: 0.5, ry: 0.6, loopMs: 90_000 },
  { name: '--glow-kelp', fx: 0.35, fy: 1.05, rx: 0.6, ry: 0.45, loopMs: 110_000 },
];

// Confetti in the water scale: sea-glass, lagoon, channel, surfacing, pearl.
const CONFETTI = [0x8edbc6, 0x35ad9f, 0x4a9fd6, 0x8cc4ef, 0xe9fbd9, 0x7fe0c4];

/**
 * Reads a CSS color variable as a Pixi tint and alpha. Handles hex (the build
 * minifies rgba() to #rrggbbaa) and rgb()/rgba().
 */
function cssColor(name: string, fallback = 0xffffff): { color: number; alpha: number } {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(raw)?.[1];
  if (hex && hex.length !== 5 && hex.length !== 7) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const alpha = full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1;
    return { color: parseInt(full.slice(0, 6), 16), alpha };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(raw);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map((v) => Math.round(Number(v)));
    return { color: (r! << 16) | (g! << 8) | b!, alpha: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  }
  return { color: fallback, alpha: 1 };
}

const lightScheme = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;

/**
 * Two full-screen decorative PixiJS canvases: one behind the UI with the
 * slowly drifting Lagoon aurora glows, one in front of it for particle bursts
 * driven by `fxBus`. Both are aria-hidden,
 * ignores pointer input, freezes to a still frame under reduced motion and
 * pauses while the tab is hidden.
 */
export function PixiStage() {
  const backHost = useRef<HTMLDivElement>(null);
  const frontHost = useRef<HTMLDivElement>(null);
  const { reduced } = useEffects();
  const reducedRef = useRef(reduced);
  const appsRef = useRef<Application[]>([]);
  const clearParticlesRef = useRef<() => void>(() => {});

  useEffect(() => {
    let destroyed = false;
    let ready = false;
    const app = new Application();
    const front = new Application();
    const apps = [app, front];
    const cleanups: (() => void)[] = [];

    (async () => {
      try {
        await Promise.all(
          apps.map((a) =>
            a.init({
              resizeTo: window,
              backgroundAlpha: 0,
              antialias: true,
              autoDensity: true,
              resolution: Math.min(window.devicePixelRatio || 1, 2),
              preference: 'webgl',
            }),
          ),
        );
      } catch {
        // No WebGL/canvas (old browser, test env): the effects are decorative, so skip them.
        return;
      }
      if (destroyed) {
        apps.forEach((a) => a.destroy(true, { children: true, texture: true }));
        return;
      }
      ready = true;
      appsRef.current = apps;
      backHost.current?.appendChild(app.canvas);
      frontHost.current?.appendChild(front.canvas);

      const bg = new Container();
      const fx = new Container();
      fx.blendMode = 'add';
      app.stage.addChild(bg);
      front.stage.addChild(fx);

      // Particle textures belong to the front renderer.
      const dot = front.renderer.generateTexture(new Graphics().circle(0, 0, 8).fill(0xffffff));
      const ring = front.renderer.generateTexture(new Graphics().circle(0, 0, 32).stroke({ width: 3, color: 0xffffff }));
      const rect = front.renderer.generateTexture(new Graphics().rect(0, 0, 8, 4).fill(0xffffff));

      // Soft radial glow drawn once on a 2D canvas: far cheaper than a blur filter.
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = glowCanvas.height = 256;
      const ctx = glowCanvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      const glow = Texture.from(glowCanvas);

      // Aurora glows. They replace the static CSS ones painted on the page while Pixi is up.
      const glows: Glow[] = [];
      const makeGlows = () => {
        bg.removeChildren().forEach((c) => c.destroy({ texture: false }));
        glows.length = 0;
        const w = app.screen.width;
        const h = app.screen.height;
        GLOWS.forEach((spec, i) => {
          const { color, alpha } = cssColor(spec.name);
          const g = new Sprite(glow);
          g.anchor.set(0.5);
          // Same footprint as the CSS glows, which fade to transparent at 70% of their radius.
          g.width = w * spec.rx * 1.4;
          g.height = h * spec.ry * 1.4;
          g.tint = color;
          g.alpha = alpha;
          const o: Glow = { g, fx: spec.fx, fy: spec.fy, ampX: 0.06, ampY: 0.05, speed: TAU / spec.loopMs, phase: i * 2.1 };
          g.position.set(w * o.fx, h * o.fy);
          bg.addChild(g);
          glows.push(o);
        });
        // Particles glow additively on the night water; on the day theme they would vanish, so blend normally.
        fx.blendMode = lightScheme() ? 'normal' : 'add';
      };

      makeGlows();
      document.documentElement.classList.add('has-aurora');
      cleanups.push(() => document.documentElement.classList.remove('has-aurora'));
      const onResize = () => {
        makeGlows();
        if (reducedRef.current) app.render();
      };
      window.addEventListener('resize', onResize);
      cleanups.push(() => window.removeEventListener('resize', onResize));
      const scheme = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : null;
      scheme?.addEventListener('change', onResize);
      cleanups.push(() => scheme?.removeEventListener('change', onResize));

      // Particles.
      const particles: Particle[] = [];
      const spawn = (tex: Texture, x: number, y: number, tint: number, opts: Partial<Particle> & { angle: number; speed: number; scale: number }) => {
        if (particles.length >= MAX_PARTICLES) return;
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.position.set(x, y);
        s.tint = tint;
        s.scale.set(opts.scale);
        s.rotation = Math.random() * Math.PI * 2;
        fx.addChild(s);
        particles.push({
          sprite: s,
          vx: Math.cos(opts.angle) * opts.speed,
          vy: Math.sin(opts.angle) * opts.speed,
          life: 0,
          maxLife: opts.maxLife ?? 700,
          gravity: opts.gravity ?? 0,
          spin: opts.spin ?? 0,
          drag: opts.drag ?? 0.985,
          grow: opts.grow ?? 0,
        });
      };

      clearParticlesRef.current = () => {
        particles.forEach((p) => p.sprite.destroy());
        particles.length = 0;
      };

      let tintTarget = 1;
      const handle = (e: FxEvent) => {
        if (reducedRef.current) return;
        switch (e.type) {
          case 'merge': {
            const color = tileStyle(e.value).glow;
            const power = Math.log2(e.value);
            const n = Math.min(10 + power * 4, 60);
            for (let i = 0; i < n; i++) {
              spawn(dot, e.x, e.y, color, {
                angle: Math.random() * Math.PI * 2,
                speed: 1.5 + Math.random() * (1.5 + power * 0.35),
                scale: 0.25 + Math.random() * 0.45,
                maxLife: 450 + Math.random() * 450,
                gravity: 0.03,
              });
            }
            spawn(ring, e.x, e.y, color, { angle: 0, speed: 0, scale: 0.4, maxLife: 420, grow: 0.045, drag: 1 });
            if (e.value >= 256) spawn(ring, e.x, e.y, 0xe9fbd9, { angle: 0, speed: 0, scale: 0.2, maxLife: 600, grow: 0.07, drag: 1 });
            break;
          }
          case 'spawn': {
            const foam = cssColor('--accent').color;
            for (let i = 0; i < 8; i++) {
              spawn(dot, e.x, e.y, foam, {
                angle: (i / 8) * Math.PI * 2,
                speed: 1.2,
                scale: 0.18,
                maxLife: 320,
                drag: 0.93,
              });
            }
            break;
          }
          case 'win':
            for (let i = 0; i < 220; i++) {
              spawn(rect, e.x, e.y, CONFETTI[i % CONFETTI.length]!, {
                angle: -Math.PI / 2 + (Math.random() - 0.5) * 2.2,
                speed: 6 + Math.random() * 10,
                scale: 0.9 + Math.random() * 0.9,
                maxLife: 2200 + Math.random() * 1200,
                gravity: 0.16,
                spin: (Math.random() - 0.5) * 0.4,
                drag: 0.985,
              });
            }
            break;
          case 'gameOver':
            tintTarget = 0.35;
            break;
          case 'reset':
            tintTarget = 1;
            break;
        }
      };
      cleanups.push(fxBus.on(handle));

      let elapsed = 0;
      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS;
        const f = ticker.deltaTime;
        elapsed += dt;

        const w = app.screen.width;
        const h = app.screen.height;
        for (const o of glows) {
          const t = elapsed * o.speed + o.phase;
          o.g.position.set(w * (o.fx + Math.sin(t) * o.ampX), h * (o.fy + Math.cos(t) * o.ampY));
        }
        bg.alpha += (tintTarget - bg.alpha) * 0.05 * f;

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]!;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.sprite.destroy();
            particles.splice(i, 1);
            continue;
          }
          p.vx *= Math.pow(p.drag, f);
          p.vy = p.vy * Math.pow(p.drag, f) + p.gravity * f;
          p.sprite.x += p.vx * f;
          p.sprite.y += p.vy * f;
          p.sprite.rotation += p.spin * f;
          if (p.grow) p.sprite.scale.set(p.sprite.scale.x + p.grow * f);
          p.sprite.alpha = 1 - p.life / p.maxLife;
        }
      });

      const onVisibility = () => {
        apps.forEach((a) => applyReduced(a, reducedRef.current));
      };
      document.addEventListener('visibilitychange', onVisibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

      apps.forEach((a) => applyReduced(a, reducedRef.current));
    })();

    return () => {
      destroyed = true;
      cleanups.forEach((c) => c());
      if (ready) apps.forEach((a) => a.destroy(true, { children: true, texture: true }));
      appsRef.current = [];
    };
  }, []);

  // React to the reduced-motion preference changing at runtime.
  useEffect(() => {
    reducedRef.current = reduced;
    if (reduced) clearParticlesRef.current();
    appsRef.current.forEach((a) => applyReduced(a, reduced));
  }, [reduced]);

  return (
    <>
      <div ref={backHost} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <div ref={frontHost} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none' }} />
    </>
  );
}

/** Runs the ticker only while motion is allowed and the tab is visible. */
function applyReduced(app: Application, reduced: boolean) {
  if (reduced || document.hidden) {
    app.ticker.stop();
    app.render(); // keep one still frame of the background
  } else {
    app.ticker.start();
  }
}
