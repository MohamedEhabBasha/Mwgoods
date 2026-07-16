// threejs-scene.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SceneManager } from '../../layout/home/threejs-hero-scene/scene-manager';
import type { Group } from 'three';
import { BehaviorSubject, ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThreejsSceneService implements OnDestroy {
  private sceneManager!: SceneManager;
  private isInitialized$ = new BehaviorSubject<boolean>(false);
  public canvasContainer!: HTMLElement;

  // Fires once the GLB has been parsed and is ready to clone. Pages that
  // mount before this fires should subscribe and call spawnVaseInstance()
  // again once it emits.
  public sourceReady$ = new ReplaySubject<void>(1);

  /**
   * Called ONCE by the parent Home element to mount the canvas.
   */
  public initialize(canvasElement: HTMLCanvasElement, canvasContainer: HTMLElement): void {
    if (this.isInitialized$.value) return;

    this.canvasContainer = canvasContainer;
    this.sceneManager = new SceneManager(canvasElement);
    this.sceneManager.initialize();
    this.isInitialized$.next(true);

    this.sceneManager.onSourceReady(() => this.sourceReady$.next());
  }

  public setRenderingEnabled(enabled: boolean): void {
    this.sceneManager?.setRenderingEnabled(enabled);
  }

  public setIdleRotationEnabled(enabled: boolean): void {
    this.sceneManager?.setIdleRotationEnabled(enabled);
  }

  /**
   * Mounts a brand-new vase instance in the scene and returns it, discarding
   * whatever the previous page left behind. Call this once per page, as
   * soon as that page is ready to build its own GSAP timeline. Returns null
   * if the GLB hasn't finished loading — subscribe to `sourceReady$` and
   * call again.
   */
  public spawnVaseInstance(): Group | null {
    return this.sceneManager?.spawnInstance() ?? null;
  }

  /** Synchronous read of whatever's currently mounted, without spawning a new one. */
  public getActiveInstance(): Group | null {
    return this.sceneManager?.getActiveInstance() ?? null;
  }

  ngOnDestroy(): void {
    this.sceneManager?.setupCleanup();
    this.isInitialized$.next(false);
    this.sourceReady$.complete();
  }
}