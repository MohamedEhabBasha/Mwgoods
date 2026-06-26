import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  viewChild,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Matter from 'matter-js';

gsap.registerPlugin(SplitText, ScrollTrigger);

@Component({
  selector: 'app-hp-chain-bullets',
  standalone: true,
  imports: [],
  templateUrl: './hp-chain-bullets.html',
  styleUrl: './hp-chain-bullets.css',
})
export class HpChainBullets implements AfterViewInit, OnDestroy, OnInit {
  public screenWidth = signal<number>(0);

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private engine!: Matter.Engine;
  private render!: Matter.Render;
  private runner!: Matter.Runner;
  private isInitialised = false;

  public cards = [
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

  headerContainer = viewChild<ElementRef<HTMLElement>>('headerContainer');
  productsHeading = viewChild<ElementRef<HTMLElement>>('productsHeading');
  empireHeading = viewChild<ElementRef<HTMLElement>>('empireHeading');
  squareMarker = viewChild<ElementRef<HTMLElement>>('squareMarker');
  subtitleWordsContainer = viewChild<ElementRef<HTMLElement>>('subtitleWordsContainer');

  ngAfterViewInit(): void {
    this.initPhysics();
  }

  ngOnInit(): void {
    this.screenWidth.set(window.innerWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth.set(window.innerWidth);
    // Debounce slightly or just clean and reload physics layouts on resize
    this.clearPhysics();
    this.initPhysics();
  }

  public animateChainBulletsSection() {
    const headerContainerEl = this.headerContainer()?.nativeElement;

    const productsEl = this.productsHeading()?.nativeElement;

    const empireEl = this.empireHeading()?.nativeElement;

    const squareEl = this.squareMarker()?.nativeElement;

    const containerEl = this.subtitleWordsContainer()?.nativeElement;

    if (!productsEl || !empireEl || !squareEl || !containerEl) return;

    // Initialize SplitText on the paragraph element text node directly

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

        //markers: true,
      },

      defaults: { ease: 'power1.out', duration: 0.8 },
    });

    tl.from(productsEl, { xPercent: -100, opacity: 0 })

      .from(empireEl, { xPercent: 100, opacity: 0 }, '<0.1')

      // Target the generated word arrays directly via splitTextInstance.words

      .to(
        splitTextInstance.words,

        {
          yPercent: 0,

          opacity: 1,

          stagger: 0.02,

          duration: 0.5,

          ease: 'power3.out',
        },

        '-=0.3',
      )

      .from(squareEl, { scale: 0, opacity: 0, duration: 0.3 }, '-=0.2');

