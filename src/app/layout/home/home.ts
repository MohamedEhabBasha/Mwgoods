import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import * as THREE from 'three';

import { HomeIntro } from './home-intro/home-intro';
import { HomeHero } from './home-hero/home-hero';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { HPHeader } from './home-process/hp-header/hp-header';
import { HPStepsShowcase } from './home-process/hp-steps-showcase/hp-steps-showcase';
import { HpChainBullets } from './home-process/hp-chain-bullets/hp-chain-bullets';
import { HpSlidingImages } from './home-process/hp-sliding-images/hp-sliding-images';
import { HomeCta } from './home-cta/home-cta';
import { ScrollTriggerReadyService } from '../../core/services/scroll-trigger-ready';
import { HomeProductsShowcase } from "./home-products-showcase/home-products-showcase";

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
    HomeProductsShowcase
],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements AfterViewInit, OnInit {
  private readyService = inject(ScrollTriggerReadyService);

  private canvasService = inject(ThreejsSceneService);

  private scrollContainer__one = viewChild.required<ElementRef>('scrollContainer__one');
  private webglCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('webglCanvas');
  private webglCanvasContainer =
    viewChild.required<ElementRef<HTMLElement>>('webglCanvasContainer');

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
  private productsShowcaseSection = viewChild.required<HomeProductsShowcase>(HomeProductsShowcase);

  public screenWidth = signal<number>(0);

  ngOnInit(): void {
    this.screenWidth.set(window.innerWidth);
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth.set(window.innerWidth);
  }
  ngAfterViewInit(): void {
    const canvasElement = this.webglCanvas().nativeElement;

    this.canvasService.initialize(canvasElement, this.webglCanvasContainer().nativeElement);

    // 1. Create the Master Timeline
    const masterTl = gsap.timeline({});

    masterTl.add(this.heroSection().createHeroAnimationTimeline());

    masterTl.add(this.animate_heroIntro_sections());

    this.animate_processSection();

    this.productsShowcaseSection().scrollAnimation();

    this.ctaSection().scrollAnimation();

    this.readyService.signal();
  }

  private animate_heroIntro_sections() {
    const scrollContainer__one = this.scrollContainer__one().nativeElement;

    const scrollContanierOne__Tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer__one,
        start: 'top top',
        end: '+=200%',
        scrub: 1.5,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
      //scrollContanierOne__Tl.to(this.webglCanvasContainer().nativeElement, {zIndex: 10});
    } else if (window.innerWidth >= 1280) {
      // 3. Listen to the shared service stream safely
      this.canvasService.modelLoaded$.subscribe((vase: THREE.Group) => {
        scrollContanierOne__Tl
          .to(
            vase.position,
            { x: 0, y: -1, z: 0, duration: 0.8, ease: 'power1.inOut', delay: 1 },
            0,
          )
          .to(vase.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: 'power1.inOut' }, '<')
          .to(vase.rotation, { x: -Math.PI / 8, duration: 0.8, ease: 'power1.inOut' }, '<')
          .to(this.canvasService.canvasContainer, { zIndex: 10 }, '<');
      });
    }

    scrollContanierOne__Tl.add(this.introSection().createIntroAnimationTimeline());

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
