// scene-manager.ts
import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Group,
  Timer,
  AmbientLight,
  DirectionalLight,
  Vector3,
  Box3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class SceneManager {
  private renderer!: WebGLRenderer;
  private camera!: PerspectiveCamera;
  private scene!: Scene;
  private clock = new Timer();

  // The pristine, parsed GLTF scene graph. Never added to `scene`, never
  // mutated after load — it exists only to be `.clone()`d. Cloning
  // duplicates the lightweight Object3D/Mesh wrapper nodes but NOT the
  // BufferGeometry/Material/Texture data, so spawning an instance is cheap
  // even though the source GLB is 1.6MB.
  private sourceModel: Group | null = null;

  // The instance currently mounted in the scene. Each page gets its own via
  // spawnInstance() so a page's GSAP timeline can never fight leftover
  // tweens from a previous page on the same object.
  public activeInstance: Group | null = null;

  private onSourceReadyCallback?: (source: Group) => void;
  private onProgressCallback?: (percent: number) => void;
  private animationFrameId!: number;

  // Recentered local origin of the source model, captured once right after
  // the bounding-box recenter in loadModel(). Every clone inherits this same
  // local position, so instance transforms are always applied relative to
  // this fixed base instead of drifting cumulatively.
  private basePosition = new Vector3();

  // Gates expensive per-frame work only. clock.update() always runs so
  // `delta` never spikes when rendering resumes.
  private renderingEnabled = true;

  // Lets a page take exclusive ownership of rotation (e.g. a GSAP/
  // ScrollTrigger-driven spin) without the idle auto-rotation fighting it
  // frame by frame.
  private idleRotationEnabled = true;

  constructor(private canvas: HTMLCanvasElement) {}

  initialize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(45, width / height, 0.1, 100);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    const ambientLight = new AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 4);
    this.scene.add(directionalLight);

    this.loadModel();
    this.animate();

    window.addEventListener('resize', this.onWindowResize);
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.preload();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      '/home/vase.compressed-optimized.glb',
      (gltf) => {
        const model = gltf.scene;

        const box = new Box3().setFromObject(model);
        const center = box.getCenter(new Vector3());
        model.position.sub(center);
        this.basePosition.copy(model.position);

        this.sourceModel = model;

        if (this.onSourceReadyCallback) {
          this.onSourceReadyCallback(this.sourceModel);
        }

        dracoLoader.dispose();
      },
      (event: ProgressEvent) => {
        if (event.lengthComputable && this.onProgressCallback) {
          const percent = Math.min((event.loaded / event.total) * 100, 100);
          this.onProgressCallback(percent);
        }
      },
      (error) => {
        console.error('Error loading GLB model:', error);
        dracoLoader.dispose();
      },
    );
  }

  public getCamera() {
    return this.camera;
  }

  /** Fires once, as soon as the GLB is parsed and ready to be cloned. */
  public onSourceReady(callback: (source: Group) => void): void {
    this.onSourceReadyCallback = callback;
    if (this.sourceModel) {
      callback(this.sourceModel);
    }
  }

  public onLoadProgress(callback: (percent: number) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Swaps whatever's currently in the scene for a brand-new clone of the
   * source model, reset to its canonical resting pose. Call this whenever a
   * page mounts and wants a vase to animate — never reuse the previous
   * page's instance. Returns null if the GLB hasn't finished loading yet;
   * subscribe to onSourceReady() and call again.
   */
  public spawnInstance(): Group | null {
    if (!this.sourceModel) return null;

    if (this.activeInstance) {
      this.scene.remove(this.activeInstance);
      // Deliberately NOT disposing geometry/material — they're shared by
      // reference with sourceModel and any other instance.
    }

    const instance = this.sourceModel.clone(true);
    this.activeInstance = instance;
    this.scene.add(instance);
    this.idleRotationEnabled = true;
    this.applyRestingTransform({ resetRotation: true });

    return instance;
  }

  /** Read-only access to whatever instance is currently mounted, if you need it without spawning a new one. */
  public getActiveInstance(): Group | null {
    return this.activeInstance;
  }

  public setRenderingEnabled(enabled: boolean): void {
    this.renderingEnabled = enabled;
  }

  /** Pause/resume idle auto-rotation, e.g. while a page's GSAP timeline drives rotation itself. */
  public setIdleRotationEnabled(enabled: boolean): void {
    this.idleRotationEnabled = enabled;
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Re-layout scale/position/camera only — NOT a rotation reset, so a
    // resize never stomps whatever rotation is currently in flight.
    this.applyRestingTransform({ resetRotation: false });
  };

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.clock.update();

    if (!this.renderingEnabled) return;

    const delta = this.clock.getDelta();

    if (this.activeInstance && this.idleRotationEnabled) {
      this.activeInstance.rotation.y += delta * 0.5;
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Applies breakpoint-correct scale/position/camera framing to the active
   * instance. `resetRotation` is opt-in: "re-layout after resize" (preserve
   * rotation) is now a distinct case from "give me a fresh canonical pose"
   * (zero it out) — previously these were conflated into one unconditional
   * rotation.set(0,0,0) at the end of this method.
   */
  private applyRestingTransform(opts: { resetRotation: boolean }): void {
    if (!this.activeInstance) return;

    const width = window.innerWidth;
    let scaleFactor: number;
    let yOffset: number;

    if (width < 768) {
      scaleFactor = 1.3;
      yOffset = 3;
      this.camera.position.set(0, 4, 14);
    } else if (width < 1024) {
      scaleFactor = 1.8;
      yOffset = 3.5;
      this.camera.position.set(0, 4, 12);
    } else if (width < 1280) {
      scaleFactor = 2.4;
      yOffset = 2.5;
      this.camera.position.set(0, 6, 12);
    } else {
      scaleFactor = 3;
      yOffset = 2.8;
      this.camera.position.set(0, 8, 12);
    }

    this.activeInstance.scale.set(scaleFactor, scaleFactor, scaleFactor);
    this.activeInstance.position.set(
      this.basePosition.x,
      this.basePosition.y + yOffset,
      this.basePosition.z,
    );

    if (opts.resetRotation) {
      this.activeInstance.rotation.set(0, 0, 0);
    }

    this.camera.lookAt(new Vector3(0, 3, 0));
  }

  setupCleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    this.scene.clear();
  }
}