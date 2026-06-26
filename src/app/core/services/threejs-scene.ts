import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import { SceneManager } from '../../layout/home/threejs-hero-scene/scene-manager';
import * as THREE from 'three';
import { Subject, BehaviorSubject, filter, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThreejsSceneService implements OnDestroy{
  private sceneManager!: SceneManager;
  private isInitialized$ = new BehaviorSubject<boolean>(false);
  public canvasContainer!: HTMLElement;

  // Expose an observable hook so child layouts know precisely when the asset is ready
  public modelLoaded$ = new Subject<THREE.Group>();
  private loadedModel: THREE.Group | null = null;

  /**
   * Called ONCE by the parent Home element to mount the canvas element
   */
  public initialize(canvasElement: HTMLCanvasElement, canvasContainer: HTMLElement): void {
    if (this.isInitialized$.value) return;

    this.canvasContainer = canvasContainer;

    this.sceneManager = new SceneManager(canvasElement);
    this.sceneManager.initialize();
    this.isInitialized$.next(true);

    // Bind your Model Load tracking hook
    this.sceneManager.onModelLoaded((model: THREE.Group) => {
      this.loadedModel = model;
      this.modelLoaded$.next(model);
    });
  }

  /**
   * Safe getter utility for child components to grab model data synchronously if already cached
   */
  public getModel(): THREE.Group | null {
    return this.loadedModel;
  }

  /**
   * Helper calculation method made accessible to all child layers globally
   */
  public convertVwToThreeUnits(vwPercentage: number, canvas: HTMLCanvasElement): number {
    if (!this.isInitialized$.value) return 0;

    const width = canvas.clientWidth;
    const distance = this.sceneManager.getCamera().position.z - -50;
    const vFov = (this.sceneManager.getCamera().fov * Math.PI) / 180;
    const totalThreeHeight = 2 * Math.tan(vFov / 2) * distance;
    const totalThreeWidth = totalThreeHeight * (width / canvas.clientHeight);

    return (vwPercentage / 100) * totalThreeWidth - totalThreeWidth / 2;
  }

  /**
   * Handles total execution cleanup when leaving the Home component shell
   */
  ngOnDestroy(): void {
    if (this.sceneManager) {
      this.sceneManager.setupCleanup();
    }
    this.isInitialized$.next(false);
    this.modelLoaded$.complete();
  }
}
