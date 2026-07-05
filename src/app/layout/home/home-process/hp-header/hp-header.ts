import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);
  private canvasService = inject(ThreejsSceneService);
  private storylineSvg = viewChild.required<ElementRef<HTMLElement>>('storylineSvg');
  private storylinePath = viewChild.required<ElementRef<SVGPathElement>>('storylinePath');

  private vaseScrollTrigger?: ScrollTrigger;
  private introScrollTrigger?: ScrollTrigger;
  private vaseTimeline?: gsap.core.Timeline;
  private introTimeline?: gsap.core.Timeline;
  private splitHow?: SplitText;
  private splitStart?: SplitText;
  private splitTo?: SplitText;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.vaseScrollTrigger?.kill();
      this.introScrollTrigger?.kill();
      this.vaseTimeline?.kill();
      this.introTimeline?.kill();
      this.splitHow?.revert();
      this.splitStart?.revert();
      this.splitTo?.revert();
    });
  }

  public initScrollAnimation(): void {
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

    const cachedModel = this.canvasService.getModel();
    if (cachedModel) {
      this.createBoundTriggers(
        cachedModel,
        splitHow,
        splitStart,
        letterT,
        letterO,
        svgContainer,
        rawPath,
      );
      return;
    }

    // Fallback if model isn't ready yet
    this.canvasService.modelLoaded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((vase) =>
        this.createBoundTriggers(
          vase,
          splitHow,
          splitStart,
          letterT,
          letterO,
          svgContainer,
          rawPath,
        ),
      );
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
    // 🏎️ Vase choreography — the 3D object is shared across sections, so it keeps
    // responding on every enter/leave, exactly like before.
    this.vaseScrollTrigger = ScrollTrigger.create({
      trigger: '#trigger-section',
      start: 'top 35%',
      invalidateOnRefresh: true,

      onEnter: () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        this.vaseTimeline = tl;

        if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
          tl.to(vase.position, { x: 0, y: 4, z: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
            .to(vase.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: 'power2.inOut' }, '<')
            .to(this.canvasService.canvasContainer, { zIndex: 10 }, '<');
        } else if (window.innerWidth >= 1280) {
          tl.to(vase.position, { x: 0, y: 4.5, z: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
            .to(vase.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: 'power2.inOut' }, '<');
        }
      },

      // ⚡ WHEN SCROLLING BACK UP: return the vase home, fast
      onLeaveBack: () => {
        gsap.killTweensOf([vase.position, vase.scale, this.canvasService.canvasContainer]);

        const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' } });
        this.vaseTimeline = tl;

        if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
          tl.to(vase.position, { x: 0, y: 2.5, z: 0, duration: 0.4 }, 0)
            .set(this.canvasService.canvasContainer, { zIndex: 0 }, 0)
            .to(vase.scale, { x: 2.4, y: 2.4, z: 2.4, duration: 0.8, ease: 'power2.inOut' }, '<');
        } else if (window.innerWidth >= 1280) {
          tl.to(vase.position, { x: 0, y: -1, z: 0, duration: 0 }, 0);
        }
      },
    });

    // ✨ Header text/SVG reveal — plays once, then this trigger kills itself.
    // No onLeaveBack here: once it's revealed, it stays revealed.
    this.introScrollTrigger = ScrollTrigger.create({
      trigger: '#trigger-section',
      start: 'top 35%',
      invalidateOnRefresh: true,
      once: true,

      onEnter: () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        this.introTimeline = tl;

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