import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThreejsSceneService } from '../../../../core/services/threejs-scene';

@Component({
  selector: 'app-hp-header',
  imports: [],
  templateUrl: './hp-header.html',
  styleUrl: './hp-header.css',
})
export class HPHeader {
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private canvasService = inject(ThreejsSceneService);
  private storylineSvg = viewChild.required<ElementRef<HTMLElement>>('storylineSvg');
  private storylinePath = viewChild.required<ElementRef<SVGPathElement>>('storylinePath');

  private ctx?: ReturnType<typeof gsap.context>;
  private splitHow?: SplitText;
  private splitStart?: SplitText;
  private splitTo?: SplitText;

  // This component's OWN vase-position timeline, tracked locally so repeated
  // onEnter/onLeaveBack firing (scrolling back and forth across the trigger
  // boundary) kills only its own previous run — not anything else animating
  // the same shared per-page vase instance. gsap.killTweensOf(vase.position)
  // would kill Home's hero timeline's position tween too, since it targets
  // the same object; a timeline instance's own .kill() only takes down its
  // own children.
  private vasePositionTl?: gsap.core.Timeline;

  constructor() {
    this.destroyRef.onDestroy(() => {
      // Revert clears out all inner SplitTexts, ScrollTriggers and timelines instantly
      this.ctx?.revert();
      this.ctx = undefined;

      this.splitHow?.revert();
      this.splitStart?.revert();
      this.splitTo?.revert();
    });
  }

  /**
   * Initializes the scroll animation choreography.
   * Receives the unique route model instance as a parameter, avoiding any global subscription drift.
   */
  public initScrollAnimation(vase: THREE.Group): void {
    this.ctx = gsap.context(() => {
      const splitHow = new SplitText('#animate-how', { type: 'chars' });
      this.splitHow = splitHow;

      const splitStart = new SplitText('#animate-start', { type: 'chars' });
      this.splitStart = splitStart;

      const splitTo = new SplitText('#animate-to', { type: 'chars' });
      this.splitTo = splitTo;

      if (splitTo.chars.length < 2) return;
      const letterT = splitTo.chars[0] as HTMLElement;
      const letterO = splitTo.chars[1] as HTMLElement;

      const svgContainer = this.storylineSvg().nativeElement;
      const rawPath = this.storylinePath().nativeElement;
      const totalPathLength = rawPath.getTotalLength();

      // 1. Setup global initial states
      gsap.set(rawPath, {
        strokeDasharray: totalPathLength,
        strokeDashoffset: -totalPathLength,
      });
      gsap.set(svgContainer, { opacity: 0 });
      gsap.set([letterO, letterT], { opacity: 0, scale: 0.5 });

      // Directly hook triggers using the passed instance
      this.createBoundTriggers(
        vase,
        splitHow,
        splitStart,
        letterT,
        letterO,
        svgContainer,
        rawPath,
      );
    }, this.hostEl.nativeElement);
  }

  private createBoundTriggers(
    vase: THREE.Group,
    splitHow: SplitText,
    splitStart: SplitText,
    letterT: HTMLElement,
    letterO: HTMLElement,
    svgContainer: HTMLElement,
    rawPath: SVGPathElement,
  ): void {
    ScrollTrigger.create({
      trigger: '#trigger-section',
      start: 'top 35%',
      invalidateOnRefresh: true,

      onEnter: () => {
        this.vasePositionTl?.kill();

        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        this.vasePositionTl = tl;

        if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
          tl.to(vase.position, { x: 0, y: 4, z: 0, duration: 0.8, ease: 'power2.inOut' }, 0).to(
            this.canvasService.canvasContainer,
            { zIndex: 10 },
            '<',
          );
        } else if (window.innerWidth >= 1280) {
          tl.to(vase.position, { x: 0, y: 4.5, z: 0, duration: 0.8, ease: 'power2.inOut' }, 0);
        }
      },

      onLeaveBack: () => {
        this.vasePositionTl?.kill();

        const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' } });
        this.vasePositionTl = tl;

        if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
          tl.to(vase.position, { x: 0, y: 2.5, z: 0, duration: 0.4 }, 0).set(
            this.canvasService.canvasContainer,
            { zIndex: 0 },
            0,
          );
        } else if (window.innerWidth >= 1280) {
          tl.to(vase.position, { x: 0, y: -1, z: 0, duration: 0 }, 0);
        }
      },
    });

    ScrollTrigger.create({
      trigger: '#trigger-section',
      start: 'top 35%',
      invalidateOnRefresh: true,
      once: true,

      onEnter: () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        const firstDuration = 0.4;
        const secondDuration = 0.6;

        tl.to(splitHow.chars, { yPercent: 100, stagger: 0.05, duration: firstDuration }, 0)
          .to(letterT, { yPercent: 100, duration: firstDuration, opacity: 1, scale: 1 }, '<')
          .to(splitStart.chars, { yPercent: -100, stagger: 0.05, duration: firstDuration }, '<')
          .to(letterO, { yPercent: -100, duration: firstDuration, opacity: 1, scale: 1 }, '<')
          .to(['#howCover', '#startCover'], { opacity: 0, duration: 0 })
          .to(splitHow.chars, {
            yPercent: 0,
            duration: secondDuration,
            ease: 'power4.inOut',
            stagger: 0.02,
          })
          .to(letterT, { yPercent: 0, duration: secondDuration, ease: 'power4.inOut' }, '<')
          .to(
            splitStart.chars,
            { yPercent: 0, duration: secondDuration, ease: 'power4.inOut', stagger: 0.02 },
            '<',
          )
          .to(letterO, { yPercent: 0, duration: secondDuration, ease: 'power4.inOut' }, '<')
          .to(svgContainer, { opacity: 1, duration: 0.3 }, '<')
          .to(rawPath, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, '<');
      },
    });
  }
}