    return tl;
  }

  private clearPhysics(): void {
    if (!this.isInitialised) return;

    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
    if (this.engine) {
      Matter.Engine.clear(this.engine);
    }
    this.isInitialised = false;
  }

  private initPhysics(): void {
    const {
      Engine,
      Render,
      Runner,
      Body,
      Bodies,
      Composite,
      Composites,
      Constraint,
      Mouse,
      MouseConstraint,
      Events,
    } = Matter;

    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    const W = parent?.clientWidth ?? 1200;
    const H = parent?.clientHeight ?? 600;

    this.engine = Engine.create({ positionIterations: 12, velocityIterations: 12 });
    const world = this.engine.world;
    this.engine.gravity.y = 0.8;

    this.render = Render.create({
      canvas,
      engine: this.engine,
      options: { width: W, height: H, background: 'transparent', wireframes: false },
    });

    Render.run(this.render);
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
    this.isInitialised = true;

    // --- Dynamic Responsive Sizing Matrix ---
    let squareSize = 320;
    let squareGap = 140;
    let titleFontSize = '16px';
    let bodyFontSize = '12px';
    let iconFontSize = '36px';
    let textLineHeight = 20;

    const currentWidth = window.innerWidth;

    if (currentWidth < 640) {
      // Mobile (sm)
      squareSize = 150;
      squareGap = 20;
      iconFontSize = '20px';
      titleFontSize = '9px';
      bodyFontSize = '9px';
      textLineHeight = 13;
    } else if (currentWidth < 1024) {
      // Tablets (md)
      squareSize = 220;
      squareGap = 20;
      iconFontSize = '28px';
      titleFontSize = '10px';
      bodyFontSize = '11px';
      textLineHeight = 16;
    } else if (currentWidth < 1280) {
      // Large Screens (lg)
      squareSize = 280;
      squareGap = 90;
    }

    // --- Layout Computations ---
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
      squareXs[0] - squareSize / 2 - (currentWidth < 640 ? 15 : 40),
      squareXs[0] + squareSize / 2 + squareGap / 2,
      squareXs[1] + squareSize / 2 + squareGap / 2,
      squareXs[2] + squareSize / 2 + (currentWidth < 640 ? 15 : 40),
    ];

    // Create squares
    const squares = squareXs.map((sx) =>
      Bodies.rectangle(sx, squareY, squareSize, squareSize, {
        density: 0.005,
        frictionAir: 0.04,
        restitution: 0.3,
        chamfer: { radius: currentWidth < 640 ? 15 : 30 },
        render: { fillStyle: '#fff' },
      }),
    );

    // --- Rope factory ---
    const buildRope = (
      anchorX: number,
      squareBody: Matter.Body,
      squareOffsetX: number,
    ): Matter.Composite => {
      const linksCount = currentWidth < 640 ? 2 : 3;
      const linkRadius = currentWidth < 640 ? 8 : 15;

      const rope = Composites.stack(
        anchorX,
        anchorY,
        linksCount,
        1,
        10,
        10,
        (x: number, y: number) => {
          return Bodies.circle(x - linkRadius, y, linkRadius, {
            collisionFilter: { group },
            density: 0.001,
            frictionAir: 0.1,
            render: { fillStyle: '#333' },
          });
        },
      );

      Composites.chain(rope, 0.3, 0, -0.3, 0, { stiffness: 1, length: 1 });

      // Pin link to anchor
      Composite.add(
        rope,
        Constraint.create({
          pointA: { x: anchorX, y: anchorY },
          bodyB: rope.bodies[0],
          pointB: { x: -linkRadius, y: 0 },
          stiffness: 1,
          length: 0,
          render: { strokeStyle: '#333', lineWidth: 1 },
        }),
      );

      // Connect link to square side
      Composite.add(
        rope,
        Constraint.create({
          bodyA: rope.bodies[rope.bodies.length - 1],
          pointA: { x: linkRadius, y: 0 },
          bodyB: squareBody,
          pointB: { x: squareOffsetX, y: 0 },
          stiffness: 0.5,
          length: 0,
          render: { strokeStyle: '#333', lineWidth: 1 },
        }),
      );

      // Invisible stabiliser
      Composite.add(
        world,
        Constraint.create({
          pointA: { x: anchorX, y: anchorY },
          bodyB: squareBody,
          pointB: { x: squareOffsetX, y: 0 },
          stiffness: 0.5,
          length: currentWidth < 640 ? 60 : 100,
          render: { visible: false },
        }),
      );

      return rope;
    };

    // Wire up ropes
    const rope0L = buildRope(anchorXs[0], squares[0], -squareSize / 2);
    const rope0R = buildRope(anchorXs[1], squares[0], squareSize / 2);
    const rope1L = buildRope(anchorXs[1], squares[1], -squareSize / 2);
    const rope1R = buildRope(anchorXs[2], squares[1], squareSize / 2);
    const rope2L = buildRope(anchorXs[2], squares[2], -squareSize / 2);
    const rope2R = buildRope(anchorXs[3], squares[2], squareSize / 2);

    Composite.add(world, [...squares, rope0L, rope0R, rope1L, rope1R, rope2L, rope2R]);

    // --- Dynamic Text Renderer Engine ---
    Events.on(this.render, 'afterRender', () => {
      const ctx = this.render.context;

      // Dynamic Anchor dots
      anchorXs.forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, anchorY, currentWidth < 640 ? 4 : 6, 0, Math.PI * 2);
        ctx.fillStyle = '#d32f2f';
        ctx.fill();
      });

      // Card rendering
      squares.forEach((square, i) => {
        const card = this.cards[i];
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

        // Responsive text wrapping
        ctx.font = `400 ${bodyFontSize} "Open Sans", system-ui, sans-serif`;
        ctx.fillStyle = '#64748b';
        const maxW = squareSize - (currentWidth < 640 ? 20 : 40);
        const words = card.body.split(' ');
        let line = '';
        const lines: string[] = [];

        for (const word of words) {
          const test = line + word + ' ';
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line.trim());
            line = word + ' ';
          } else {
            line = test;
          }
        }
        lines.push(line.trim());

        const textStartY = squareSize * 0.05;
        lines.forEach((l, idx) => {
          ctx.fillText(l, 0, textStartY + idx * textLineHeight);
        });

        ctx.restore();
      });
    });

    // --- Mouse drag ---
    const mouse = Mouse.create(this.render.canvas);
    const mouseConstraint = MouseConstraint.create(this.engine, {
      mouse,
      constraint: {
        stiffness: 0.1,
        render: { visible: false },
      },
    });

    Composite.add(world, mouseConstraint);
    this.render.mouse = mouse;

    const canvasElement = this.render.canvas;

    if ((mouse as any).element) {
      (mouse as any).element.removeEventListener('mousewheel', (mouse as any).mousewheel);
      (mouse as any).element.removeEventListener('DOMMouseScroll', (mouse as any).mousewheel);
    }

    canvasElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (!mouseConstraint.body) {
          window.scrollBy({
            top: event.deltaY,
            left: event.deltaX,
            behavior: 'auto',
          });
        }
      },
      { passive: true },
    );
  }

  ngOnDestroy(): void {
    this.clearPhysics();
  }
}
