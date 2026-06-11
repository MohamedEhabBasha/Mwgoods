import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SceneManager {
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private clock = new THREE.Timer();
  public vaseMesh: THREE.Group | null = null;
  private onReadyCallback?: (mesh: THREE.Group) => void;
  private animationFrameId!: number;

  // ─── TRAIL PROPERTIES ───
  private trailLine!: THREE.Line;
  private maxTrailPoints = 60; // Higher number = longer line trail
  private trailPoints: THREE.Vector3[] = [];

  constructor(private canvas: HTMLCanvasElement) {}

  initialize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // Set up the scene
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    //this.camera.position.set(0, 8, 12);
    //this.camera.lookAt(new THREE.Vector3(0, 3, 0));

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Premium Lighting Environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 4);
    this.scene.add(directionalLight);

    this.loadModel();
    this.animate();

    // Listen to resize events directly in the manager to update scales instantly
    window.addEventListener('resize', this.onWindowResize);
  }

  private loadModel(): void {
    const loader = new GLTFLoader();

    loader.load(
      'home/vase.glb',
      (gltf) => {
        this.vaseMesh = gltf.scene;

        // Auto-center the geometries perfectly inside your typography gap
        const box = new THREE.Box3().setFromObject(this.vaseMesh);
        const center = box.getCenter(new THREE.Vector3());
        this.vaseMesh.position.x += this.vaseMesh.position.x - center.x;
        this.vaseMesh.position.y += this.vaseMesh.position.y - center.y;
        this.vaseMesh.position.z += this.vaseMesh.position.z - center.z;

        //const scaleFactor = 5.5;
        //this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.adjustModelScale();

        this.scene.add(this.vaseMesh);

        // ✨ Fire the ready hook to alert the main home component
        if (this.onReadyCallback) {
          this.onReadyCallback(this.vaseMesh);
        }
      },
      undefined,
      (error) => console.error('Error loading GLB model:', error),
    );
  }
  public getCamera() {
    return this.camera;
  }
  public onModelLoaded(callback: (mesh: THREE.Group) => void): void {
    this.onReadyCallback = callback;
    // If the model somehow finished loading before the listener attached, fire it instantly
    if (this.vaseMesh) {
      callback(this.vaseMesh);
    }
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

    const delta = this.clock.getDelta();

    if (this.vaseMesh) {
      this.vaseMesh.rotation.y += delta * 0.5; // Majestic, slow 360 rotation
    }

    this.renderer.render(this.scene, this.camera);
  };
  private adjustModelScale(): void {
    if (!this.vaseMesh) return;

    const width = window.innerWidth;
    let scaleFactor; // Base scale for desktop

    if (width < 768) {
      // 📱 Mobile Viewports: Shrink the vase so it doesn't bleed over small headers
      scaleFactor = 1.3;
      this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      // Optional: Push the camera back or adjust target height on mobile if needed
      this.camera.position.set(0, 4, 14);
      this.vaseMesh.position.y += 3; // Slightly lower on mobile to fit better with smaller headers
    } else if (width >= 768 && width < 1024) {
      // 📑 Tablet / Small Laptop Viewports: Medium Scale
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
      // 🖥️ Desktop Wide Viewports: Full Production Scale
      scaleFactor = 3;
      this.vaseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.camera.position.set(0, 8, 12);
      this.vaseMesh.position.y += 2.8;
    }

    this.camera.lookAt(new THREE.Vector3(0, 3, 0));
  }
  setupCleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
    this.scene.clear();
  }
}
