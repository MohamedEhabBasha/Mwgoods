import {
  Component,
  ElementRef,
  viewChild,
  afterNextRender,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HpConveyorScroll } from './hp-conveyor-scroll/hp-conveyor-scroll';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-hp-sliding-images',
  standalone: true,
  imports: [HpConveyorScroll],
  templateUrl: './hp-sliding-images.html',
  styleUrl: './hp-sliding-images.css',
})
export class HpSlidingImages {
  private platformId = inject(PLATFORM_ID);

  private pinnedSection = viewChild<ElementRef<HTMLDivElement>>('pinnedSection');
  private topLeftGroup = viewChild<ElementRef<SVGGElement>>('topLeftGroup');
  private topRightGroup = viewChild<ElementRef<SVGGElement>>('topRightGroup');
  private bottomGroup = viewChild<ElementRef<SVGGElement>>('bottomGroup');
  private topLeftOverlay = viewChild<ElementRef<HTMLDivElement>>('topLeftOverlay');
  private topRightOverlay = viewChild<ElementRef<HTMLDivElement>>('topRightOverlay');
  private bottomOverlay = viewChild<ElementRef<HTMLDivElement>>('bottomOverlay');

  public initScrollAnimation() {
    const triggerEl = this.pinnedSection()?.nativeElement;
    const topLeft = this.topLeftGroup()?.nativeElement;
    const topRight = this.topRightGroup()?.nativeElement;
    const bottom = this.bottomGroup()?.nativeElement;
    const topLeftOverlay = this.topLeftOverlay()?.nativeElement;
    const topRightOverlay = this.topRightOverlay()?.nativeElement;
    const bottomOverlay = this.bottomOverlay()?.nativeElement;

    if (
      !triggerEl ||
      !topLeft ||
      !topRight ||
      !bottom ||
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

    const paths = [
      topLeft.querySelector('path'),
      topRight.querySelector('path'),
      bottom.querySelector('path'),
    ].filter((p): p is SVGPathElement => p !== null);

    paths.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: -length,
      });
    });

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
    // Tied directly to scroll position via scrub — reverses for free when
    // the user scrolls back up, no extra logic needed for these.
    const introTl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerEl,
        start: 'top 20%', // begins as soon as the section enters view
        end: 'bottom 80%', // finishes exactly when the section gets pinned
        scrub: 1,
      },
    });

    introTl
      .to(topLeftOverlay.querySelector('p'), { xPercent: 0, opacity: 1, ease: 'power2.inOut' }, 0)
      .to(topRightOverlay.querySelector('p'), { xPercent: 0, opacity: 1, ease: 'power2.inOut' })
      .to(bottomOverlay.querySelector('p'), { yPercent: 0, opacity: 1, ease: 'power2.inOut' });

    // ---- TIMELINE 2: non-scrubbed image entrance, direction-aware ----
    // This is the piece that needs to NOT scrub but still reverse cleanly
    // on scroll-up. The trick: build one paused timeline that plays the
    // scale+opacity intro, then drive it with .play()/.reverse() from a
    // SEPARATE ScrollTrigger that just watches enter/leave events — not
    // scroll position. ScrollTrigger calls onEnter when crossing the start
    // going down, and onLeaveBack when crossing it going back up, which is
    // exactly "reverse on scroll up" with zero manual direction tracking.
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
      onLeaveBack: () => imagesTl.reverse(),
    });

    // ---- TIMELINE 3: your existing curtain / SVG draw animation ----
    // Unchanged logic, except it now also scales the images back to 0 as
    // it begins, since the cards should disappear once the curtain opens.
    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerEl,
        start: 'top top',
        end: '+=150%',
        scrub: 1,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    const offset: number = 45;

    scrollTl
      .to(topLeft, { xPercent: -offset, yPercent: -offset, ease: 'power2.inOut' }, 0)
      .to(topRight, { xPercent: offset - 10, yPercent: -offset, ease: 'power2.inOut' }, '<')
      .to(bottom, { yPercent: offset - 10, ease: 'power2.inOut' }, '<')
      .to(topLeftOverlay, { xPercent: '+=5', yPercent: '-=45', ease: 'power2.inOut' }, '<')
      .to(topRightOverlay, { xPercent: 0, yPercent: '-=45', ease: 'power2.inOut' }, '<')
      .to(bottomOverlay, { yPercent: '+=20', ease: 'power2.inOut' }, '<')
      // images shrink away right as the curtain starts opening
      .to(images, { scale: 0, opacity: 0, ease: 'power2.in', duration: 0.3 }, 0)
      .to(topLeftImg, { xPercent: -300, yPercent: -100 }, '<')
      .to(topRightImg, { xPercent: 300, yPercent: -100 }, '<')
      .to(bottomImg, { yPercent: 300 }, '<')
      .to(paths, { strokeDashoffset: 0, ease: 'power2.inOut' }, '<=-0.1');

    return { introTl, imagesTl, scrollTl };
  }
}
