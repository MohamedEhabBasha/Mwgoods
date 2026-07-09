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
import { Application, Graphics } from 'pixi.js';

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

  private pixiApp?: Application;
  private gridGraphics?: Graphics;

  constructor() {
    effect(() => {
      this.squareSize();
      this.thickness();
      this.gridColor();
      if (this.pixiApp && this.gridGraphics) {
        this.drawGridNet();
      }
    });

    afterNextRender(() => this.initPixiGrid());

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  private async initPixiGrid(): Promise<void> {
    const canvasElement = this.gridCanvas().nativeElement;

    this.pixiApp = new Application();
    await this.pixiApp.init({
      canvas: canvasElement,
      resizeTo: canvasElement.parentElement ?? window,
      backgroundAlpha: 0, // canvas stays transparent; CSS owns the backdrop
      antialias: true,
    });

    this.gridGraphics = new Graphics();
    this.pixiApp.stage.addChild(this.gridGraphics);
    this.drawGridNet();

    window.addEventListener('resize', this.onResize);
  }

  private drawGridNet(): void {
    if (!this.pixiApp || !this.gridGraphics) return;

    const width = this.pixiApp.screen.width;
    const height = this.pixiApp.screen.height;

    this.gridGraphics.clear();

    const numericColor = parseInt(this.gridColor().replace('#', ''), 16);

    this.gridGraphics.setStrokeStyle({
      width: this.thickness(),
      color: isNaN(numericColor) ? 0xe4e4e7 : numericColor,
    });

    for (let x = 0; x <= width; x += this.squareSize()) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height);
    }

    for (let y = 0; y <= height; y += this.squareSize()) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width, y);
    }

    this.gridGraphics.stroke();
  }

  private onResize = (): void => {
    if (this.pixiApp && this.gridGraphics) {
      this.drawGridNet();
    }
  };

  private cleanup(): void {
    window.removeEventListener('resize', this.onResize);
    this.pixiApp?.destroy(true, { children: true, texture: true });
  }
}