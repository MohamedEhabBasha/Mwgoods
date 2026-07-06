import {
  Component,
  ElementRef,
  viewChild,
  viewChildren,
  afterNextRender,
  inject,
  DestroyRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { OrbitalButton } from '../../../shared/components/orbital-button/orbital-button';

@Component({
  selector: 'app-home-cta',
  standalone: true,
  imports: [OrbitalButton],
  templateUrl: './home-cta.html',
  styleUrl: './home-cta.css',
})
export class HomeCta {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  // ---- Template refs (signal-based) ----
  private scrollWrapper = viewChild.required<ElementRef<HTMLDivElement>>('scrollWrapper');
  private ctaButton = viewChild.required<ElementRef<HTMLDivElement>>('ctaButton');
  private cardEls = viewChildren<ElementRef<HTMLDivElement>>('card');
  private leftImgEls = viewChildren<ElementRef<HTMLDivElement>>('leftImg');
  private rightImgEls = viewChildren<ElementRef<HTMLDivElement>>('rightImg');

  // ---- Static data ----
  readonly words = ['JOIN', 'WORLD-CLASS', 'TOP', 'ACHIEVERS'] as const;

  readonly left_images = [
    {
      src: 'home/cta/portrait-1.avif',
      alt: 'seller',
    },
    {
      src: 'home/cta/portrait-2.avif',
      alt: 'seller',
    },
    { src: 'home/cta/portrait-3.avif', alt: 'seller' },
    { src: 'home/cta/portrait-4.avif', alt: 'seller' },
    { src: 'home/cta/portrait-5.avif', alt: 'seller' },
  ];

  readonly right_images = [
    {
      src: 'home/cta/logo-1.avif',
      alt: 'logo',
    },
    {
      src: 'home/cta/logo-2.avif',
      alt: 'logo',
    },
    {
      src: 'home/cta/logo-3.avif',
      alt: 'logo',
    },
    {
      src: 'home/cta/logo-4.avif',
      alt: 'logo',
    },
    {
      src: 'home/cta/logo-5.avif',
      alt: 'logo',
    },
  ];

  // ---- Physics constants ----
  readonly radius = 150;
  readonly imgRadius = 400;

  // ---- Mutable animation state ----
  private progress = { value: 0 };
  private hasButtonAppeared = false;
  private scrollTimeline?: gsap.core.Timeline;

  // ---- Cached element arrays (populated once before animation starts) ----
  private cards: HTMLDivElement[] = [];
  private leftImgs: HTMLDivElement[] = [];
  private rightImgs: HTMLDivElement[] = [];

  // ---- Cached derived constants (computed once, reused every tick) ----
  private cardCount = 0;
  private imgCount = 0;
  private cardDivisor = 1; // cards.length - 1
  private imgDivisor = 1; // total - 1
  private halfImgRadius = 0;
  private imgRadiusX = 0; // imgRadius * 0.4

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.cacheElements();
      //this.scrollAnimation();

      this.destroyRef.onDestroy(() => {
        this.scrollTimeline?.kill();
      });
    });
  }

  // Cache all DOM arrays and derived constants once — never inside the RAF loop
  private cacheElements(): void {
    this.cards = this.cardEls().map((r) => r.nativeElement);
    this.leftImgs = this.leftImgEls().map((r) => r.nativeElement);
    this.rightImgs = this.rightImgEls().map((r) => r.nativeElement);

    this.cardCount = this.cards.length;
    this.imgCount = this.leftImgs.length;
    this.cardDivisor = Math.max(this.cardCount - 1, 1);
    this.imgDivisor = Math.max(this.imgCount - 1, 1);
    this.halfImgRadius = this.imgRadius * 0.5;
    this.imgRadiusX = this.imgRadius * 0.4;
  }

  public scrollAnimation(): void {
    this.scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: this.scrollWrapper().nativeElement,
        start: 'top top',
        end: 'bottom bottom',
        pin: false,
        pinSpacing: false,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    this.scrollTimeline
      .to({}, { duration: 0.1 })
      .to(this.progress, {
        value: 1,
        ease: 'none',
        onUpdate: () => {
          this.animateCards();
          this.animateGallery();
          if (this.progress.value >= 0.95 && !this.hasButtonAppeared) {
            this.revealButton();
          }
        },
      })
      .to({}, { duration: 0.3 });

    // Initial render pass
    this.animateCards();
    this.animateGallery();
  }

  private animateCards(): void {
    const p = this.progress.value;

    for (let i = 0; i < this.cardCount; i++) {
      const theta = i / this.cardDivisor - p;
      const angle = theta * Math.PI * 1.5;

      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      const y = sinA * this.radius;
      const z = cosA * this.radius;
      const rotX = -angle * (180 / Math.PI);

      const el = this.cards[i];
      el.style.transform = `translate3d(0px,${y}px,${z}px) rotateX(${rotX}deg)`;
      el.style.zIndex = Math.round(z + this.radius).toString();

      // mapRange inline: avoids function call overhead in tight loop
      // input range: [-radius*0.5, radius] → output range: [0, 1]
      const mapped = (z - -this.halfImgRadius) / (this.radius - -this.halfImgRadius);
      el.style.opacity = Math.min(1, Math.max(0, mapped)).toString();
    }
  }

  private animateGallery(): void {
    const p = this.progress.value;

    for (let i = 0; i < this.imgCount; i++) {
      const theta = i / this.imgDivisor - p;
      const angle = theta * Math.PI * 0.8;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const xOffset = cosA * this.imgRadiusX;
      const y = sinA * this.imgRadius;
      const fade = Math.min(1, Math.max(0, cosA * 1.5));
      const rotDeg = angle * (180 / Math.PI) * 0.3;

      // Left — anti-clockwise (original behaviour)
      const xL = -100 + xOffset;
      this.leftImgs[i].style.transform = `translate3d(${xL}px,${y}px,0px) rotateZ(${-rotDeg}deg)`;
      this.leftImgs[i].style.opacity = fade.toString();

      // Right — clockwise: negate rotDeg AND negate xOffset direction
      const xR = 100 - xOffset;
      this.rightImgs[i].style.transform = `translate3d(${xR}px,${y}px,0px) rotateZ(${rotDeg}deg)`;
      this.rightImgs[i].style.opacity = fade.toString();
    }
  }

  private revealButton(): void {
    this.hasButtonAppeared = true;
    gsap.to(this.ctaButton().nativeElement, {
      opacity: 1,
      scale: 1,
      pointerEvents: 'auto',
      duration: 0.6,
      ease: 'back.out(1.7)',
    });
  }
}
