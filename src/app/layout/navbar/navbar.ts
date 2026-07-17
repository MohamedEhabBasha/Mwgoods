import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Divider } from '../../shared/components/divider/divider';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Divider],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly destroyRef = inject(DestroyRef);

  readonly navbarWrapper = viewChild.required<ElementRef<HTMLElement>>('navbarWrapper');
  readonly imageContainer = viewChild.required<ElementRef<HTMLElement>>('imageContainer');
  readonly menuIcon = viewChild.required<ElementRef<HTMLElement>>('menuIcon');
  readonly closeIcon = viewChild.required<ElementRef<HTMLElement>>('closeIcon');
  readonly textDefault = viewChild.required<ElementRef<HTMLElement>>('textDefault');
  readonly textHover = viewChild.required<ElementRef<HTMLElement>>('textHover');
  readonly contactBtn = viewChild.required<ElementRef<HTMLElement>>('contactBtn');

  private splitDefault!: SplitText;
  private splitHover!: SplitText;

  private readonly radiusDepth = -12;
  private readonly transformOrigin = `50% 50% ${this.radiusDepth}px`;

  readonly activeImageRevealIndex = signal<number>(0);
  readonly isMenuOpen = signal<boolean>(false);

  readonly linkedinUrl = 'https://www.linkedin.com/in/mohamed-ehab-102341231/';
  readonly githubUrl = 'https://github.com/MohamedEhabBasha';
  readonly upworkUrl = 'https://www.upwork.com/freelancers/~0199103b866c474966?mp_source=share';

  readonly navLinks = [
    { label: 'About', path: '/about', image: 'navbar/lamp.avif' },
    { label: 'Community', path: '/community', image: 'navbar/community.avif' },
    { label: 'Sell', path: '/sell', image: 'navbar/sell.avif' },
  ];

  private timeline?: gsap.core.Timeline;
  private showAnim?: gsap.core.Tween;
  private trigger?: ScrollTrigger;

  constructor() {
    afterNextRender(() => {
      this.initNavbar();
    });

    this.destroyRef.onDestroy(() => {
      this.trigger?.kill();
      this.showAnim?.kill();
      this.timeline?.kill();
      this.splitDefault?.revert();
      this.splitHover?.revert();
    });
  }

  public initNavbar() {
    const navElement = this.navbarWrapper().nativeElement;

    // Hide-on-scroll-down / reveal-on-scroll-up navbar
    this.showAnim = gsap
      .from(navElement, { yPercent: -200, paused: true, duration: 0.2 })
      .progress(1);

    this.trigger = ScrollTrigger.create({
      start: 'top top',
      end: 'max',
      onUpdate: (self) => {
        if (!this.isMenuOpen()) {
          self.direction === -1 ? this.showAnim?.play() : this.showAnim?.reverse();
        }
      },
    });

    // 3D roll-effect text split
    this.splitDefault = new SplitText(this.textDefault().nativeElement, { type: 'chars' });
    this.splitHover = new SplitText(this.textHover().nativeElement, { type: 'chars' });

    gsap.set(this.splitDefault.chars, { rotationX: 0, transformOrigin: this.transformOrigin });
    gsap.set(this.splitHover.chars, { rotationX: -90, transformOrigin: this.transformOrigin });

    // Initial state for the nav-link image reveal
    gsap.set(this.imageContainer().nativeElement, { yPercent: 50 });
  }

  toggleMenu(): void {
    this.isMenuOpen.update((prev) => !prev);
    this.isMenuOpen() ? this.playOpenAnimation() : this.playCloseAnimation();
  }

  /** Closes the menu when a nav link is clicked, so navigation never leaves it open behind the new page. */
  onNavLinkClick(): void {
    if (!this.isMenuOpen()) return;
    this.isMenuOpen.set(false);
    this.playCloseAnimation();
  }

  private playOpenAnimation(): void {
    const wrapper = this.navbarWrapper().nativeElement;
    const menuImg = this.menuIcon().nativeElement;
    const closeImg = this.closeIcon().nativeElement;
    const imageContainer = this.imageContainer().nativeElement;

    this.timeline?.kill();
    this.timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

    this.timeline
      .to(wrapper, { width: '95%', duration: 0.4 })
      .to(wrapper, { height: '80vh', duration: 0.5 })
      .to('body', { backgroundColor: 'rgba(51, 51, 51, 0.2)', duration: 0.4, ease: 'linear' }, '<')
      .to(menuImg, { opacity: 0, rotate: 90, scale: 0.75, duration: 0.4 }, '<')
      .to(closeImg, { opacity: 1, rotate: 0, scale: 1, duration: 0.4 }, '<')
      .to(imageContainer, { yPercent: 0, duration: 0.5 }, '<');
  }

  private playCloseAnimation(): void {
    const wrapper = this.navbarWrapper().nativeElement;
    const menuImg = this.menuIcon().nativeElement;
    const closeImg = this.closeIcon().nativeElement;
    const imageContainer = this.imageContainer().nativeElement;

    const isMediumScreen = window.matchMedia('(min-width: 768px)').matches;
    const targetWidth = isMediumScreen ? '60%' : '95%';

    this.timeline?.kill();
    this.timeline = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

    this.timeline
      .to(wrapper, {
        height: '12vh',
        duration: 0.4,
        onStart: () => {
          wrapper.style.overflow = 'hidden';
        },
      })
      .to(menuImg, { opacity: 1, rotate: 0, scale: 1, duration: 0.4 }, '<')
      .to(closeImg, { opacity: 0, rotate: -90, scale: 0.75, duration: 0.4 }, '<')
      .to('body', { backgroundColor: '#f4f6f9', duration: 0.3 }, '<')
      .to(wrapper, {
        width: targetWidth,
        duration: 0.4,
        onComplete: () => {
          gsap.set(wrapper, { clearProps: 'width' });
        },
      })
      .to(imageContainer, { yPercent: 50, duration: 0.5, ease: 'linear' });
  }

  onHover(): void {
    gsap.killTweensOf([this.splitDefault.chars, this.splitHover.chars]);

    gsap
      .timeline({ defaults: { duration: 0.35, ease: 'power2.out' } })
      .to(this.splitDefault.chars, { rotationX: 90, stagger: 0.03 })
      .to(this.splitHover.chars, { rotationX: 0, stagger: 0.03 }, '<');
  }

  onLeave(): void {
    gsap.killTweensOf([this.splitDefault.chars, this.splitHover.chars]);

    gsap
      .timeline({ defaults: { duration: 0.35, ease: 'power2.out' } })
      .to(this.splitDefault.chars, { rotationX: 0, stagger: 0.03 })
      .to(this.splitHover.chars, { rotationX: -90, stagger: 0.03 }, '<');
  }

  setImageRevealActiveIndex(index: number): void {
    this.activeImageRevealIndex.set(index);
  }
}
