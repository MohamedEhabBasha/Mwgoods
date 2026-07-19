import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Group } from 'three';

;
import { PixiWeb } from '../../shared/components/pixi-web/pixi-web';
import { SquareLabel } from '../../shared/components/square-label/square-label';
import { OrbitalButton } from '../../shared/components/orbital-button/orbital-button';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { ScrollTriggerReadyService } from '../../core/services/scroll-trigger-ready';

@Component({
  selector: 'app-community',
  imports: [PixiWeb, SquareLabel, OrbitalButton],
  templateUrl: './community.html',
  styleUrl: './community.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Community {
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasService = inject(ThreejsSceneService);
  private readonly readyService = inject(ScrollTriggerReadyService);

  private headerText = viewChild.required<ElementRef<HTMLElement>>('headerText');
  private vaseSettleWrapper = viewChild.required<ElementRef<HTMLElement>>('vaseSettleWrapper');

  private headers = viewChildren<ElementRef<HTMLElement>>('header');
  private paragraphs = viewChildren<ElementRef<HTMLElement>>('paragraph');
  private stackWrappers = viewChildren<ElementRef<HTMLElement>>('stackWrapper');
  private stackPanels = viewChildren<ElementRef<HTMLElement>>('stackPanel');

  private ctx?: ReturnType<typeof gsap.context>;
  private heroSplit?: SplitText;
  private headerSplits: SplitText[] = [];
  private paragraphSplits: SplitText[] = [];

  constructor() {
    afterNextRender(() => {
      // 1. Spawns this page's exclusive, detached copy of the 3D vase
      const model = this.canvasService.spawnVaseInstance();
      if (model) {
        this.initCommunity(model);
      } else {
        this.canvasService.sourceReady$
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const freshModel = this.canvasService.spawnVaseInstance();
            if (freshModel) {
              this.initCommunity(freshModel);
            }
          });
      }
    });

    this.destroyRef.onDestroy(() => {
      // 2. Kill page animations cleanly
      this.ctx?.revert();
      this.ctx = undefined;

      this.heroSplit?.revert();
      this.headerSplits.forEach((split) => split.revert());
      this.paragraphSplits.forEach((split) => split.revert());

      // 3. Re-enable default global canvas container layout parameters
      if (this.canvasService.canvasContainer) {
        gsap.set(this.canvasService.canvasContainer, { clearProps: 'opacity,zIndex' });
      }
      this.canvasService.setRenderingEnabled(true);
    });
  }

  private initCommunity(vase: Group): void {
    //vase.traverse((c: any) => c.isMesh && (c.material = c.material.clone()));

    this.ctx = gsap.context(() => {
      this.createHeroAnimation();
      this.createContentAnimations();
      this.createStackedSectionsAnimation(vase);
    }, this.hostEl.nativeElement);

    this.readyService.signal();
  }

  private createHeroAnimation(): void {
    this.heroSplit = new SplitText(this.headerText().nativeElement, {
      type: 'words,chars',
    });

    gsap
      .timeline({
        defaults: { ease: 'power4.inOut', duration: 1.6 },
      })
      .fromTo(
        this.heroSplit.chars,
        { yPercent: 130, rotate: 3, skewX: 10, opacity: 0 },
        { yPercent: 0, rotate: 0, skewX: 0, opacity: 1, stagger: 0.02 },
      );
  }

  private createContentAnimations(): void {
    if (window.innerWidth < 1024) return;

    const wrappers = this.stackWrappers();
    const headers = this.headers();
    const paragraphs = this.paragraphs();

    headers.forEach((headerRef, index) => {
      const wrapper = wrappers[index + 1];
      if (!wrapper) return;

      const headerSplit = new SplitText(headerRef.nativeElement, { type: 'words,chars' });
      this.headerSplits.push(headerSplit);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper.nativeElement,
          start: 'top center',
          end: 'top top',
          scrub: 1,
        },
      });

      tl.fromTo(
        headerSplit.chars,
        { yPercent: 130, rotate: 3, skewX: 10, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          skewX: 0,
          opacity: 1,
          stagger: 0.02,
          duration: 1.6,
          ease: 'power4.inOut',
        },
      );

      const paragraphRef = paragraphs[index];
      if (paragraphRef) {
        const paragraphSplit = new SplitText(paragraphRef.nativeElement, {
          type: 'lines',
          linesClass: 'overflow-hidden',
        });
        this.paragraphSplits.push(paragraphSplit);

        tl.fromTo(
          paragraphSplit.lines,
          { yPercent: 100, opacity: 0 },
          { yPercent: 0, opacity: 1, stagger: 0.08, duration: 1, ease: 'power4.out' },
          '-=1.1',
        );
      }
    });
  }

  private createStackedSectionsAnimation(vase: Group): void {
    if (window.innerWidth < 1024) return;

    const wrappers = this.stackWrappers();
    const panels = this.stackPanels();

    const HOLD_FRACTION = 0.55;
    const lastIndex = wrappers.length - 1;

    // This page owns rotation, turn off default idle rotation
    //this.canvasService.setIdleRotationEnabled(false);

    // Vase arrives at the hero
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrappers[0].nativeElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      },
    });

    tl.to(vase.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.8, ease: 'power1.inOut' }, 0)
      .to(this.canvasService.canvasContainer, { zIndex: 10 }, '<');

    // Panel tracking
    wrappers.forEach((wrapperRef, i) => {
      const panel = panels[i]?.nativeElement;
      if (!panel) return;
      if (i === lastIndex) return;

      const pTl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.nativeElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      pTl.to(panel, { duration: HOLD_FRACTION, ease: 'none' });

      if (i !== 0) {
        pTl.fromTo(
          panel,
          { scale: 1, opacity: 1 },
          { scale: 0.7, opacity: 0.5, duration: (1 - HOLD_FRACTION) * 0.9, ease: 'none' },
        );
      }

      pTl.to(panel, { opacity: 0, duration: (1 - HOLD_FRACTION) * 0.1, ease: 'none' });
    });

    // Vase settles at section 4
    const settleTl = gsap.timeline({
      scrollTrigger: {
        trigger: this.vaseSettleWrapper().nativeElement,
        start: 'top center',
        end: 'top top',
        scrub: true,
      },
    });

    settleTl.to(vase.scale, { x: 3.25, y: 3.25, z: 3.25, duration: 0.8, ease: 'power1.inOut' }, 0)
      .to(this.canvasService.canvasContainer, { zIndex: 1 }, '<');

    // Vase fades out in lockstep with section 4
    const fadeTl = gsap.timeline({
      scrollTrigger: {
        trigger: this.vaseSettleWrapper().nativeElement,
        start: `${HOLD_FRACTION * 100}% top`,
        end: 'bottom bottom',
        scrub: true,
        onLeave: () => this.canvasService.setRenderingEnabled(false),
        onEnterBack: () => this.canvasService.setRenderingEnabled(true),
      },
    });

    fadeTl.to(this.canvasService.canvasContainer, { opacity: 0, ease: 'none' });
  }
}