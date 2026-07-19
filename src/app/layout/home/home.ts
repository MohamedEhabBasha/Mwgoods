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
/*   host: {
    '(window:resize)': 'onResize()',
  }, */
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
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

  private ctx?: ReturnType<typeof gsap.context>;
  private heroTl?: gsap.core.Timeline;
  private scrollContanierOne__Tl?: gsap.core.Timeline;

  public readonly screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 0);

  private firstFrame?: number;
  private secondFrame?: number;

  constructor() {
    afterNextRender(() => {
      // Spawn this page's exclusive, detached copy of the 3D model clone
      const model = this.canvasService.spawnVaseInstance();
      if (model) {
        this.initHome(model);
      } else {
        // If the GLTF hasn't finished loading yet, subscribe and wait for it
        this.canvasService.sourceReady$
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const freshModel = this.canvasService.spawnVaseInstance();
            if (freshModel) {
              this.initHome(freshModel);
            }
          });
      }
    });

    this.destroyRef.onDestroy(() => {
      //console.log('Home component destroyed, killing timelines');
      // 1. Kill and revert everything scoped to this page component's context
      this.ctx?.revert();
      this.ctx = undefined;

      this.heroTl?.kill();
      this.scrollContanierOne__Tl?.kill();

      // 2. Clean global styling on the canvas container so subsequent pages start fresh
      if (this.canvasService.canvasContainer) {
        gsap.set(this.canvasService.canvasContainer, { clearProps: 'opacity,zIndex' });
      }
      this.canvasService.setRenderingEnabled(true);

      if (this.firstFrame) cancelAnimationFrame(this.firstFrame);
      if (this.secondFrame) cancelAnimationFrame(this.secondFrame);
    });
  }

/*   protected onResize(): void {
    this.screenWidth.set(window.innerWidth);
  } */

  private initHome(vase: Group): void {
    this.ctx = gsap.context(() => {
      this.heroTl = this.heroSection().createHeroAnimationTimeline();

      this.scrollContanierOne__Tl = this.animate_heroIntro_sections(vase);

      this.firstFrame = requestAnimationFrame(() => {
        this.secondFrame = requestAnimationFrame(() => {
          this.ctx?.add(() => {
            this.animate_processSection(vase);
            this.productsShowcaseSection().scrollAnimation();
            this.ctaSection().scrollAnimation();

            // Signal ready state once the preloader fades out
            this.preloaderReady
              .onReady$()
              .pipe(take(1), takeUntilDestroyed(this.destroyRef))
              .subscribe(() => {
                this.heroTl?.play();
                this.readyService.signal();
              });
          });
        });
      });
    }, this.hostEl.nativeElement);
  }

  private animate_heroIntro_sections(vase: Group): gsap.core.Timeline {
    const scrollContainer__one = this.scrollContainer__one().nativeElement;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer__one,
        start: 'top top',
        end: '+=300%',
        scrub: 1,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    if (this.screenWidth() >= 1280) {
      tl.to(vase.position, { x: 0, y: -1, z: 0, duration: 0.8, ease: 'power1.inOut', delay: 1 }, 0)
        .to(vase.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: 'power1.inOut' }, '<')
        .to(vase.rotation, { x: -Math.PI / 8, duration: 0.8, ease: 'power1.inOut' }, '<')
        .to(this.canvasService.canvasContainer, { zIndex: 10 }, '<');
    }

    tl.add(this.introSection().createIntroAnimationTimeline(), 0);

    return tl;
  }

  private animate_processSection(vase: Group): void {
    this.processSection__Header().initScrollAnimation(vase);
    this.processSection__HpSlidingImages().initScrollAnimation();
    this.processSection__Showcase().animateStepsSection();
    this.processSection__ChainBullets().animateChainBulletsSection();
  }
}
