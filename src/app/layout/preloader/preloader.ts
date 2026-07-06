import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

/**
 * Full-screen preloader.
 * Draws the vase SVG in sync with real page-load progress,
 * then wipes away with a bottom-to-top clip-path reveal.
 *
 * Emits `finished` once the exit animation completes, so the
 * host can safely destroy/hide this component.
 */
@Component({
  selector: 'app-preloader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './preloader.html',
  styleUrl: './preloader.css',
})
export class Preloader {
  private readonly destroyRef = inject(DestroyRef);

  private readonly screenRef = viewChild.required<ElementRef<HTMLDivElement>>('screen');
  private readonly vaseRef = viewChild.required<ElementRef<SVGSVGElement>>('vase');

  /** Emits once the exit wipe animation has fully completed. */
  readonly finished = output<void>();

  protected readonly displayPercent = signal(0);

  /** Floor so the animation always feels intentional, even on instant loads. */
  private static readonly MIN_DURATION = 4.1;
  /** Ceiling so a slow network never turns this into a stall-feeling wait. */
  private static readonly MAX_DURATION = 4.5;

  private progressTween?: gsap.core.Tween;
  private masterTimeline?: gsap.core.Timeline;

  constructor() {
    afterNextRender(() => this.init());

    this.destroyRef.onDestroy(() => {
      this.progressTween?.kill();
      this.masterTimeline?.kill();
    });
  }

  private init(): void {
    const svg = this.vaseRef().nativeElement;
    const paths = svg.querySelectorAll<SVGPathElement>('path');

    gsap.set(paths, { drawSVG: '0% 0%' });

    const progress = { value: 0 };

    const drawTween = gsap.to(progress, {
      value: 100,
      duration: Preloader.MIN_DURATION,
      ease: 'power1.inOut',
      paused: true,
      onUpdate: () => {
        const pct = Math.round(progress.value);
        this.displayPercent.set(pct);
        gsap.set(paths, { drawSVG: `0% ${progress.value}%` });
      },
    });

    this.progressTween = drawTween;

    gsap.to(
      {},
      {
        duration: 0.2,
        onComplete: () => gsap.to('.preloader__pct', { opacity: 1, duration: 0.4 }),
      },
    );

    this.resolveLoadProgress(drawTween);
  }

  /**
   * Drives the draw tween's progress based on real page-load state,
   * clamped between a minimum (so fast loads still feel premium)
   * and a maximum (so slow loads don't feel stuck).
   */
  private resolveLoadProgress(drawTween: gsap.core.Tween): void {
    const alreadyLoaded = document.readyState === 'complete';

    // Real elapsed-time measurement to decide the final duration via Math.min/Math.max.
    const start = performance.now();

    const finish = () => {
      const elapsedSeconds = (performance.now() - start) / 1000;
      const targetDuration = Math.min(
        Math.max(elapsedSeconds, Preloader.MIN_DURATION),
        Preloader.MAX_DURATION,
      );

      drawTween.duration(targetDuration);
      drawTween.play();
      drawTween.eventCallback('onComplete', () => this.playExit());
    };

    if (alreadyLoaded) {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('load', finish));
    }
  }

  /** Bottom-to-top clip-path collapse, premium easing + slight anticipation. */
  private playExit(): void {
    const screen = this.screenRef().nativeElement;
    const svg = this.vaseRef().nativeElement;

    const tl = gsap.timeline({
      defaults: { ease: 'power4.inOut' },
      onComplete: () => this.finished.emit(),
    });

    this.masterTimeline = tl;

    tl.to('.preloader__pct', {
      opacity: 0,
      y: -8,
      duration: 0.35,
      ease: 'power2.in',
    })
      .to(
        svg,
        {
          scale: 0.85,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.in',
          transformOrigin: '50% 50%',
        },
        '<',
      )
      .to(screen, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 1.05,
        ease: 'power4.inOut',
      });
  }
}
