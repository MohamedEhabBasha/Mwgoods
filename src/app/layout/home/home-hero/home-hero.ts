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
        const tl = this.createHeroAnimationTimeline();

        this.destroyRef.onDestroy(() => {
          tl.kill();
          this.headingSplit?.revert();
          this.subtitleSplit?.revert();
        });
      },
    });
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
    const activeDashes = [this.leftDash().nativeElement, this.rightDash().nativeElement].filter(
      (el) => el.offsetWidth > 0,
    );

    // Only build the animation path if the screen size is large enough to render them
    if (activeDashes.length > 0) {
      tl.fromTo(
        activeDashes,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 1.4, ease: 'power4.out', stagger: 0.1 },
        '-=1.1',
      );
    }

    return tl;
  }
}
