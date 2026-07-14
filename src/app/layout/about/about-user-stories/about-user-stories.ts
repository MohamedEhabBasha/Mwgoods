import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { SquareLabel } from '../../../shared/components/square-label/square-label';
import { ThreejsSceneService } from '../../../core/services/threejs-scene';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Group } from 'three';

export interface UserStory {
  id: string;
  name: string;
  role: string;
  quote: string;
  portrait: string;
}

const PX_PER_SECOND = 55;

const DEFAULT_STORIES: UserStory[] = [
  {
    id: 'us-1',
    name: 'Amelia Chen',
    role: 'Freelance Illustrator',
    quote:
      'I went from zero commissions to a full calendar in six weeks. This basically became my studio.',
    portrait: '/home/cta/portrait-1.avif',
  },
  {
    id: 'us-2',
    name: 'Marcus Reed',
    role: 'Indie Furniture Maker',
    quote: 'My first sale happened on day two. I still have the notification screenshot saved.',
    portrait: '/home/cta/portrait-2.avif',
  },
  {
    id: 'us-3',
    name: 'Priya Nair',
    role: 'Ceramic Artist',
    quote:
      'Customers keep telling me the buying experience feels premium — that trust turns straight into sales.',
    portrait: '/home/cta/portrait-3.avif',
  },
  {
    id: 'us-4',
    name: 'Diego Alvarez',
    role: 'Leather Goods Maker',
    quote:
      'Three years in, and this is still the only place my repeat customers actually come back to.',
    portrait: '/home/cta/portrait-4.avif',
  },
];

@Component({
  selector: 'app-about-user-stories',
  imports: [NgTemplateOutlet, SquareLabel],
  templateUrl: './about-user-stories.html',
  styleUrl: './about-user-stories.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutUserStories {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasService = inject(ThreejsSceneService);

  readonly stories = input<UserStory[]>(DEFAULT_STORIES);

  protected readonly topRow = computed(() => [...this.stories(), ...this.stories()]);
  protected readonly bottomRow = computed(() => {
    const reversed = [...this.stories()].reverse();
    return [...reversed, ...reversed];
  });

  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly headerRef = viewChild.required<ElementRef<HTMLHeadingElement>>('headerEl');
  private readonly topTrackRef = viewChild.required<ElementRef<HTMLElement>>('topTrack');
  private readonly bottomTrackRef = viewChild.required<ElementRef<HTMLElement>>('bottomTrack');

  private topTween?: gsap.core.Tween;
  private bottomTween?: gsap.core.Tween;
  private headerSplit?: SplitText;
  private headerScrollTrigger?: ScrollTrigger;
  private visibilityTrigger?: ScrollTrigger;
  private resizeObserver?: ResizeObserver;
  private resizeTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        return;
      }

      this.initMarquees();

      this.resizeObserver = new ResizeObserver(() => this.scheduleMarqueeRestart());
      this.resizeObserver.observe(this.hostRef().nativeElement);
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.resizeTimeout);
      this.topTween?.kill();
      this.bottomTween?.kill();
      this.headerScrollTrigger?.kill();
      this.visibilityTrigger?.kill();
      this.headerSplit?.revert();
      this.resizeObserver?.disconnect();
      this.canvasService.setRenderingEnabled(true);
    });
  }

  /**
   * Triggers the staggered "STORIES" reveal animation.
   * Exposed publicly so it can be called programmatically by a parent component.
   */
  private playRevealAnimation(): void {
    if (!this.headerSplit) return;

    // Reset previous animations to prevent conflict overlaps
    gsap.killTweensOf(this.headerSplit.chars);
    gsap.set(this.headerSplit.chars, { opacity: 0, yPercent: 70, rotateX: -45 });

    gsap.to(this.headerSplit.chars, {
      opacity: 1,
      yPercent: 0,
      rotateX: 0,
      duration: 0.9,
      ease: 'power4.out',
      stagger: 0.035,
    });
  }

  public initHeaderReveal(): void {
    const headerEl = this.headerRef().nativeElement;

    // Split text into individual animatable characters
    this.headerSplit = new SplitText(headerEl, { type: 'chars', charsClass: 'usr-char' });
    gsap.set(this.headerSplit.chars, { opacity: 0, yPercent: 70, rotateX: -45 });

    // ScrollTrigger triggers the animation when the user scrolls into view
    this.headerScrollTrigger = ScrollTrigger.create({
      trigger: this.hostRef().nativeElement,
      start: 'top top',
      once: true,
      //markers: true,
      onEnter: () => this.playRevealAnimation(),
    });

    this.canvasService.modelLoaded$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((vase: Group) => {
        const vaseTl = gsap.timeline({
          scrollTrigger: {
            trigger: this.hostRef().nativeElement,
            start: 'top bottom',
            end: '10% bottom',
            scrub: true,
            markers: true,
            onLeave: () => this.canvasService.setRenderingEnabled(false),
            onEnterBack: () => this.canvasService.setRenderingEnabled(true),
          },
          defaults: {
            duration: 0.8,
            ease: 'power1.Out',
          },
        });

        vaseTl.to(
          vase.scale,
          {
            x: 0,
            y: 0,
            z: 0,
          },
          0,
        );
        vaseTl.to(
          this.canvasService.canvasContainer,
          {
            opacity: 0,
          },
          '<',
        );
      });
  }

  private initMarquees(): void {
    this.topTween = this.buildMarqueeTween(this.topTrackRef().nativeElement, 'rtl');
    this.bottomTween = this.buildMarqueeTween(this.bottomTrackRef().nativeElement, 'ltr');

    this.visibilityTrigger = ScrollTrigger.create({
      trigger: this.hostRef().nativeElement,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => this.playMarquees(),
      onEnterBack: () => this.playMarquees(),
      onLeave: () => this.pauseMarquees(),
      onLeaveBack: () => this.pauseMarquees(),
    });
  }

  private buildMarqueeTween(track: HTMLElement, direction: 'rtl' | 'ltr'): gsap.core.Tween {
    const distance = track.scrollWidth / 2;
    const duration = distance / PX_PER_SECOND;

    if (direction === 'rtl') {
      return gsap.fromTo(track, { x: 0 }, { x: -distance, duration, ease: 'none', repeat: -1 });
    }

    return gsap.fromTo(track, { x: -distance }, { x: 0, duration, ease: 'none', repeat: -1 });
  }

  private scheduleMarqueeRestart(): void {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.restartMarquees(), 150);
  }

  private restartMarquees(): void {
    this.topTween?.kill();
    this.bottomTween?.kill();
    this.visibilityTrigger?.kill();
    this.initMarquees();
  }

  private playMarquees(): void {
    this.topTween?.play();
    this.bottomTween?.play();
  }

  private pauseMarquees(): void {
    this.topTween?.pause();
    this.bottomTween?.pause();
  }
}
