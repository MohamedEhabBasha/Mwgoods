import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import gsap from 'gsap';
import { ThreejsSceneService } from '../../../core/services/threejs-scene';
import { Group } from 'three';

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

  // Dedicated context solely for isolating GLB animations
  private vaseCtx?: ReturnType<typeof gsap.context>;

  // Tracking list to clean up standard DOM animations manually
  private domAnims: (gsap.core.Timeline | gsap.core.Tween)[] = [];

  protected readonly leftSection = viewChild.required<ElementRef<HTMLElement>>('leftSection');

  protected readonly paragraphs = [
    'Commerce Begins With People',
    'Trust Is Built Through Conversation',
    'A Living Marketplace',
  ];

  constructor() {
    this.destroyRef.onDestroy(() => {
      //console.log('ABOUT MISSION ONDESTROY - CLEANING UP ANIMATIONS');

      // 1. Revert and unbind only the isolated GLB ScrollTriggers
      this.vaseCtx?.revert();
      this.vaseCtx = undefined;

      // 2. Kill all remaining domestic DOM triggers manually
      this.domAnims.forEach((anim) => {
        anim.scrollTrigger?.kill();
        anim.kill();
      });
      this.domAnims = [];

      if (this.canvasService.canvasContainer) {
        gsap.set(this.canvasService.canvasContainer, { clearProps: 'opacity,zIndex' });
      }
    });
  }

  public initAnimation(vase: Group) {
    const width = window.innerWidth;
    if (width < 1024) return;

    // 1. Setup domestic parallax paragraph scroll animation
    const paragraphTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.mission-wrapper',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        pin: false,
        pinSpacing: false,
      },
    });
    paragraphTl.to('.mission-paragraph', { y: '-200vh', ease: 'none' }, 0);
    this.domAnims.push(paragraphTl);

    // 2. Wrap the GLB scale and rotate timeline in its own isolated context
    this.vaseCtx = gsap.context(() => {
      const vaseTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.mission-wrapper',
          start: 'top center',
          end: '20% center',
          scrub: true,
        },
        defaults: {
          duration: 0.8,
          ease: 'power1.out',
        },
      });

      let xOffset = -9;
      let rotate = -0.1;

      if (width < 1280) {
        xOffset = -6;
        rotate = -0.02;
      }

      vaseTl.to(vase.position, { x: xOffset, y: 6, z: -1 }, 0);
      vaseTl.to(vase.rotation, { x: rotate, y: rotate, z: rotate }, '<');
      vaseTl.to(vase.scale, { x: 1, y: 1, z: 1 }, '<');
    }, this.hostEl.nativeElement);

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

    this.domAnims.push(heroTl);

    const img2Tween = gsap.fromTo(
      '.ph-2-img-2',
      { xPercent: -100 },
      {
        xPercent: 0,
        duration: 0.7,
        scrollTrigger: {
          trigger: '.ph-2',
          start: 'top top',
        },
      },
    );
    this.domAnims.push(img2Tween);

    const img3Tween = gsap.fromTo(
      '.ph-3-img-3',
      { scale: 0 },
      {
        scale: 1,
        duration: 1.5,
        ease: 'bounce.out',
        scrollTrigger: {
          trigger: '.ph-3',
          start: 'top top',
          once: true,
        },
      },
    );
    this.domAnims.push(img3Tween);
  }
}
