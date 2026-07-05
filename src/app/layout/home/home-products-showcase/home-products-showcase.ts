import { Component, ElementRef, viewChild, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HpConveyorScroll } from '../home-process/hp-sliding-images/hp-conveyor-scroll/hp-conveyor-scroll';
import { SquareLabel } from '../../../shared/components/square-label/square-label';

@Component({
  selector: 'app-home-products-showcase',
  imports: [HpConveyorScroll, SquareLabel],
  templateUrl: './home-products-showcase.html',
  styleUrl: './home-products-showcase.css',
})
export class HomeProductsShowcase {
  private platformId = inject(PLATFORM_ID);

  private pinnedSection = viewChild<ElementRef<HTMLDivElement>>('pinnedSection');
  private topLeftGroup = viewChild<ElementRef<SVGGElement>>('topLeftGroup');
  private topRightGroup = viewChild<ElementRef<SVGGElement>>('topRightGroup');
  private bottomGroup = viewChild<ElementRef<SVGGElement>>('bottomGroup');
  private enjoyWord = viewChild<ElementRef<HTMLDivElement>>('enjoyWord');
  private searchWord = viewChild<ElementRef<HTMLDivElement>>('searchWord');
  private orderWord = viewChild<ElementRef<HTMLDivElement>>('orderWord');

  private readonly DESKTOP_BREAKPOINT = 1024;

  public scrollAnimation() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.innerWidth < this.DESKTOP_BREAKPOINT) return;

    const pinnedEl = this.pinnedSection()?.nativeElement;
    const topLeft = this.topLeftGroup()?.nativeElement;
    const topRight = this.topRightGroup()?.nativeElement;
    const bottom = this.bottomGroup()?.nativeElement;
    const enjoy = this.enjoyWord()?.nativeElement;
    const search = this.searchWord()?.nativeElement;
    const order = this.orderWord()?.nativeElement;

    if (!pinnedEl || !topLeft || !topRight || !bottom || !search || !order) return;

    const paths = [
      topLeft.querySelector('path'),
      topRight.querySelector('path'),
      bottom.querySelector('path'),
    ].filter((p): p is SVGPathElement => p !== null);

    const pathLengths = paths.map((path) => path.getTotalLength());

    gsap.set(paths, {
      strokeDasharray: (i: number) => pathLengths[i],
      strokeDashoffset: (i: number) => -pathLengths[i],
    });

    const wrapperEl = pinnedEl.parentElement!;
    const offset = 45;

    gsap.set([topLeft, topRight], { xPercent: 0, yPercent: 0 });
    gsap.set(bottom, { yPercent: 0 });

    // ---- PHASE 1: SVGs slide into position while entering viewport ----
    gsap
      .timeline({
        scrollTrigger: {
          trigger: wrapperEl,
          start: 'top 70%',
          end: 'top top',
          scrub: 1,
        },
      })
      .to(topLeft, { xPercent: -offset, yPercent: -offset, ease: 'power2.out' }, 0)
      .to(topRight, { xPercent: offset - 10, yPercent: -offset, ease: 'power2.out' }, '<');

    // ---- PHASE 2: word appears once the section is pinned ----
    const words = [enjoy, search, order].filter((w): w is HTMLDivElement => w !== null);

    const wordTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.7 } });

    if (words.length) {
      gsap.set(words, { opacity: 0, y: 24, scale: 0.96 });

      wordTl
        .to(words, { opacity: 1, y: 0, scale: 1, stagger: 0.08 }, 0)
        .to(paths, { strokeDashoffset: 0, ease: 'power2.inOut', duration: 1 }, 0);
    }

    ScrollTrigger.create({
      trigger: wrapperEl,
      start: 'top top',
      end: 'bottom bottom',
      onEnter: () => wordTl.play(),
      onLeaveBack: () => wordTl.reverse(),
    });

    return { wordTl };
  }
}