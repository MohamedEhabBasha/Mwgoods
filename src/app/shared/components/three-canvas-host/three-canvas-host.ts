import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { ThreejsSceneService } from '../../../core/services/threejs-scene';

@Component({
  selector: 'app-three-canvas-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './three-canvas-host.html',
  styleUrl: './three-canvas-host.css',
})
export class ThreeCanvasHost {
  private readonly canvasService = inject(ThreejsSceneService);
  private readonly webglCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('webglCanvas');
  private readonly webglCanvasContainer =
    viewChild.required<ElementRef<HTMLElement>>('webglCanvasContainer');

  constructor() {
    afterNextRender(() => {
      this.canvasService.initialize(
        this.webglCanvas().nativeElement,
        this.webglCanvasContainer().nativeElement,
      );
    });
  }
}
