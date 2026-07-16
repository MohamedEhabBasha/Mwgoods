import {
  Component,
  ElementRef,
  DestroyRef,
  HostListener,
  inject,
  viewChild,
  afterNextRender,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Matter from 'matter-js';

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('matterCanvas');
  private readonly destroyRef = inject(DestroyRef);
  private linkHoverCleanups: (() => void)[] = [];

  private engine!: Matter.Engine;
  private render!: Matter.Render;
  private runner!: Matter.Runner;
  private morphTrigger?: ScrollTrigger;
  private dropTrigger?: ScrollTrigger;
  private hasDropped = false;
  private isInitialised = false;
  private resizeRaf = 0;

  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/' },
    { label: 'About', route: '/about' },
    { label: 'Community', route: '/community' },
    { label: 'Sell', route: '/sell' },
  ];

  private readonly DOWN_PATH = 'M0-0.3C0-0.3,464,156,1139,156S2278-0.3,2278-0.3V683H0V-0.3z';
  private readonly CENTER_PATH = 'M0-0.3C0-0.3,464,0,1139,0s1139-0.3,1139-0.3V683H0V-0.3z';
  private readonly LETTERS = ['M', 'W', 'G', 'O', 'O', 'D', 'S'];

  private currentSquareSize = 150;
  private currentSquareGap = 40;
  private currentFontSize = 135;
  private currentCanvasW = 1200;

  constructor() {
    afterNextRender(() => {
      this.initMatterFooter();
    });

    this.destroyRef.onDestroy(() => {
      this.clearPhysics();
      this.morphTrigger?.kill();
      this.dropTrigger?.kill();
      cancelAnimationFrame(this.resizeRaf);
      this.linkHoverCleanups.forEach((fn) => fn());
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    // Debounce via rAF so rapid resize events don't thrash Matter re-init
    cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => {
      this.clearPhysics();
      this.initMatterFooter();
      ScrollTrigger.refresh();
    });
  }

  public initLinkScramble(): void {
    const links = document.querySelectorAll<HTMLAnchorElement>('.footer nav a');

    links.forEach((link) => {
      const textSpan = link.querySelector('.link-text') as HTMLElement;
      const dot = link.querySelector('.paragraph-square') as HTMLElement;
      if (!textSpan) return;

      const original = textSpan.textContent ?? '';
      let tween: gsap.core.Tween | null = null;

      const onEnter = () => {
        tween?.kill();
        tween = gsap.to(textSpan, {
          duration: 0.6,
          scrambleText: {
            text: original,
            chars: 'upperCase',
            speed: 0.4,
            revealDelay: 0.05,
          },
          ease: 'none',
        });

        gsap.to(dot, {
          scale: 1.6,
          backgroundColor: '#ffffff',
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      const onLeave = () => {
        tween?.kill();
        tween = gsap.to(textSpan, {
          duration: 0.4,
          scrambleText: {
            text: original,
            chars: 'upperCase',
            speed: 0.5,
            revealDelay: 0.02,
          },
          ease: 'none',
        });

        gsap.to(dot, {
          scale: 1,
          backgroundColor: '',
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);

      this.linkHoverCleanups.push(() => {
        link.removeEventListener('mouseenter', onEnter);
        link.removeEventListener('mouseleave', onLeave);
        tween?.kill();
      });
    });
  }

  private computeLayout(W: number): void {
    if (W >= 1440) {
      this.currentSquareSize = 150;
      this.currentSquareGap = 40;
    } else if (W >= 1280) {
      this.currentSquareSize = 120;
      this.currentSquareGap = 30;
    } else {
      this.currentSquareSize = 95;
      this.currentSquareGap = 20;
    }
    this.currentFontSize = this.currentSquareSize * 0.9;
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

  private buildArcFloor(world: Matter.World, W: number, H: number): void {
    const { Bodies, Composite } = Matter;

    const peakY = (H + 150) * 0.5;
    const baseY = (H + 150) * 0.8;
    const segments = 48;

    const arcY = (x: number): number => {
      const t = (x / W) * Math.PI;
      return baseY - (baseY - peakY) * Math.sin(t);
    };

    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      pts.push({ x: (i / segments) * W, y: arcY((i / segments) * W) });
    }

    const floorBodies: Matter.Body[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      floorBodies.push(
        Bodies.rectangle(cx, cy, len + 1, 6, {
          isStatic: true,
          angle,
          friction: 0.6,
          restitution: 0.25,
          render: { fillStyle: '#d32f2f', strokeStyle: 'transparent', lineWidth: 0 },
        }),
      );
    }
    // Batch add — single Composite.add call instead of one per segment
    Composite.add(world, floorBodies);
  }

  private initMatterFooter(): void {
    const { Engine, Render, Runner, Body, Bodies, Composite, Constraint, Events } = Matter;

    const canvas = this.canvasRef().nativeElement;
    const parent = canvas.parentElement!;
    const W = parent.clientWidth || 1200;
    const H = parent.clientHeight || window.innerHeight;
    this.currentCanvasW = W;

    this.computeLayout(W);

    canvas.style.pointerEvents = 'none';

    this.engine = Engine.create({ positionIterations: 14, velocityIterations: 14 });
    const world = this.engine.world;
    this.engine.gravity.y = 1.2;

    this.render = Render.create({
      canvas,
      engine: this.engine,
      options: {
        width: W,
        height: H,
        background: 'transparent',
        wireframes: false,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // cap DPR to avoid 3x/4x canvas cost on high-density displays
      },
    });

    Render.run(this.render);
    this.runner = Runner.create();
    this.isInitialised = true;

    this.buildArcFloor(world, W, H);

    const wallOpts = {
      isStatic: true,
      render: { fillStyle: 'transparent', strokeStyle: 'transparent', lineWidth: 0 },
    };
    Composite.add(world, [
      Bodies.rectangle(-25, H / 2, 50, H * 2, wallOpts),
      Bodies.rectangle(W + 25, H / 2, 50, H * 2, wallOpts),
    ]);

    const totalChainW =
      this.LETTERS.length * this.currentSquareSize +
      (this.LETTERS.length - 1) * this.currentSquareGap;
    const startX = (W - totalChainW) / 2 + this.currentSquareSize / 2;
    const dropY = -this.currentSquareSize * 2;

    const collisionGroup = Body.nextGroup(true);

    const squares = this.LETTERS.map((_, i) =>
      Bodies.rectangle(
        startX + i * (this.currentSquareSize + this.currentSquareGap),
        dropY - i * 30,
        this.currentSquareSize,
        this.currentSquareSize,
        {
          density: 0.006,
          frictionAir: 0.03,
          restitution: 0.3,
          friction: 0.5,
          chamfer: { radius: W < 1280 ? 12 : 20 },
          collisionFilter: { group: collisionGroup },
          render: { fillStyle: '#d32f2f' },
        },
      ),
    );

    const links: Matter.Body[] = [];
    const constraints: Matter.Constraint[] = [];
    const linkRadius = W < 1280 ? 8 : 12;

    for (let i = 0; i < squares.length - 1; i++) {
      const currentSquareX = startX + i * (this.currentSquareSize + this.currentSquareGap);
      const circleX = currentSquareX + this.currentSquareSize + this.currentSquareGap / 2;

      const link = Bodies.circle(circleX, dropY - i * 30, linkRadius, {
        density: 0.001,
        frictionAir: 0.1,
        collisionFilter: { group: collisionGroup },
        render: { fillStyle: '#fff' },
      });
      links.push(link);

      constraints.push(
        Constraint.create({
          bodyA: squares[i],
          pointA: { x: this.currentSquareSize / 2, y: 0 },
          bodyB: link,
          pointB: { x: 0, y: 0 },
          stiffness: 0.7,
          length: linkRadius,
          render: { strokeStyle: '#333', lineWidth: 2, visible: false },
        }),
      );

      constraints.push(
        Constraint.create({
          bodyA: link,
          pointA: { x: 0, y: 0 },
          bodyB: squares[i + 1],
          pointB: { x: -this.currentSquareSize / 2, y: 0 },
          stiffness: 0.7,
          length: linkRadius,
          render: { strokeStyle: '#333', lineWidth: 2, visible: false },
        }),
      );
    }

    Composite.add(world, [...squares, ...links, ...constraints]);

    // Pre-compute font string once instead of rebuilding it every frame
    const fontString = `900 ${this.currentFontSize}px "Open Sans", system-ui, sans-serif`;

    Events.on(this.render, 'afterRender', () => {
      const ctx = this.render.context;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = fontString;
      ctx.fillStyle = '#fff';

      squares.forEach((sq, i) => {
        ctx.save();
        ctx.translate(sq.position.x, sq.position.y);
        ctx.rotate(sq.angle);
        ctx.fillText(this.LETTERS[i], 0, 2);
        ctx.restore();
      });
    });

    (this as any)._squares = squares;
    (this as any)._links = links;
    (this as any)._world = world;
  }

  public initMorphAnimation(): void {
    this.morphTrigger?.kill();

    this.morphTrigger = ScrollTrigger.create({
      trigger: '.footer',
      start: 'top bottom',
      end: 'bottom top',
      onEnter: (self) => {
        const velocity = self.getVelocity();
        const variation = velocity / 10000;

        gsap.fromTo(
          ['#bouncy-path', '#bouncy-path-stroke'],
          { morphSVG: this.DOWN_PATH },
          {
            duration: 2,
            morphSVG: this.CENTER_PATH,
            ease: `elastic.out(${1 + variation}, ${1 - variation})`,
            overwrite: 'auto',
          },
        );
      },
      onLeave: () => this.collapseBouncyPath(),
      onLeaveBack: () => this.collapseBouncyPath(),
    });
  }

  private collapseBouncyPath(): void {
    gsap.to(['#bouncy-path', '#bouncy-path-stroke'], {
      duration: 0.5,
      morphSVG: this.DOWN_PATH,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  /** Re-armed on every navigation, so it plays once per page instead of once ever */
  public initDropChainAnimation(): void {
    if (this.hasDropped) {
      return;
    }

    this.dropTrigger?.kill();

    this.dropTrigger = ScrollTrigger.create({
      trigger: '.footer',
      start: 'top center',
      once: true,
      onEnter: () => {
        if (!this.hasDropped) {
          this.hasDropped = true;
          this.dropChain();
        }
      },
    });
  }

  private dropChain(): void {
    const squares: Matter.Body[] = (this as any)._squares;
    const links: Matter.Body[] = (this as any)._links;
    if (!squares || !links) return;

    Matter.Runner.run(this.runner, this.engine);

    const W = this.currentCanvasW;

    const totalChainW =
      this.LETTERS.length * this.currentSquareSize +
      (this.LETTERS.length - 1) * this.currentSquareGap;
    const startX = (W - totalChainW) / 2 + this.currentSquareSize / 2;
    const dropY = -this.currentSquareSize;

    squares.forEach((sq, i) => {
      Matter.Body.setPosition(sq, {
        x: startX + i * (this.currentSquareSize + this.currentSquareGap),
        y: dropY - i * 20,
      });
      Matter.Body.setVelocity(sq, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(sq, 0);
    });

    links.forEach((link, i) => {
      const currentSquareX = startX + i * (this.currentSquareSize + this.currentSquareGap);
      const circleX = currentSquareX + this.currentSquareSize + this.currentSquareGap / 2;

      Matter.Body.setPosition(link, {
        x: circleX,
        y: dropY - i * 20 - 10,
      });
      Matter.Body.setVelocity(link, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(link, 0);
    });
  }
}
