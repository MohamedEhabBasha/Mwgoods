// route-transition-overlay.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router,
} from '@angular/router';
import { gsap } from 'gsap';
import { RouteTransitionDriver, RouteTransitionService } from '../../../core/services/route-transition';


@Component({
  selector: 'app-route-transition-overlay',
  standalone: true,
  templateUrl: './route-transition-overlay.html',
  styleUrl: './route-transition-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteTransitionOverlay implements RouteTransitionDriver {
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly edge = viewChild.required<ElementRef<SVGPathElement>>('edge');

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transition = inject(RouteTransitionService);

  private readonly sweepRadius = 142;
  private readonly sweepSteps = 16;
  private readonly duration = 0.72;

  private tween?: gsap.core.Tween;
  private coverPromise?: Promise<void>;
  private phase: 'idle' | 'covering' | 'covered' | 'revealing' = 'idle';
  private revealAfterCover = false;
  private reducedMotion = false;

  constructor() {
    afterNextRender(() => {
      this.reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      this.resetDom();
      this.transition.register(this);

      const routerSub = this.router.events.subscribe((event) =>
        this.handleRouterEvent(event),
      );

      this.destroyRef.onDestroy(() => {
        routerSub.unsubscribe();
        this.transition.unregister(this);
      });
    });

    this.destroyRef.onDestroy(() => this.tween?.kill());
  }

  /** Called by the canDeactivate guard before Angular activates the next page. */
  public cover(): Promise<void> {
    if (this.reducedMotion || this.phase === 'covered') {
      return Promise.resolve();
    }

    if (this.phase === 'covering' && this.coverPromise) {
      return this.coverPromise;
    }

    this.tween?.kill();
    this.phase = 'covering';
    this.revealAfterCover = false;

    this.resetDom();
    this.host.nativeElement.classList.add('is-running');

    const state = { progress: 0 };

    this.coverPromise = new Promise<void>((resolve) => {
      this.tween = gsap.to(state, {
        progress: 1,
        duration: this.duration,
        ease: 'power3.inOut',
        onUpdate: () => {
          const angle = -90 + 90 * state.progress;
          this.setWedge(-90, angle);
          this.setEdge(angle);
        },
        onComplete: () => {
          this.phase = 'covered';
          resolve();

          if (this.revealAfterCover) {
            this.reveal();
          }
        },
      });
    });

    return this.coverPromise;
  }

  /** Called once Angular has activated, cancelled, or skipped navigation. */
  public reveal(): void {
    if (this.reducedMotion) {
      this.finish();
      return;
    }

    if (this.phase === 'covering') {
      this.revealAfterCover = true;
      return;
    }

    if (this.phase !== 'covered') {
      return;
    }

    this.tween?.kill();
    this.phase = 'revealing';

    const state = { progress: 0 };

    this.tween = gsap.to(state, {
      progress: 1,
      duration: this.duration,
      delay: 0.08,
      ease: 'power3.inOut',
      onUpdate: () => {
        const angle = -90 + 90 * state.progress;
        this.setWedge(angle, 0);
        this.setEdge(angle);
      },
      onComplete: () => this.finish(),
    });
  }

  private handleRouterEvent(event: RouterEvent): void {
    if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError ||
      event instanceof NavigationSkipped
    ) {
      this.reveal();
    }
  }

  private setWedge(fromAngleDeg: number, toAngleDeg: number): void {
    const points: string[] = ['0% 100%'];

    for (let i = 0; i <= this.sweepSteps; i++) {
      const progress = i / this.sweepSteps;
      const angleDeg =
        fromAngleDeg + (toAngleDeg - fromAngleDeg) * progress;
      const angleRad = angleDeg * (Math.PI / 180);

      const x = this.sweepRadius * Math.cos(angleRad);
      const y = 100 + this.sweepRadius * Math.sin(angleRad);

      points.push(`${x}% ${y}%`);
    }

    this.panel().nativeElement.style.clipPath = `polygon(${points.join(', ')})`;
  }

  private setEdge(angleDeg: number): void {
    const angleRad = angleDeg * (Math.PI / 180);
    const x = this.sweepRadius * Math.cos(angleRad);
    const y = 100 + this.sweepRadius * Math.sin(angleRad);

    this.edge().nativeElement.setAttribute('d', `M 0 100 L ${x} ${y}`);
  }

  private finish(): void {
    this.phase = 'idle';
    this.coverPromise = undefined;
    this.revealAfterCover = false;
    this.host.nativeElement.classList.remove('is-running');
    this.resetDom();
  }

  private resetDom(): void {
    this.setWedge(-90, -90);
    this.setEdge(-90);
  }
}