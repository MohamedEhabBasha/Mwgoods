import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Single source of truth for viewport width. Exposes the raw width for
 * anything that needs it, plus `isDesktop` — the >=1024px gate used to skip
 * GSAP work project-wide on mobile, replacing the repeated
 * `window.innerWidth < 1024` checks in HomeProductsShowcase, the Community
 * page, and HPStepsShowcase's `offsetParent` checks.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly widthSignal = signal<number>(this.isBrowser ? window.innerWidth : 1024);

  /** Raw viewport width in px. Updates on resize (rAF-coalesced). */
  public readonly width = this.widthSignal.asReadonly();

  /** True at/above the 1024px desktop breakpoint — the gate for GSAP-heavy work. */
  public readonly isDesktop = computed(() => this.widthSignal() >= 1024);

  constructor() {
    if (!this.isBrowser) return;

    let raf = 0;
    const onResize = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => this.widthSignal.set(window.innerWidth));
    };

    window.addEventListener('resize', onResize, { passive: true });

    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    });
  }
}