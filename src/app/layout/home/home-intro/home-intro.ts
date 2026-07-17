import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';

import { OrbitalButton } from '../../../shared/components/orbital-button/orbital-button';

@Component({
  selector: 'app-home-intro',
  standalone: true,
  imports: [
    OrbitalButton,
  ],
  templateUrl: './home-intro.html',
  styleUrl: './home-intro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeIntro {
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly mainIntroStructure =
    viewChild.required<ElementRef<HTMLElement>>('mainIntroStructure');

  private readonly leftColumn = viewChild.required<ElementRef<HTMLElement>>('leftColumn');

  private readonly centerColumn = viewChild.required<ElementRef<HTMLElement>>('centerColumn');

  private readonly rightColumn = viewChild.required<ElementRef<HTMLElement>>('rightColumn');

  private readonly targetCenterVideo =
    viewChild.required<ElementRef<HTMLVideoElement>>('targetCenterVideo');

  private readonly storylineSvg = viewChild.required<ElementRef<HTMLElement>>('storylineSvg');

  private readonly storylinePath = viewChild.required<ElementRef<SVGPathElement>>('storylinePath');

  private ctx?: ReturnType<typeof gsap.context>;

  constructor() {
    // Initialize the context scoped to this host element
    this.ctx = gsap.context(() => {}, this.hostEl.nativeElement);

    this.destroyRef.onDestroy(() => {
      // Safely cleans up and reverts ALL sets/timelines created inside this component context
      this.ctx?.revert();
      this.ctx = undefined;
    });
  }

  /**
   * Called by the parent master timeline.
   */
  public createIntroAnimationTimeline(): gsap.core.Timeline {
    // Wrapping the call in ctx.add ensures everything generated is cataloged by this context
    return this.ctx?.add(() => {
      return window.innerWidth < 1280 ? this.createMobileTimeline() : this.createDesktopTimeline();
    }) as gsap.core.Timeline;
  }

  /**
   * Desktop Animation
   */
  private createDesktopTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({
      defaults: {
        ease: 'power3.inOut',
      },
    });

    const main = this.mainIntroStructure().nativeElement;
    const left = this.leftColumn().nativeElement;
    const center = this.centerColumn().nativeElement;
    const right = this.rightColumn().nativeElement;
    const video = this.targetCenterVideo().nativeElement;
    const svgContainer = this.storylineSvg().nativeElement;
    const path = this.storylinePath().nativeElement;

    const pathLength = path.getTotalLength() || 0;
    const aboutParagraph = left.querySelector('p');

    //
    // Initial States
    //
    gsap.set(main, { yPercent: 100 });
    gsap.set(center, { yPercent: 100 });
    gsap.set([left, right], { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(video, { scale: 1.15, opacity: 0 });
    gsap.set([aboutParagraph], { opacity: 0, y: 30 });
    gsap.set(path, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength,
    });
    gsap.set(svgContainer, { opacity: 0 });

    //
    // Timeline
    //
    tl.to(main, {
      yPercent: 0,
      ease: 'none',
      duration: 1,
    }, 0)
      // Center Panel
      .to(center, {
        yPercent: 0,
        duration: 1.2,
      })
      // Side Panels
      .to(
        [left, right],
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          stagger: 0.1,
        },
        '-=1',
      )
      // Video Reveal
      .to(
        video,
        {
          opacity: 1,
          scale: 1,
          duration: 1.4,
          ease: 'power2.out',
        },
        '-=0.85',
      )
      // Story Line
      .to(
        svgContainer,
        {
          opacity: 1,
          duration: 0.3,
        },
        '-=0.8',
      )
      // About Section
      .fromTo(
        aboutParagraph,
        { y: 25 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
        },
        '-=0.65',
      )
      .to(
        path,
        {
          strokeDashoffset: 0,
          duration: 1.8,
          ease: 'power2.inOut',
        },
        '<',
      )
      // Final Background
      .to(
        main,
        {
          backgroundColor: '#ffffff',
          duration: 0.6,
        },
        '-=0.8',
      )
      .to({}, { duration: 1 });

    return tl;
  }

  /**
   * Mobile Animation
   */
  private createMobileTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({
      defaults: {
        ease: 'power2.out',
      },
    });

    const main = this.mainIntroStructure().nativeElement;
    const video = this.targetCenterVideo().nativeElement;

    gsap.set(video, {
      opacity: 0,
      scale: 1.08,
    });

    tl.fromTo(
      main,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 1.3,
      },
    ).to(
      video,
      {
        opacity: 1,
        scale: 1,
        duration: 1,
      },
      '-=0.7',
    );

    return tl;
  }
}