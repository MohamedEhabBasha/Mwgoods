import {
  Component,
  ElementRef,
  viewChild,
  PLATFORM_ID,
  inject,
  signal,
  DestroyRef,
  computed,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-hp-sliding-images',
  standalone: true,
  imports: [],
  templateUrl: './hp-sliding-images.html',
  styleUrl: './hp-sliding-images.css',
})
export class HpSlidingImages {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private resizeTimeout?: ReturnType<typeof setTimeout>;

  private screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);

  isDesktop = computed(() => this.screenWidth() >= 1024);

  private pinnedSection = viewChild<ElementRef<HTMLDivElement>>('pinnedSection');
  private topLeftOverlay = viewChild<ElementRef<HTMLDivElement>>('topLeftOverlay');
  private topRightOverlay = viewChild<ElementRef<HTMLDivElement>>('topRightOverlay');
  private bottomOverlay = viewChild<ElementRef<HTMLDivElement>>('bottomOverlay');

    constructor() {
    if (typeof window === 'undefined') return;

    const onResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.screenWidth.set(window.innerWidth);
      }, 150); // tune to taste — 100–200ms is typical
    };

    window.addEventListener('resize', onResize, { passive: true });

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      clearTimeout(this.resizeTimeout);
    });
  }

  public initScrollAnimation() {
    const triggerEl = this.pinnedSection()?.nativeElement;

    const topLeftOverlay = this.topLeftOverlay()?.nativeElement;
    const topRightOverlay = this.topRightOverlay()?.nativeElement;
    const bottomOverlay = this.bottomOverlay()?.nativeElement;

    if (
      !triggerEl ||
      !topLeftOverlay ||
      !topRightOverlay ||
      !bottomOverlay
    )
      return;

    // The three "card" images live inside each overlay. Query them out so
    // they can be animated independently of the paragraph text next to them.
    const topLeftImg = topLeftOverlay.querySelector('div.rounded-2xl');
    const topRightImg = topRightOverlay.querySelector('div.rounded-2xl');
    const bottomImg = bottomOverlay.querySelector('div.rounded-2xl');
    const images = [topLeftImg, topRightImg, bottomImg].filter((el): el is Element => el !== null);



    // ---- INITIAL STATES (before anything plays) ----
    // Paragraphs start off-position so the scrub can pull them in.
    gsap.set(topLeftOverlay.querySelector('p'), { xPercent: -120, opacity: 0 });
    gsap.set(topRightOverlay.querySelector('p'), { xPercent: 120, opacity: 0 });
    gsap.set(bottomOverlay.querySelector('p'), { yPercent: 120, opacity: 0 });

    // Images start invisible/scaled down — this is the state the
    // non-scrubbed intro timeline will animate FROM, and the state the
    // curtain timeline will animate back TO at the end.
    gsap.set(images, { scale: 0, opacity: 0, transformOrigin: 'center center' });

    // ---- TIMELINE 1: scrubbed paragraph entrance ----
    const introTl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerEl,
        start: 'top 20%', // begins as soon as the section enters view
        end: 'bottom 80%', // finishes exactly when the section gets pinned
      },
    });

    introTl
      .to(
        topLeftOverlay.querySelector('p'),
        { xPercent: 0, opacity: 1, ease: 'power2.inOut', duration: 0.3 },
        0,
      )
      .to(topRightOverlay.querySelector('p'), {
        xPercent: 0,
        opacity: 1,
        ease: 'power2.inOut',
        duration: 0.3,
      })
      .to(bottomOverlay.querySelector('p'), {
        yPercent: 0,
        opacity: 1,
        ease: 'power2.inOut',
        duration: 0.3,
      });

    // ---- TIMELINE 2: non-scrubbed image entrance, direction-aware ----
    const imagesTl = gsap.timeline({ paused: true });
    imagesTl.to(images, {
      scale: 1,
      opacity: 1,
      duration: 0.6,
      ease: 'back.out(1.7)',
      stagger: 0.12,
    });

    ScrollTrigger.create({
      trigger: triggerEl,
      start: 'top 20%', // adjust to taste — when the images should pop in
      end: 'bottom bottom',
      onEnter: () => imagesTl.play(),
     /*  onLeaveBack: () => imagesTl.reverse(), */
    });

  }
}
