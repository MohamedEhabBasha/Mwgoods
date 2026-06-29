import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  HostListener,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import Matter from 'matter-js';

gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin);

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements AfterViewInit, OnDestroy {
  @ViewChild('matterCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private engine!: Matter.Engine;
  private render!: Matter.Render;
  private runner!: Matter.Runner;
  private triggerInstance?: ScrollTrigger;
  private hasDropped = false;
  private isInitialised = false;

  private readonly LETTERS = ['M', 'W', 'G', 'O', 'O', 'D', 'S'];

  // Responsive layout values determined at runtime
  private currentSquareSize = 150;
  private currentSquareGap = 40;
  private currentFontSize = 135;

  ngAfterViewInit(): void {
    this.initMatterFooter();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // Re-initialize physics to map perfectly to new container widths
    this.clearPhysics();
    this.initMatterFooter();

    // Refresh ScrollTrigger parameters to sync up new calculations
    ScrollTrigger.refresh();
  }

  private computeLayout(W: number): void {
    // Desktop layout baseline adjustments
    if (W >= 1440) {
      this.currentSquareSize = 150;
      this.currentSquareGap = 40;
    } else if (W >= 1280) {
      this.currentSquareSize = 120;
      this.currentSquareGap = 30;
    } else {
      // Tailwind desktop base scale breakdown (1024px to 1279px viewport ranges)
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

  // ─── SVG arc floor ────────────────────────────────────────────────────────
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

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      Composite.add(
        world,
        Bodies.rectangle(cx, cy, len + 1, 6, {
          isStatic: true,
          angle,
          friction: 0.6,
          restitution: 0.25,
          render: { fillStyle: '#d32f2f', strokeStyle: 'transparent', lineWidth: 0 },
        }),
      );
    }
  }

  // ─── Physics init ──────────────────────────────────────────────────────────
  private initMatterFooter(): void {
    const { Engine, Render, Runner, Body, Bodies, Composite, Constraint, Events } = Matter;

    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const W = parent.clientWidth || 1200;
    const H = parent.clientHeight || window.innerHeight;

    // Set computed scales
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
      },
    });

    Render.run(this.render);
    this.runner = Runner.create();
    //Runner.run(this.runner, this.engine);
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

    // ── Letter squares ──
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

    // ── Single Circle Links between Squares ──
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

      // Connect Left Square to Circle
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

      // Connect Circle to Right Square
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

    // Custom text overlays with updated sizes
    Events.on(this.render, 'afterRender', () => {
      const ctx = this.render.context;
      squares.forEach((sq, i) => {
        ctx.save();
        ctx.translate(sq.position.x, sq.position.y);
        ctx.rotate(sq.angle);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${this.currentFontSize}px "Open Sans", system-ui, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText(this.LETTERS[i], 0, 2);

        ctx.restore();
      });
    });

    (this as any)._squares = squares;
    (this as any)._links = links;
    (this as any)._world = world;
  }

  public footerAnimation(): void {
    const down = 'M0-0.3C0-0.3,464,156,1139,156S2278-0.3,2278-0.3V683H0V-0.3z';
    const center = 'M0-0.3C0-0.3,464,0,1139,0s1139-0.3,1139-0.3V683H0V-0.3z';

    if (this.triggerInstance) {
      this.triggerInstance.kill();
    }

    // ── Existing morph trigger (start/end untouched) ──────────────────────
    this.triggerInstance = ScrollTrigger.create({
      trigger: '.footer',
      start: 'top bottom',
      end: 'bottom top',
      onEnter: (self) => {
        const velocity = self.getVelocity();
        const variation = velocity / 10000;

        gsap.fromTo(
          ['#bouncy-path', '#bouncy-path-stroke'],
          { morphSVG: down },
          {
            duration: 2,
            morphSVG: center,
            ease: `elastic.out(${1 + variation}, ${1 - variation})`,
            overwrite: 'auto',
          },
        );
      },
      onLeave: () => {
        gsap.to(['#bouncy-path', '#bouncy-path-stroke'], {
          duration: 0.5,
          morphSVG: down,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      },
      onLeaveBack: () => {
        gsap.to(['#bouncy-path', '#bouncy-path-stroke'], {
          duration: 0.5,
          morphSVG: down,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      },
    });

    // ── Drop chain trigger — fires when footer is actually visible ────────
    ScrollTrigger.create({
      trigger: '.footer',
      start: 'top center',
      once: true,
      //markers: true,
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

    console.log('FIRED')
    Matter.Runner.run(this.runner, this.engine);

    const canvas = this.canvasRef.nativeElement;
    const W = canvas.width;
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

  ngOnDestroy(): void {
    this.clearPhysics();
    if (this.triggerInstance) this.triggerInstance.kill();
  }
}
