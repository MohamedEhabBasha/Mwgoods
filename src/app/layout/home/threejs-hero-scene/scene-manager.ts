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
  public vaseMesh: Group | null = null;
  private onReadyCallback?: (mesh: Group) => void;
  private onProgressCallback?: (percent: number) => void;
  private animationFrameId!: number;

  // Gate for expensive work only — never gate clock.update() itself, or
  // the delta on resume will spike and the vase will visibly snap instead
  // of resuming its rotation smoothly.
  private renderingEnabled = true;

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
        this.vaseMesh = gltf.scene;

        const box = new Box3().setFromObject(this.vaseMesh);
        const center = box.getCenter(new Vector3());
        this.vaseMesh.position.sub(center);

        this.adjustModelScale();

        this.scene.add(this.vaseMesh);

        if (this.onReadyCallback) {
          this.onReadyCallback(this.vaseMesh);
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

  public onModelLoaded(callback: (mesh: Group) => void): void {
    this.onReadyCallback = callback;
    if (this.vaseMesh) {
      callback(this.vaseMesh);
    }
  }

  public onLoadProgress(callback: (percent: number) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Pauses the expensive part of the render loop (mesh rotation + WebGL
   * render + canvas recomposite) while the canvas is fully hidden behind
   * opaque content. clock.update() keeps running every frame regardless,
   * so delta stays sane and resuming never causes a rotation jump.
   */
  public setRenderingEnabled(enabled: boolean): void {
    this.renderingEnabled = enabled;
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.adjustModelScale();
  };

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    this.clock.update();

    if (!this.renderingEnabled) return; // skip rotation + render + recomposite entirely

    const delta = this.clock.getDelta();

    if (this.vaseMesh) {
      this.vaseMesh.rotation.y += delta * 0.5;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private adjustModelScale(): void {
    if (!this.vaseMesh) return;

    const width = window.innerWidth;
    let scaleFactor;

    if (width < 768) {
      scaleFactor = 1.3;
      this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.camera.position.set(0, 4, 14);
      this.vaseMesh.position.y += 3;
    } else if (width >= 768 && width < 1024) {
      scaleFactor = 1.8;
      this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.camera.position.set(0, 4, 12);
      this.vaseMesh.position.y += 3.5;
    } else if (width >= 1024 && width < 1280) {
      scaleFactor = 2.4;
      this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.camera.position.set(0, 6, 12);
      this.vaseMesh.position.y += 2.5;
    } else {
      scaleFactor = 3;
      this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.camera.position.set(0, 8, 12);
      this.vaseMesh.position.y += 2.8;
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