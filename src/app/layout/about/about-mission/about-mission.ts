import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import gsap from 'gsap';
import { ThreejsSceneService } from '../../../core/services/threejs-scene';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Group } from 'three';

// ScrollTrigger is assumed registered once in app.config.ts per project convention —
// not re-registered here.

@Component({
  selector: 'app-about-mission',
  standalone: true,
  imports: [],
  templateUrl: './about-mission.html',
  styleUrl: './about-mission.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutMission {
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasService = inject(ThreejsSceneService);
  private ctx?: ReturnType<typeof gsap.context>;

  protected readonly leftSection = viewChild.required<ElementRef<HTMLElement>>('leftSection');

  protected readonly paragraphs = [
    'Commerce Begins With People',
    'Trust Is Built Through Conversation',
    'A Living Marketplace',
  ];

  constructor() {
    afterNextRender(() => {});

    this.destroyRef.onDestroy(() => this.ctx?.revert());
  }

  public initAnimation() {
    const width = window.innerWidth;
    // Scroll-jacked animation disabled below the lg breakpoint (project convention).
    if (width < 1024) return;

    this.ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.mission-wrapper',
          start: 'top top',
          end: 'bottom bottom', // = 300vh of scroll, given the 400vh wrapper + 100vh sticky child
          scrub: true,
          pin: false,
          pinSpacing: false,
        },
      });

      tl.to('.mission-paragraph', { y: '-200vh', ease: 'none' }, 0);

      this.canvasService.modelLoaded$
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe((vase: Group) => {
          const vaseTl = gsap.timeline({
            scrollTrigger: {
              trigger: '.mission-wrapper',
              start: 'top center',
              end: '20% center',
              scrub: true,
            },
            defaults: {
              duration: 0.8,
              ease: 'power1.Out',
            },
          });

          let xOffset = -9;
          let rotate = -0.1;

          if (width < 1280) {
            xOffset = -6;
            rotate = -0.02;
          }

          vaseTl.to(
            vase.position,
            {
              x: xOffset,
              y: 6,
              z: -1,
            },
            0,
          );
          vaseTl.to(
            vase.rotation,
            {
              x: rotate,
              y: rotate,
              z: rotate,
            },
            '<',
          );

          vaseTl.to(
            vase.scale,
            {
              x: 1,
              y: 1,
              z: 1,
            },
            '<',
          );
        });

      // Left title column and the first paragraph's image converge together —
      // one shared timeline/trigger so both moves stay in lockstep instead of
      // two independently-timed ScrollTriggers that could drift apart.
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.ph-1',
          start: 'top center',
          end: 'center center',
        },
        defaults: {
          duration: 0.7,
        },
      });

      heroTl
        .fromTo(this.leftSection().nativeElement, { yPercent: 100 }, { yPercent: 0 }, 0)
        .fromTo('.ph-1-img-1', { xPercent: 200 }, { xPercent: 0 }, 0);

      gsap.fromTo(
        '.ph-2-img-2',
        { xPercent: -100 },
        {
          xPercent: 0,
          duration: 0.7,
          scrollTrigger: {
            trigger: '.ph-2',
            start: 'top top',
            //scrub: true,
          },
        },
      );

      gsap.fromTo(
        '.ph-3-img-3',
        { scale: 0 },
        {
          scale: 1,
          duration: 1.5,
          ease: 'bounce.out',
          scrollTrigger: {
            trigger: '.ph-3',
            start: 'top top',
          },
        },
      );
    }, this.hostEl.nativeElement);
  }
}