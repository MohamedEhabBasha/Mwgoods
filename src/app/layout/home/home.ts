import { AfterViewInit, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HomeIntro } from './home-intro/home-intro';
import { HomeHero } from './home-hero/home-hero';
import { SceneManager } from './threejs-hero-scene/scene-manager';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  imports: [HomeIntro, HomeHero],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  private scrollContainer = viewChild.required<ElementRef>('scrollContainer');
  private webglCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('webglCanvas');
  private webglCanvasContainer =
    viewChild.required<ElementRef<HTMLElement>>('webglCanvasContainer');

  /* MAIN SECTIONS */
  private heroSection = viewChild.required<HomeHero>(HomeHero);
  private introSection = viewChild.required<HomeIntro>(HomeIntro);

  private sceneManager!: SceneManager;

  ngAfterViewInit(): void {
    const scrollContainer = this.scrollContainer().nativeElement;
    const canvasElement = this.webglCanvas().nativeElement;
    const webglCanvasContainer = this.webglCanvasContainer().nativeElement;

    // 1. Initialize our canvas environment via SceneManager
    this.sceneManager = new SceneManager(canvasElement);
    this.sceneManager.initialize();

    // 1. Create the Master Timeline
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: '+=150%',
        scrub: 1.5,
        /* snap: 0.5, */
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
      },
    });

    // 3. Add the intro section animation to the master timeline
    masterTl.add(this.introSection().createIntroAnimationTimeline());

    if (window.innerWidth >= 768) {
      this.sceneManager.onModelLoaded((vase: THREE.Group) => {
        // We append 3D animations directly alongside your existing DOM text animations

        // Example: Slide the vase 25% to the left of the screen center
        const targetX = this.convertVwToThreeUnits(41.5);

        masterTl
          /*         .to(webglCanvasContainer, {
          zIndex: 20
        }) */
          .to(
            vase.position,
            {
              x: 0, // Slides the model to the left column viewport
              y: -1, // Slightly adjust vertical offset as user descends
              z: 0, // Slightly move deep into background for perspective layout scaling
              duration: 0.8, // Controls duration weighting inside the pin timeline
              ease: 'power1.inOut',
              delay: 1,
            },
            0,
          )
          .to(
            vase.scale,
            {
              x: 1.5, // Shrink the width to fit the rectangle
              y: 1.5, // Shrink the height
              z: 1.5, // Shrink the depth uniformly
              duration: 0.8,
              ease: 'power1.inOut',
            },
            '<',
          )
          .to(
            vase.rotation,
            {
              /* y: '+=3.14159', */ // Force an extra 180-degree turn spin sequence on scroll
              x: -Math.PI / 8,
              duration: 0.8,
              ease: 'power1.inOut',
            },
            '<',
          );
      });
    }
  }

  private convertVwToThreeUnits(vwPercentage: number): number {
    const canvas = this.webglCanvas().nativeElement;
    const width = canvas.clientWidth;

    // 1. Get the viewport boundaries in Three.js units at the model's depth (z: -50)
    const distance = this.sceneManager.getCamera().position.z - -50;
    const vFov = (this.sceneManager.getCamera().fov * Math.PI) / 180;
    const totalThreeHeight = 2 * Math.tan(vFov / 2) * distance;
    const totalThreeWidth = totalThreeHeight * (width / canvas.clientHeight);

    // 2. Convert your requested percentage to Three.js world space coordinates
    // (Subtracting half width because Three.js (0,0) is in the absolute center of the screen)
    return (vwPercentage / 100) * totalThreeWidth - totalThreeWidth / 2;
  }

  private setupCleanup(): void {
    this.destroyRef.onDestroy(() => {
      if (this.sceneManager) {
        this.sceneManager.setupCleanup();
      }
    });
  }
}
