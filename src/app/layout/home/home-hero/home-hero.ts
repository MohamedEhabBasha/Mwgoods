import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { PixiWeb } from '../../../shared/components/pixi-web/pixi-web';
import { SquareLabel } from '../../../shared/components/square-label/square-label';
import { ViewportService } from '../../../core/services/viewport-service';


@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [PixiWeb, SquareLabel],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHero {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = inject(ViewportService);

  // Structural Column References
  private leftColumn = viewChild.required<ElementRef<HTMLElement>>('leftColumn');
  private centerColumn = viewChild.required<ElementRef<HTMLElement>>('centerColumn');
  private rightColumn = viewChild.required<ElementRef<HTMLElement>>('rightColumn');

  // Decorative Line References
  private leftDash = viewChild.required<ElementRef<HTMLElement>>('leftDash');
  private rightDash = viewChild.required<ElementRef<HTMLElement>>('rightDash');

  // Title Splitting References
  private targetHeading = viewChild.required<ElementRef<HTMLElement>>('targetHeading');
  private targetSubtitle = viewChild.required<ElementRef<HTMLElement>>('targetSubtitle');

  private headingSplit?: SplitText;
  private subtitleSplit?: SplitText;

  constructor() {
    afterNextRender({
      write: () => {
        // Checked once, not reactively: this is a one-shot entrance sequence,
        // not a persistent effect, so it shouldn't re-arm itself if the user
        // resizes across 1024px mid-session.
        if (!this.viewport.isDesktop()) {
          this.revealStaticState();
          return;
        }

        const tl = this.createHeroAnimationTimeline();

        this.destroyRef.onDestroy(() => {
          tl.kill();
          this.headingSplit?.revert();
          this.subtitleSplit?.revert();
        });
      },
    });
  }

  /**
   * Mobile path: skip SplitText and the timeline entirely — SplitText's DOM
   * splitting and the per-frame tween updates were the actual jank source,
   * not just bundle weight — and explicitly set every element to the same
   * "to" values the real timeline would have landed on, so mobile shows the
   * finished layout instead of getting stuck at the animation's start state.
   */
  private revealStaticState(): void {
    gsap.set(
      [
        this.leftColumn().nativeElement.children,
        this.centerColumn().nativeElement.children,
        this.rightColumn().nativeElement.children,
      ],
      { y: 0, opacity: 1 },
    );

    gsap.set([this.targetHeading().nativeElement, this.targetSubtitle().nativeElement], {
      opacity: 1,
    });

    const leftEl = this.leftDash()?.nativeElement;
    const rightEl = this.rightDash()?.nativeElement;
    if (leftEl) gsap.set(leftEl, { scaleX: 1, opacity: 1 });
    if (rightEl) gsap.set(rightEl, { scaleX: 1, opacity: 1 });
  }

  public createHeroAnimationTimeline(): gsap.core.Timeline {
    this.headingSplit = new SplitText(this.targetHeading().nativeElement, {
      type: 'words,chars',
    });

    this.subtitleSplit = new SplitText(this.targetSubtitle().nativeElement, {
      type: 'words,lines',
    });

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power4.inOut', duration: 1.6 },
    });

    // 1. Character roll-up
    tl.fromTo(
      this.headingSplit.chars,
      { yPercent: 130, rotate: 3 },
      { yPercent: 0, rotate: 0, stagger: 0.02 },
    )
      // 2. Headline cascade overlap
      .fromTo(
        this.subtitleSplit.words,
        { yPercent: 140, rotate: -1.5 },
        { yPercent: 0, rotate: 0, stagger: 0.025 },
        '-=1.3',
      )
      // 3. Simultaneously reveal columns (sliding up) and dashes (expanding outward)
      .fromTo(
        [
          this.leftColumn().nativeElement.children,
          this.centerColumn().nativeElement.children,
          this.rightColumn().nativeElement.children,
        ],
        { y: 45, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.05, duration: 1.3, ease: 'power3.out' },
        '-=0.9',
      );

    const leftEl = this.leftDash()?.nativeElement;
    const rightEl = this.rightDash()?.nativeElement;

    const isLeftVisible = leftEl && leftEl.offsetWidth > 0;
    const isRightVisible = rightEl && rightEl.offsetWidth > 0;

    if (isLeftVisible || isRightVisible) {
      if (isLeftVisible && isRightVisible) {
        tl.fromTo(
          leftEl,
          { scaleX: 0, opacity: 0, transformOrigin: 'right center' },
          { scaleX: 1, opacity: 1, duration: 1.4, ease: 'power4.out' },
          '-=1.1',
        );
        tl.fromTo(
          rightEl,
          { scaleX: 0, opacity: 0, transformOrigin: 'left center' },
          { scaleX: 1, opacity: 1, duration: 1.4, ease: 'power4.out' },
          '<0.1',
        );
      } else if (isLeftVisible) {
        tl.fromTo(
          leftEl,
          { scaleX: 0, opacity: 0, transformOrigin: 'right center' },
          { scaleX: 1, opacity: 1, duration: 1.4, ease: 'power4.out' },
          '-=1.1',
        );
      } else if (isRightVisible) {
        tl.fromTo(
          rightEl,
          { scaleX: 0, opacity: 0, transformOrigin: 'left center' },
          { scaleX: 1, opacity: 1, duration: 1.4, ease: 'power4.out' },
          '-=1.1',
        );
      }
    }

    return tl;
  }
}