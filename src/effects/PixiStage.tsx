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

interface Orb {
  g: Sprite;
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speed: number;
  phase: number;
}

interface Star {
  g: Graphics;
  speed: number;
  phase: number;
}

const MAX_PARTICLES = 700;
const ORB_COLORS = [0x7c4dff, 0xff4fd8, 0x00d4ff, 0xffb300, 0x00e676, 0xff6e40];
const CONFETTI = [0xffd400, 0xff4fd8, 0x4fc3f7, 0x00e676, 0xff6e40, 0xffffff];

/**
 * Two full-screen decorative PixiJS canvases: one behind the UI with drifting
 * glow orbs and a twinkling starfield, one in front of it for particle bursts
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
      const stars = new Container();
      const fx = new Container();
      fx.blendMode = 'add';
      app.stage.addChild(bg, stars);
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

      // Background orbs.
      const orbs: Orb[] = [];
      const makeOrbs = () => {
        bg.removeChildren().forEach((c) => c.destroy({ texture: false }));
        orbs.length = 0;
        const w = app.screen.width;
        const h = app.screen.height;
        const r = Math.max(w, h) * 0.35;
        ORB_COLORS.forEach((color, i) => {
          const g = new Sprite(glow);
          g.anchor.set(0.5);
          g.width = g.height = r * 2;
          g.tint = color;
          g.alpha = 0.35;
          g.blendMode = 'add';
          const orb: Orb = {
            g,
            baseX: w * (0.15 + 0.7 * ((i * 0.37) % 1)),
            baseY: h * (0.15 + 0.7 * ((i * 0.61) % 1)),
            ampX: w * 0.12,
            ampY: h * 0.1,
            speed: 0.00012 + i * 0.00003,
            phase: i * 1.7,
          };
          g.position.set(orb.baseX, orb.baseY);
          bg.addChild(g);
          orbs.push(orb);
        });
      };

      const starList: Star[] = [];
      const makeStars = () => {
        stars.removeChildren().forEach((c) => c.destroy());
        starList.length = 0;
        const count = Math.round((app.screen.width * app.screen.height) / 9000);
        for (let i = 0; i < count; i++) {
          const g = new Graphics().circle(0, 0, Math.random() * 1.4 + 0.4).fill(0xffffff);
          g.position.set(Math.random() * app.screen.width, Math.random() * app.screen.height);
          g.alpha = 0.3 + Math.random() * 0.5;
          stars.addChild(g);
          starList.push({ g, speed: 0.001 + Math.random() * 0.003, phase: Math.random() * Math.PI * 2 });
        }
      };

      makeOrbs();
      makeStars();
      const onResize = () => {
        makeOrbs();
        makeStars();
        if (reducedRef.current) app.render();
      };
      window.addEventListener('resize', onResize);
      cleanups.push(() => window.removeEventListener('resize', onResize));

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
            if (e.value >= 256) spawn(ring, e.x, e.y, 0xffffff, { angle: 0, speed: 0, scale: 0.2, maxLife: 600, grow: 0.07, drag: 1 });
            break;
          }
          case 'spawn':
            for (let i = 0; i < 8; i++) {
              spawn(dot, e.x, e.y, 0xffffff, {
                angle: (i / 8) * Math.PI * 2,
                speed: 1.2,
                scale: 0.18,
                maxLife: 320,
                drag: 0.93,
              });
            }
            break;
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

        for (const o of orbs) {
          const t = elapsed * o.speed + o.phase;
          o.g.position.set(o.baseX + Math.sin(t) * o.ampX, o.baseY + Math.cos(t * 1.3) * o.ampY);
        }
        bg.alpha += (tintTarget - bg.alpha) * 0.05 * f;

        for (const s of starList) s.g.alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.phase));

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
