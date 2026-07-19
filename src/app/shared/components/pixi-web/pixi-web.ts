import {
  Component,
  ElementRef,
  viewChild,
  input,
  effect,
  afterNextRender,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-pixi-web',
  imports: [],
  templateUrl: './pixi-web.html',
  styleUrl: './pixi-web.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixiWeb {
  private readonly destroyRef = inject(DestroyRef);

  public gridCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gridCanvas');

  public squareSize = input<number>(80);
  public thickness = input<number>(0.8);
  public gridColor = input<string>('#e4e4e7');
  public backgroundColor = input<string>('transparent');

  private ctx?: CanvasRenderingContext2D;
  private readonly dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor() {
    effect(() => {
      this.squareSize();
      this.thickness();
      this.gridColor();
      if (this.ctx) {
        this.drawGridNet();
      }
    });

    afterNextRender(() => this.initGrid());

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  private initGrid(): void {
    const canvas = this.gridCanvas().nativeElement;
    this.ctx = canvas.getContext('2d') ?? undefined;
    if (!this.ctx) return;

    this.resizeCanvas();
    this.drawGridNet();

    window.addEventListener('resize', this.onResize);
  }

  private resizeCanvas(): void {
    const canvas = this.gridCanvas().nativeElement;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = parent?.clientHeight ?? window.innerHeight;

    canvas.width = width * this.dpr;
    canvas.height = height * this.dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private drawGridNet(): void {
    if (!this.ctx) return;

    const canvas = this.gridCanvas().nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.strokeStyle = this.gridColor();
    this.ctx.lineWidth = this.thickness();
    this.ctx.beginPath();

    for (let x = 0; x <= width; x += this.squareSize()) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }

    for (let y = 0; y <= height; y += this.squareSize()) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
    }

    this.ctx.stroke();
  }

  private onResize = (): void => {
    if (this.ctx) {
      this.resizeCanvas();
      this.drawGridNet();
    }
  };

  private cleanup(): void {
    window.removeEventListener('resize', this.onResize);
  }
}