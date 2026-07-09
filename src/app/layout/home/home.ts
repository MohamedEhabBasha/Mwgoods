import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import type { Group } from 'three';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HomeIntro } from './home-intro/home-intro';
import { HomeHero } from './home-hero/home-hero';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { HPHeader } from './home-process/hp-header/hp-header';
import { HPStepsShowcase } from './home-process/hp-steps-showcase/hp-steps-showcase';
import { HpChainBullets } from './home-process/hp-chain-bullets/hp-chain-bullets';
import { HpSlidingImages } from './home-process/hp-sliding-images/hp-sliding-images';
import { HomeCta } from './home-cta/home-cta';
import { ScrollTriggerReadyService } from '../../core/services/scroll-trigger-ready';

import { HomeProductsShowcase } from './home-products-showcase/home-products-showcase';
import { PreLoaderReady } from '../../core/services/pre-loader-ready';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onResize()',
  },
  imports: [
    HomeIntro,
    HomeHero,
    HPHeader,
    HPStepsShowcase,
    HpChainBullets,
    HpSlidingImages,
    HomeCta,
    HomeProductsShowcase,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly destroyRef = inject(DestroyRef);
  private readonly readyService = inject(ScrollTriggerReadyService);
  private readonly preloaderReady = inject(PreLoaderReady);
  private readonly canvasService = inject(ThreejsSceneService);

  private readonly scrollContainer__one = viewChild.required<ElementRef>('scrollContainer__one');

  /* MAIN SECTIONS */
  private readonly heroSection = viewChild.required<HomeHero>(HomeHero);
  private readonly introSection = viewChild.required<HomeIntro>(HomeIntro);
  private readonly processSection__Header = viewChild.required<HPHeader>(HPHeader);
  private readonly processSection__HpSlidingImages =
    viewChild.required<HpSlidingImages>(HpSlidingImages);
  private readonly processSection__Showcase = viewChild.required<HPStepsShowcase>(HPStepsShowcase);
  private readonly processSection__ChainBullets =
    viewChild.required<HpChainBullets>(HpChainBullets);
  private readonly processSectionScrollContainer = viewChild.required<HTMLElement>(
    'processSectionScrollContainer',
  );
  private readonly ctaSection = viewChild.required<HomeCta>(HomeCta);
  private readonly productsShowcaseSection =
    viewChild.required<HomeProductsShowcase>(HomeProductsShowcase);

  private masterTl?: gsap.core.Timeline;
  private heroTl?: gsap.core.Timeline;
  private scrollContanierOne__Tl?: gsap.core.Timeline;

  public readonly screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 0);

  constructor() {
    afterNextRender(() => this.initHome());

    this.destroyRef.onDestroy(() => {
      console.log('Home component destroyed, killing timelines');
      this.masterTl?.kill();
      this.heroTl?.kill();
      this.scrollContanierOne__Tl?.kill();
    });
  }

  protected onResize(): void {
    this.screenWidth.set(window.innerWidth);
  }

  private initHome(): void {
    // play instantly) but held paused until the preloader is gone.
    this.heroTl = this.heroSection().createHeroAnimationTimeline();
    //this.heroTl.pause();

    this.masterTl = gsap.timeline({});
    this.masterTl.add(this.animate_heroIntro_sections());

    this.animate_processSection();
    this.productsShowcaseSection().scrollAnimation();
    this.ctaSection().scrollAnimation();

    // "Home ready" for App's purposes must mean "final layout is settled,"
    // not just "DOM exists." Scroll may still be locked and hero elements
    // still sit in their paused state while the preloader is up, so
    // ScrollTrigger.refresh() (fired in App off this signal) has to wait
    // for the same moment the preloader actually clears.
    this.preloaderReady
      .onReady$()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.heroTl?.play();
        this.readyService.signal();
      });
  }

  private animate_heroIntro_sections() {
    const scrollContainer__one = this.scrollContainer__one().nativeElement;

    this.scrollContanierOne__Tl = gsap.timeline({
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

    if (this.screenWidth() >= 1280) {
      this.canvasService.modelLoaded$
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe((vase: Group) => {
          this.scrollContanierOne__Tl!
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

    this.scrollContanierOne__Tl.add(this.introSection().createIntroAnimationTimeline());

    return this.scrollContanierOne__Tl;
  }

  private animate_processSection(): void {
    this.processSection__Header().initScrollAnimation();
    this.processSection__HpSlidingImages().initScrollAnimation();
    this.processSection__Showcase().animateStepsSection();
    this.processSection__ChainBullets().animateChainBulletsSection();
  }
}
