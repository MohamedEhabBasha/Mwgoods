import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HomeIntro } from './home-intro/home-intro';
import { HomeHero } from './home-hero/home-hero';
import { SceneManager } from './threejs-hero-scene/scene-manager';
import * as THREE from 'three';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { HPHeader } from './home-process/hp-header/hp-header';
import { HPStepsShowcase } from './home-process/hp-steps-showcase/hp-steps-showcase';
import { HpChainBullets } from './home-process/hp-chain-bullets/hp-chain-bullets';
import { HpSlidingImages } from './home-process/hp-sliding-images/hp-sliding-images';
import { HomeCta } from './home-cta/home-cta';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  imports: [
    HomeIntro,
    HomeHero,
    HPHeader,
    HPStepsShowcase,
    HpChainBullets,
    HpSlidingImages,
    HomeCta,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements AfterViewInit {
  private canvasService = inject(ThreejsSceneService);
  private scrollContainer__one = viewChild.required<ElementRef>('scrollContainer__one');
  private webglCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('webglCanvas');

  /* MAIN SECTIONS */
  private heroSection = viewChild.required<HomeHero>(HomeHero);
  private introSection = viewChild.required<HomeIntro>(HomeIntro);
  private processSection__Header = viewChild.required<HPHeader>(HPHeader);
  private processSection__HpSlidingImages = viewChild.required<HpSlidingImages>(HpSlidingImages);
  private processSection__Showcase = viewChild.required<HPStepsShowcase>(HPStepsShowcase);
  private processSection__ChainBullets = viewChild.required<HpChainBullets>(HpChainBullets);
  private processSectionScrollContainer = viewChild.required<HTMLElement>(
    'processSectionScrollContainer',
  );
  private ctaSection = viewChild.required<HomeCta>(HomeCta);

  private sceneManager!: SceneManager;

  ngAfterViewInit(): void {
    const canvasElement = this.webglCanvas().nativeElement;

    this.canvasService.initialize(canvasElement);

    // 1. Create the Master Timeline
    const masterTl = gsap.timeline({});

    masterTl.add(this.heroSection().createHeroAnimationTimeline());

    masterTl.add(this.animate_heroIntro_sections());

    this.animate_processSection();

    this.ctaSection().scrollAnimation();

    // 2. CRITICAL SAFETY NET: Force ScrollTrigger to scan the fully built DOM
    // and finalize all pinning coordinates across the entire document.
    ScrollTrigger.refresh();
  }

  private animate_heroIntro_sections() {
    const scrollContainer__one = this.scrollContainer__one().nativeElement;

    const scrollContanierOne__Tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer__one,
        start: 'top top',
        end: '+=150%',
        scrub: 1.5,
        /* snap: 0.5, */
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
      },
    });

    scrollContanierOne__Tl.add(this.introSection().createIntroAnimationTimeline());

    if (window.innerWidth >= 768) {
      // 3. Listen to the shared service stream safely
      this.canvasService.modelLoaded$.subscribe((vase: THREE.Group) => {
        scrollContanierOne__Tl
          .to(
            vase.position,
            { x: 0, y: -1, z: 0, duration: 0.8, ease: 'power1.inOut', delay: 1 },
            0,
          )
          .to(vase.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.8, ease: 'power1.inOut' }, '<')
          .to(vase.rotation, { x: -Math.PI / 8, duration: 0.8, ease: 'power1.inOut' }, '<');
      });
    }

    return scrollContanierOne__Tl;
  }

  private animate_processSection() {
    const processContainer = this.processSectionScrollContainer();

    this.processSection__Header().initScrollAnimation();

    this.processSection__HpSlidingImages().initScrollAnimation();

    this.processSection__Showcase().animateStepsSection();

    this.processSection__ChainBullets().animateChainBulletsSection();
  }
}
