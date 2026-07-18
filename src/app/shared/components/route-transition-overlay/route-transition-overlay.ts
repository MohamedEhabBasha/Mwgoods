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
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  Event as RouterEvent,
} from '@angular/router';
import { gsap } from 'gsap';

@Component({
  selector: 'app-route-transition-overlay',
  standalone: true,
  imports: [],
  templateUrl: './route-transition-overlay.html',
  styleUrl: './route-transition-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteTransitionOverlay {
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly edge = viewChild.required<ElementRef<SVGPathElement>>('edge');

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sweepRadius = 142; // Covers the 100 x 100 viewport corner-to-corner.
  private readonly sweepSteps = 16; // Arc subdivisions for the clip-path polygon — raise if you ever see faceting.
  private readonly duration = 0.72;

  private ctx?: ReturnType<typeof gsap.context>;
  private tween?: gsap.core.Tween;
  private activeNavigationId: number | null = null;
  private coverFinished = false;
  private navigationFinished = false;
  private reducedMotion = false;

  constructor() {
    // Initialize component-scoped animation boundary
    this.ctx = gsap.context(() => {}, this.host.nativeElement);

    afterNextRender(() => {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resetDom();

      const routerSub = this.router.events.subscribe((event) => this.handleRouterEvent(event));
      this.destroyRef.onDestroy(() => routerSub.unsubscribe());
    });

    this.destroyRef.onDestroy(() => {
      this.ctx?.revert();
      this.ctx = undefined;
    });
  }

  private handleRouterEvent(event: RouterEvent): void {
    // Do not animate the app's first route render.
    if (event instanceof NavigationStart) {
      if (!this.router.navigated || this.reducedMotion) {
        return;
      }

      this.startCover(event.id);
      return;
    }

    if (
      !(event instanceof NavigationEnd) &&
      !(event instanceof NavigationCancel) &&
      !(event instanceof NavigationError) &&
      !(event instanceof NavigationSkipped)
    ) {
      return;
    }

    if (event.id !== this.activeNavigationId) {
      return;
    }

    this.navigationFinished = true;
    this.startRevealWhenReady();
  }

  private startCover(navigationId: number): void {
    this.tween?.kill();
    this.activeNavigationId = navigationId;
    this.coverFinished = false;
    this.navigationFinished = false;

    this.resetDom();
    this.host.nativeElement.classList.add('is-running');

    const state = { progress: 0 };

    this.ctx?.add(() => {
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
          this.coverFinished = true;
          this.startRevealWhenReady();
        },
      });
    });
  }

  private startRevealWhenReady(): void {
    if (!this.coverFinished || !this.navigationFinished || this.activeNavigationId === null) {
      return;
    }

    this.tween?.kill();

    const state = { progress: 0 };

    this.ctx?.add(() => {
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
        onComplete: () => {
          this.activeNavigationId = null;
          this.host.nativeElement.classList.remove('is-running');
          this.resetDom();
        },
      });
    });
  }

  /**
   * Draws the covered region as a pie-wedge anchored at the bottom-left
   * corner, spanning [fromAngleDeg, toAngleDeg]. That corner's field of
   * view across the whole box is exactly the -90deg..0deg arc at this
   * radius, so sweeping -90 -> angle covers the box (cover phase), and
   * angle -> 0 is the exact geometric complement (reveal phase) — no
   * separate mask or polygon inversion needed, just the other half of
   * the same range.
   */
  private setWedge(fromAngleDeg: number, toAngleDeg: number): void {
    const points: string[] = ['0% 100%'];

    for (let i = 0; i <= this.sweepSteps; i++) {
      const t = i / this.sweepSteps;
      const angleDeg = fromAngleDeg + (toAngleDeg - fromAngleDeg) * t;
      const angleRad = angleDeg * (Math.PI / 180);
      const x = this.sweepRadius * Math.cos(angleRad);
      const y = 100 + this.sweepRadius * Math.sin(angleRad);
      points.push(`${x}% ${y}%`);
    }

    this.panel().nativeElement.style.clipPath = `polygon(${points.join(', ')})`;
  }

  /** The visible leading edge follows exactly the same clockwise sweep. */
  private setEdge(angleDeg: number): void {
    const angleRad = angleDeg * (Math.PI / 180);
    const x = this.sweepRadius * Math.cos(angleRad);
    const y = 100 + this.sweepRadius * Math.sin(angleRad);
    this.edge().nativeElement.setAttribute('d', `M 0 100 L ${x} ${y}`);
  }

  private resetDom(): void {
    this.setWedge(-90, -90);
    this.setEdge(-90);
  }
}