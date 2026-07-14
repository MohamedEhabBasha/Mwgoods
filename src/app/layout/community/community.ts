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

import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { PixiWeb } from '../../shared/components/pixi-web/pixi-web';
import { SquareLabel } from '../../shared/components/square-label/square-label';
import { OrbitalButton } from '../../shared/components/orbital-button/orbital-button';

@Component({
  selector: 'app-community',
  imports: [PixiWeb, SquareLabel, OrbitalButton],
  templateUrl: './community.html',
  styleUrl: './community.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Community {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasService = inject(ThreejsSceneService);

  private headerText = viewChild.required<ElementRef<HTMLElement>>('headerText');

  // Section 4's own tall wrapper — dedicated ref (rather than reading it
  // positionally out of stackWrappers()) so the vase-settle/fade logic
  // below doesn't silently break if a section gets added/removed later.
  private vaseSettleWrapper = viewChild.required<ElementRef<HTMLElement>>('vaseSettleWrapper');

  private headers = viewChildren<ElementRef<HTMLElement>>('header');
  private paragraphs = viewChildren<ElementRef<HTMLElement>>('paragraph');
  private stackWrappers = viewChildren<ElementRef<HTMLElement>>('stackWrapper');
  private stackPanels = viewChildren<ElementRef<HTMLElement>>('stackPanel');

  private vaseTl?: gsap.core.Timeline;
  private heroSplit?: SplitText;
  private headerSplits: SplitText[] = [];
  private paragraphSplits: SplitText[] = [];
  private stackTimelines: gsap.core.Timeline[] = [];

  constructor() {
    afterNextRender(() => this.initCommunity());

    this.destroyRef.onDestroy(() => {
      this.vaseTl?.kill();
      this.heroSplit?.revert();
      this.headerSplits.forEach((split) => split.revert());
      this.paragraphSplits.forEach((split) => split.revert());
      this.stackTimelines.forEach((tl) => tl.kill());
      this.canvasService.setRenderingEnabled(true);
    });
  }

  private initCommunity(): void {
    this.createHeroAnimation();
    this.createContentAnimations();
    this.createStackedSectionsAnimation();
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
      const wrapper = wrappers[index + 1]; // skip hero wrapper
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

      // Sections 1-3 pair a header with a paragraph; sections 4 and 5 are a
      // single closing line each, so the paragraph reveal is optional.
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

      this.stackTimelines.push(tl);
    });
  }

  private createStackedSectionsAnimation(): void {
    if (window.innerWidth < 1024) return;

    const wrappers = this.stackWrappers();
    const panels = this.stackPanels();

    const HOLD_FRACTION = 0.55;
    const lastIndex = wrappers.length - 1;

    // Vase arrives at the hero: scales up and steps in front of the pixi web.
    this.canvasService.modelLoaded$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((vase: Group) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrappers[0].nativeElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        });

        tl.to(vase.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.8, ease: 'power1.inOut' }, 0).to(
          this.canvasService.canvasContainer,
          { zIndex: 10 },
          '<',
        );

        this.stackTimelines.push(tl);
      });

    // Hold -> shrink+fade for every panel except the very last, which just
    // holds via CSS sticky until it naturally releases into the footer.
    wrappers.forEach((wrapperRef, i) => {
      const panel = panels[i]?.nativeElement;
      if (!panel) return;
      if (i === lastIndex) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.nativeElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      tl.to(panel, { duration: HOLD_FRACTION, ease: 'none' });

      if (i !== 0) {
        tl.fromTo(
          panel,
          { scale: 1, opacity: 1 },
          { scale: 0.7, opacity: 0.5, duration: (1 - HOLD_FRACTION) * 0.9, ease: 'none' },
        );
      }

      tl.to(panel, { opacity: 0, duration: (1 - HOLD_FRACTION) * 0.1, ease: 'none' });

      this.stackTimelines.push(tl);
    });

    // Vase settles at section 4: scales to its final size and steps behind
    // the product labels, timed to resolve exactly as the closing sentence
    // finishes revealing.
    this.canvasService.modelLoaded$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((vase: Group) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: this.vaseSettleWrapper().nativeElement,
            start: 'top center',
            end: 'top top',
            scrub: true,
          },
        });

        tl.to(vase.scale, { x: 3.4, y: 3.4, z: 3.4, duration: 0.8, ease: 'power1.inOut' }, 0).to(
          this.canvasService.canvasContainer,
          { zIndex: 1 },
          '<',
        );

        this.stackTimelines.push(tl);
      });

    // Vase fades out in lockstep with section 4's own shrink+fade window
    // (same HOLD_FRACTION boundary) — by the time section 5 has fully
    // covered the screen, the fixed canvas is already gone, so there's
    // nothing left to clip against the footer.
    this.canvasService.modelLoaded$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: this.vaseSettleWrapper().nativeElement,
            start: `${HOLD_FRACTION * 100}% top`,
            end: 'bottom bottom',
            scrub: true,
            onLeave: () => this.canvasService.setRenderingEnabled(false),
            onEnterBack: () => this.canvasService.setRenderingEnabled(true),
          },
        });

        tl.to(this.canvasService.canvasContainer, { opacity: 0, ease: 'none' });
        this.stackTimelines.push(tl);
      });
  }
}
