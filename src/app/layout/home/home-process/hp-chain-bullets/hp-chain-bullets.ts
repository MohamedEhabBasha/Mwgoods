import {
  Component,
  ElementRef,
  viewChild,
  afterNextRender,
  inject,
  DestroyRef,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import Matter from 'matter-js';

// ---- Types ----
interface Card {
  icon: string;
  title: string;
  body: string;
}

interface BreakpointConfig {
  squareSize: number;
  squareGap: number;
  titleFontSize: string;
  bodyFontSize: string;
  iconFontSize: string;
  textLineHeight: number;
  linkCount: number;
  linkRadius: number;
  anchorDotRadius: number;
  anchorOffset: number;
  chamferRadius: number;
  stabilizerLength: number;
  maxTextPad: number;
}

interface CachedCardLines {
  lines: string[];
}

@Component({
  selector: 'app-hp-chain-bullets',
  standalone: true,
  imports: [],
  templateUrl: './hp-chain-bullets.html',
  styleUrl: './hp-chain-bullets.css',
})
export class HpChainBullets {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  // ---- Template refs ----
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private headerContainer = viewChild<ElementRef<HTMLElement>>('headerContainer');
  private productsHeading = viewChild<ElementRef<HTMLElement>>('productsHeading');
  private empireHeading = viewChild<ElementRef<HTMLElement>>('empireHeading');
  private squareMarker = viewChild<ElementRef<HTMLElement>>('squareMarker');
  private subtitleWordsContainer = viewChild<ElementRef<HTMLElement>>('subtitleWordsContainer');

  // ---- Reactive state ----
  private screenWidth = signal(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  // Derived breakpoint config — recomputes only when screenWidth crosses a boundary
  private config = computed<BreakpointConfig>(() => {
    const w = this.screenWidth();
    if (w < 640) {
      return {
        squareSize: 150, squareGap: 20,
        iconFontSize: '20px', titleFontSize: '9px',
        bodyFontSize: '9px', textLineHeight: 13,
        linkCount: 2, linkRadius: 8,
        anchorDotRadius: 4, anchorOffset: 15,
        chamferRadius: 15, stabilizerLength: 60,
        maxTextPad: 20,
      };
    } else if (w < 1024) {
      return {
        squareSize: 220, squareGap: 20,
        iconFontSize: '28px', titleFontSize: '10px',
        bodyFontSize: '11px', textLineHeight: 16,
        linkCount: 3, linkRadius: 15,
        anchorDotRadius: 6, anchorOffset: 40,
        chamferRadius: 30, stabilizerLength: 100,
        maxTextPad: 40,
      };
    } else if (w < 1280) {
      return {
        squareSize: 280, squareGap: 90,
        iconFontSize: '36px', titleFontSize: '16px',
        bodyFontSize: '12px', textLineHeight: 20,
        linkCount: 3, linkRadius: 15,
        anchorDotRadius: 6, anchorOffset: 40,
        chamferRadius: 30, stabilizerLength: 100,
        maxTextPad: 40,
      };
    } else {
      return {
        squareSize: 320, squareGap: 140,
        iconFontSize: '36px', titleFontSize: '16px',
        bodyFontSize: '12px', textLineHeight: 20,
        linkCount: 3, linkRadius: 15,
        anchorDotRadius: 6, anchorOffset: 40,
        chamferRadius: 30, stabilizerLength: 100,
        maxTextPad: 40,
      };
    }
  });

  // ---- Static card data ----
  readonly cards: Card[] = [
    {
      icon: '🚀',
      title: 'LAUNCH IN MINUTES',
      body: 'Set up your storefront instantly and start reaching thousands of eager buyers — no tech experience needed.',
    },
    {
      icon: '💰',
      title: 'Keep More of What You Earn',
      body: 'Our transparent, low-fee structure means your hard work translates directly into real profit, every sale.',
    },
    {
      icon: '🌍',
      title: 'Sell to the World',
      body: 'Break free from local limits. Your products deserve a global audience — and now they can have one.',
    },
  ];

  // ---- Matter.js state ----
  private engine?: Matter.Engine;
  private render?: Matter.Render;
  private runner?: Matter.Runner;
  private isInitialised = false;
  private resizeTimeout?: ReturnType<typeof setTimeout>;

  // ---- Cached wrapped lines (computed once per resize, not per frame) ----
  private cachedLines: CachedCardLines[] = [];

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      this.initPhysics();

      const onResize = () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.screenWidth.set(window.innerWidth);
          this.clearPhysics();
          this.initPhysics();
        }, 200);
      };

      window.addEventListener('resize', onResize, { passive: true });

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        clearTimeout(this.resizeTimeout);
        this.clearPhysics();
      });
    });
  }

  // ---- Public: called by parent orchestrator ----
  public animateChainBulletsSection(): gsap.core.Timeline | undefined {
    const headerContainerEl = this.headerContainer()?.nativeElement;
    const productsEl = this.productsHeading()?.nativeElement;
    const empireEl = this.empireHeading()?.nativeElement;
    const squareEl = this.squareMarker()?.nativeElement;
    const containerEl = this.subtitleWordsContainer()?.nativeElement;

    if (!productsEl || !empireEl || !squareEl || !containerEl) return;

    const splitTextInstance = new SplitText(containerEl, {
      type: 'words',
      wordsClass: 'inline-block overflow-hidden',
    });

    gsap.set(splitTextInstance.words, { opacity: 0, yPercent: 100 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: headerContainerEl,
        start: 'top 30%',
        invalidateOnRefresh: true,
      },
      defaults: { ease: 'power1.out', duration: 0.8 },
    });

    tl.from(productsEl, { xPercent: -100, opacity: 0 })
      .from(empireEl, { xPercent: 100, opacity: 0 }, '<0.1')
      .to(
        splitTextInstance.words,
        { yPercent: 0, opacity: 1, stagger: 0.02, duration: 0.5, ease: 'power3.out' },
        '-=0.3',
      )
      .from(squareEl, { scale: 0, opacity: 0, duration: 0.3 }, '-=0.2');

    return tl;
  }

  // ---- Physics ----
  private clearPhysics(): void {
    if (!this.isInitialised) return;
    if (this.render) Matter.Render.stop(this.render);
    if (this.runner) Matter.Runner.stop(this.runner);
    if (this.engine) Matter.Engine.clear(this.engine);
    this.cachedLines = [];
    this.isInitialised = false;
  }

  private initPhysics(): void {
    const {
      Engine, Render, Runner, Body, Bodies,
      Composite, Composites, Constraint, Mouse, MouseConstraint, Events,
    } = Matter;

    const canvas = this.canvasRef().nativeElement;
    const parent = canvas.parentElement;
    const W = parent?.clientWidth ?? 1200;
    const H = parent?.clientHeight ?? 600;
    const cfg = this.config();

    // ---- Engine — use default iterations (6/6), sufficient for hanging squares ----
    this.engine = Engine.create();
    this.engine.gravity.y = 0.8;
    const world = this.engine.world;

    this.render = Render.create({
      canvas,
      engine: this.engine,
      options: {
        width: W,
        height: H,
        background: 'transparent',
        wireframes: false,
      },
    });

    Render.run(this.render);
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
    this.isInitialised = true;

    // ---- Layout ----
    const { squareSize, squareGap, anchorOffset } = cfg;
    const totalWidth = squareSize * 3 + squareGap * 2;
    const startX = (W - totalWidth) / 2 + squareSize / 2;
    const squareY = H / 2 + 30;
    const anchorY = H / 2 - 120;
    const group = Body.nextGroup(true);

    const squareXs = [
      startX,
      startX + squareSize + squareGap,
      startX + (squareSize + squareGap) * 2,
    ];

    const anchorXs = [
      squareXs[0] - squareSize / 2 - anchorOffset,
      squareXs[0] + squareSize / 2 + squareGap / 2,
      squareXs[1] + squareSize / 2 + squareGap / 2,
      squareXs[2] + squareSize / 2 + anchorOffset,
    ];

    // ---- Squares ----
    const squares = squareXs.map((sx) =>
      Bodies.rectangle(sx, squareY, squareSize, squareSize, {
        density: 0.005,
        frictionAir: 0.04,
        restitution: 0.3,
        chamfer: { radius: cfg.chamferRadius },
        render: { fillStyle: '#fff' },
      }),
    );

    // ---- Rope builder ----
    const buildRope = (
      anchorX: number,
      squareBody: Matter.Body,
      squareOffsetX: number,
    ): Matter.Composite => {
      const { linkCount, linkRadius, stabilizerLength } = cfg;

      const rope = Composites.stack(
        anchorX, anchorY, linkCount, 1, 10, 10,
        (x: number, y: number) =>
          Bodies.circle(x - linkRadius, y, linkRadius, {
            collisionFilter: { group },
            density: 0.001,
            frictionAir: 0.1,
            render: { fillStyle: '#333' },
          }),
      );

      Composites.chain(rope, 0.3, 0, -0.3, 0, { stiffness: 1, length: 1 });

      Composite.add(rope, Constraint.create({
        pointA: { x: anchorX, y: anchorY },
        bodyB: rope.bodies[0],
        pointB: { x: -linkRadius, y: 0 },
        stiffness: 1, length: 0,
        render: { strokeStyle: '#333', lineWidth: 1 },
      }));

      Composite.add(rope, Constraint.create({
        bodyA: rope.bodies[rope.bodies.length - 1],
        pointA: { x: linkRadius, y: 0 },
        bodyB: squareBody,
        pointB: { x: squareOffsetX, y: 0 },
        stiffness: 0.5, length: 0,
        render: { strokeStyle: '#333', lineWidth: 1 },
      }));

      Composite.add(world, Constraint.create({
        pointA: { x: anchorX, y: anchorY },
        bodyB: squareBody,
        pointB: { x: squareOffsetX, y: 0 },
        stiffness: 0.5,
        length: stabilizerLength,
        render: { visible: false },
      }));

      return rope;
    };

    const rope0L = buildRope(anchorXs[0], squares[0], -squareSize / 2);
    const rope0R = buildRope(anchorXs[1], squares[0], squareSize / 2);
    const rope1L = buildRope(anchorXs[1], squares[1], -squareSize / 2);
    const rope1R = buildRope(anchorXs[2], squares[1], squareSize / 2);
    const rope2L = buildRope(anchorXs[2], squares[2], -squareSize / 2);
    const rope2R = buildRope(anchorXs[3], squares[2], squareSize / 2);

    Composite.add(world, [
      ...squares, rope0L, rope0R, rope1L, rope1R, rope2L, rope2R,
    ]);

    // ---- Pre-cache wrapped text lines once per init, not per frame ----
    // Set up a temporary off-screen canvas to measure text widths
    const offscreen = document.createElement('canvas');
    const octx = offscreen.getContext('2d')!;
    const maxW = squareSize - cfg.maxTextPad;

    this.cachedLines = this.cards.map((card) => {
      octx.font = `400 ${cfg.bodyFontSize} "Open Sans", system-ui, sans-serif`;
      const words = card.body.split(' ');
      let line = '';
      const lines: string[] = [];

      for (const word of words) {
        const test = line + word + ' ';
        if (octx.measureText(test).width > maxW && line) {
          lines.push(line.trim());
          line = word + ' ';
        } else {
          line = test;
        }
      }
      lines.push(line.trim());
      return { lines };
    });

    // ---- Canvas text renderer — runs every physics frame ----
    // Uses cached lines — no measureText or word-wrap logic per frame
    Events.on(this.render, 'afterRender', () => {
      const ctx = this.render!.context;
      const { iconFontSize, titleFontSize, bodyFontSize, textLineHeight, anchorDotRadius } = cfg;

      // Anchor dots
      for (const x of anchorXs) {
        ctx.beginPath();
        ctx.arc(x, anchorY, anchorDotRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#d32f2f';
        ctx.fill();
      }

      // Cards
      for (let i = 0; i < squares.length; i++) {
        const square = squares[i];
        const card = this.cards[i];
        const { lines } = this.cachedLines[i];

        ctx.save();
        ctx.translate(square.position.x, square.position.y);
        ctx.rotate(square.angle);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Icon
        ctx.font = `${iconFontSize} system-ui, sans-serif`;
        ctx.fillText(card.icon, 0, -squareSize * 0.22);

        // Title
        ctx.font = `bold ${titleFontSize} "Open Sans", system-ui, sans-serif`;
        ctx.fillStyle = '#141c3a';
        ctx.fillText(card.title.toUpperCase(), 0, -squareSize * 0.07);

        // Body — use pre-cached lines
        ctx.font = `400 ${bodyFontSize} "Open Sans", system-ui, sans-serif`;
        ctx.fillStyle = '#64748b';
        const textStartY = squareSize * 0.05;

        for (let j = 0; j < lines.length; j++) {
          ctx.fillText(lines[j], 0, textStartY + j * textLineHeight);
        }

        ctx.restore();
      }
    });

    // ---- Mouse drag ----
    const mouse = Mouse.create(this.render.canvas);
    const mouseConstraint = MouseConstraint.create(this.engine, {
      mouse,
      constraint: { stiffness: 0.1, render: { visible: false } },
    });

    Composite.add(world, mouseConstraint);
    this.render.mouse = mouse;

    // Remove Matter's own wheel listeners so page scroll isn't blocked
    if ((mouse as any).element) {
      (mouse as any).element.removeEventListener('mousewheel', (mouse as any).mousewheel);
      (mouse as any).element.removeEventListener('DOMMouseScroll', (mouse as any).mousewheel);
    }

    this.render.canvas.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (!mouseConstraint.body) {
          window.scrollBy({ top: event.deltaY, left: event.deltaX, behavior: 'auto' });
        }
      },
      { passive: true },
    );
  }
}