import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { PixiWeb } from '../../shared/components/pixi-web/pixi-web';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { Group } from 'three';
import { AboutMission } from "./about-mission/about-mission";
import { AboutUserStories } from "./about-user-stories/about-user-stories";

/** Must mirror the Tailwind `lg:`/`xl:` breakpoints used in the template. */
const MD_MIN_WIDTH = 768;
const LG_MIN_WIDTH = 1024;
const XL_MIN_WIDTH = 1280;

/** Px shift per "distance from middle line" step — tune to taste. */
const MD_TRIANGLE_STEP_PX = 20;
const LG_TRIANGLE_STEP_PX = 28;
const XL_TRIANGLE_STEP_PX = 36;

type ParagraphSide = 'left' | 'right';

@Component({
  selector: 'app-about',
  imports: [PixiWeb, AboutMission, AboutUserStories],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasService = inject(ThreejsSceneService);

  private headerText = viewChild.required<ElementRef<HTMLElement>>('headerText');
  private readonly pinnedSection = viewChild.required<ElementRef<HTMLElement>>('pinnedSection');
  private readonly descriptionWrapper =
    viewChild.required<ElementRef<HTMLElement>>('descriptionWrapper');
  private readonly leftParagraph = viewChild.required<ElementRef<HTMLElement>>('leftParagraph');
  private readonly rightParagraph = viewChild.required<ElementRef<HTMLElement>>('rightParagraph');

  private readonly aboutMission = viewChild.required<AboutMission>(AboutMission);
  private readonly aboutUserStories = viewChild.required<AboutUserStories>(AboutUserStories);

  private heroSplit?: SplitText;
  private leftLinesSplit?: SplitText;
  private rightLinesSplit?: SplitText;

  constructor() {
    afterNextRender(() => {
      this.initAbout();
      this.aboutMission().initAnimation();
      this.aboutUserStories().initHeaderReveal();
    });

    this.destroyRef.onDestroy(() => {
      this.heroSplit?.revert();
      this.leftLinesSplit?.revert();
      this.rightLinesSplit?.revert();
      this.canvasService.setRenderingEnabled(true);
    });
  }

  private initAbout(): void {
    this.createHeroAnimation();
    this.createDescriptionAnimation();
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

  private createDescriptionAnimation(): void {
    const pinnedSection = this.pinnedSection().nativeElement;
    const descriptionSection = this.descriptionWrapper().nativeElement;

    gsap.set(descriptionSection, { yPercent: 100 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinnedSection,
        start: 'top top',
        end: '+=250%',
        scrub: true,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
      },
    });

    tl.to(descriptionSection, {
      yPercent: 0,
      duration: 0.8,
      ease: 'power3.out',
    });

    // Triangle line-reveal is an >=1024px enhancement only. Below that,
    // the wrapper reveal above is the whole animation for this section.
    const width = window.innerWidth;
    if (width < MD_MIN_WIDTH) {
      return;
    }

    const step =
      width >= XL_MIN_WIDTH
        ? XL_TRIANGLE_STEP_PX
        : width >= LG_MIN_WIDTH
          ? LG_TRIANGLE_STEP_PX
          : MD_TRIANGLE_STEP_PX;

    this.leftLinesSplit = this.revealParagraphLines(
      tl,
      this.leftParagraph().nativeElement,
      'left',
      step,
      '-=0.3',
    );
    this.rightLinesSplit = this.revealParagraphLines(
      tl,
      this.rightParagraph().nativeElement,
      'right',
      step,
      '<', // start at the same time as the left paragraph's reveal
    );

    if (width < LG_MIN_WIDTH) {
      return;
    }

    let scale = 3;

    if (width < XL_MIN_WIDTH)
      scale = 2;

    // Animate the VASE
    this.canvasService.modelLoaded$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((vase: Group) => {
        tl.to(vase.scale, { x: scale, y: scale, z: scale, duration: 0.8, ease: 'power1.inOut' }, 0).to(
          this.canvasService.canvasContainer,
          { zIndex: 10 },
          0,
        );
      });
  }

  /**
   * Splits a paragraph into lines and reveals them line by line from the
   * given side. Each line's resting horizontal offset grows with its
   * distance from the middle line, so the resting lines form a symmetric
   * triangle. The offset is anchored to the END of each line (its ragged,
   * natural-wrap edge) rather than the start: each line box is forced to
   * the paragraph's full width and right-aligned, so the box's right edge
   * — which our `x` shift controls precisely — always coincides with the
   * last glyph, regardless of that line's actual text length.
   */
  private revealParagraphLines(
    tl: gsap.core.Timeline,
    el: HTMLElement,
    side: ParagraphSide,
    stepPx: number,
    position: string | number,
  ): SplitText {
    const split = new SplitText(el, {
      type: 'lines',
      linesClass: 'about-desc-line',
    });

    const lines = split.lines;

    // Deterministic box width + right-aligned glyphs -> the box's right
    // edge is always the visual end of the line.
    gsap.set(lines, {
      display: 'block',
      width: '100%',
      textAlign: side === 'left' ? 'right' : 'left',
    });

    const middleIndex = Math.floor(lines.length / 2);
    const sign = side === 'left' ? 1 : -1;
    const enterFromXPercent = side === 'left' ? -100 : 100;

    tl.fromTo(
      lines,
      { xPercent: enterFromXPercent, opacity: 0 },
      {
        xPercent: 0,
        x: (i: number) => sign * Math.abs(i - middleIndex) * stepPx,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.08,
      },
      position,
    );

    return split;
  }
}
