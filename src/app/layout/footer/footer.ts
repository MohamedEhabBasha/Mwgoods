import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
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

  private readonly LETTERS = ['M', 'W', 'G', 'O', 'O', 'D', 'S'];
  private readonly SQUARE_SIZE = 150;
  private readonly SQUARE_GAP = 40; // Slightly wider gap to visually accommodate the link circle

  ngAfterViewInit(): void {
    this.initMatterFooter();
  }

  // ─── SVG arc floor ────────────────────────────────────────────────────────
  private buildArcFloor(world: Matter.World, W: number, H: number): void {
    const { Bodies, Composite } = Matter;

    const peakY = (H + 150) * 0.5;    
    const baseY = (H + 150) * 0.80;    
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
    const {
      Engine, Render, Runner, Body, Bodies, Composite,
      Constraint, Events,
    } = Matter;

    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const W = parent.clientWidth || 1200;
    const H = parent.clientHeight || window.innerHeight;

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
    Runner.run(this.runner, this.engine);

    this.buildArcFloor(world, W, H);

    const wallOpts = { isStatic: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent', lineWidth: 0 } };
    Composite.add(world, [
      Bodies.rectangle(-25, H / 2, 50, H * 2, wallOpts),
      Bodies.rectangle(W + 25, H / 2, 50, H * 2, wallOpts),
    ]);

    // ── Letter squares ──
    const totalChainW =
      this.LETTERS.length * this.SQUARE_SIZE +
      (this.LETTERS.length - 1) * this.SQUARE_GAP;
    const startX = (W - totalChainW) / 2 + this.SQUARE_SIZE / 2;
    const dropY = -this.SQUARE_SIZE * 2; 

    const collisionGroup = Body.nextGroup(true);

    const squares = this.LETTERS.map((_, i) =>
      Bodies.rectangle(
        startX + i * (this.SQUARE_SIZE + this.SQUARE_GAP),
        dropY - i * 30, 
        this.SQUARE_SIZE,
        this.SQUARE_SIZE,
        {
          density: 0.006,
          frictionAir: 0.03,
          restitution: 0.3,
          friction: 0.5,
          chamfer: { radius: 20 },
          collisionFilter: { group: collisionGroup },
          render: { fillStyle: '#d32f2f' },
        },
      ),
    );

    // ── Single Circle Links between Squares ──
    const links: Matter.Body[] = [];
    const constraints: Matter.Constraint[] = [];

    for (let i = 0; i < squares.length - 1; i++) {
      // Position circle right in the center gap between squares
      const currentSquareX = startX + i * (this.SQUARE_SIZE + this.SQUARE_GAP);
      const circleX = currentSquareX + this.SQUARE_SIZE + (this.SQUARE_GAP / 2);

      const link = Bodies.circle(circleX, dropY - i * 30, 12, {
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
          pointA: { x: this.SQUARE_SIZE / 2, y: 0 },
          bodyB: link,
          pointB: { x: 0, y: 0 },
          stiffness: 0.7,
          length: 12,
          render: { strokeStyle: '#333', lineWidth: 2, visible: false },
        })
      );

      // Connect Circle to Right Square
      constraints.push(
        Constraint.create({
          bodyA: link,
          pointA: { x: 0, y: 0 },
          bodyB: squares[i + 1],
          pointB: { x: -this.SQUARE_SIZE / 2, y: 0 },
          stiffness: 0.7,
          length: 12,
          render: { strokeStyle: '#333', lineWidth: 2, visible: false },
        })
      );
    }

    Composite.add(world, [...squares, ...links, ...constraints]);

    // Custom text overlays
    Events.on(this.render, 'afterRender', () => {
      const ctx = this.render.context;
      squares.forEach((sq, i) => {
        ctx.save();
        ctx.translate(sq.position.x, sq.position.y);
        ctx.rotate(sq.angle);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${this.SQUARE_SIZE * 0.9}px "Open Sans", system-ui, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText(this.LETTERS[i], 0, 2);

        ctx.restore();
      });
    });

    // Store references for runtime updates
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

        if (!this.hasDropped) {
          this.hasDropped = true;
          this.dropChain();
        }
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
  }

  // ─── Reset position of squares AND circle links safely ───────────────────
  private dropChain(): void {
    const squares: Matter.Body[] = (this as any)._squares;
    const links: Matter.Body[] = (this as any)._links;
    if (!squares || !links) return;

    const canvas = this.canvasRef.nativeElement;
    const W = canvas.width;
    const totalChainW =
      this.LETTERS.length * this.SQUARE_SIZE +
      (this.LETTERS.length - 1) * this.SQUARE_GAP;
    const startX = (W - totalChainW) / 2 + this.SQUARE_SIZE / 2;
    const dropY = -this.SQUARE_SIZE; 

    // Reset squares
    squares.forEach((sq, i) => {
      Matter.Body.setPosition(sq, {
        x: startX + i * (this.SQUARE_SIZE + this.SQUARE_GAP),
        y: dropY - i * 20,
      });
      Matter.Body.setVelocity(sq, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(sq, 0);
    });

    // Reset circle links smoothly alongside their companion squares
    links.forEach((link, i) => {
      const currentSquareX = startX + i * (this.SQUARE_SIZE + this.SQUARE_GAP);
      const circleX = currentSquareX + this.SQUARE_SIZE + (this.SQUARE_GAP / 2);
      
      Matter.Body.setPosition(link, {
        x: circleX,
        y: dropY - i * 20 - 10,
      });
      Matter.Body.setVelocity(link, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(link, 0);
    });
  }

  ngOnDestroy(): void {
    if (this.triggerInstance) this.triggerInstance.kill();
    if (this.render) Matter.Render.stop(this.render);
    if (this.runner) Matter.Runner.stop(this.runner);
    if (this.engine) Matter.Engine.clear(this.engine);
  }
}