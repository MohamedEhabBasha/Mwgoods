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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { Group } from 'three';
import { AboutMission } from './about-mission/about-mission';
import { AboutUserStories } from './about-user-stories/about-user-stories';
import { ScrollTriggerReadyService } from '../../core/services/scroll-trigger-ready';

const MD_MIN_WIDTH = 768;
const LG_MIN_WIDTH = 1024;
const XL_MIN_WIDTH = 1280;

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
  private readonly sceneService = inject(ThreejsSceneService);
  private readonly readyService = inject(ScrollTriggerReadyService);

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
  private mainTl?: ScrollTrigger;

  private glbCtx?: gsap.Context;

  constructor() {
    afterNextRender(() => {
      const model = this.sceneService.spawnVaseInstance();
      if (model) {
        this.startAboutRouteAnimations(model);
      } else {
        // GLB still loading — try again once it's ready
        this.sceneService.sourceReady$
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const m = this.sceneService.spawnVaseInstance();
            if (m) {
              this.startAboutRouteAnimations(m);
            }
          });
      }
    });

    this.destroyRef.onDestroy(() => {
      this.glbCtx?.revert();
      this.heroSplit?.revert();
      this.leftLinesSplit?.revert();
      this.rightLinesSplit?.revert();
      this.mainTl?.kill();
      this.sceneService.setRenderingEnabled(true);
      if (this.sceneService.canvasContainer) {
        gsap.set(this.sceneService.canvasContainer, { clearProps: 'opacity,zIndex' });
      }
      //console.log('ABOUT CONSTRUCTOR ONDESTROY');
    });
  }

  private startAboutRouteAnimations(model: Group): void {
    //model.traverse((c: any) => c.isMesh && (c.material = c.material.clone()));

    this.initAbout(model);

    // Direct, synchronous injection of the route's custom model clone
    this.aboutMission().initAnimation(model);
    this.aboutUserStories().initHeaderReveal(model);

    this.readyService.signal();
  }

  private initAbout(model: Group): void {
    this.createHeroAnimation();
    this.createDescriptionAnimation(model);
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

  private createDescriptionAnimation(model: Group): void {
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
      '<',
    );

    if (width < LG_MIN_WIDTH) {
      return;
    }

    let scale = 3;
    if (width < XL_MIN_WIDTH) scale = 2;

    this.glbCtx = gsap.context(() => {
      tl.to(
        model.scale,
        { x: scale, y: scale, z: scale, duration: 0.8, ease: 'power1.inOut' },
        0,
      ).to(this.sceneService.canvasContainer, { zIndex: 10 }, 0);
    });

    this.mainTl = tl.scrollTrigger;
  }

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
