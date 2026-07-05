import {
  afterNextRender,
  AfterViewInit,
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
// Register the free plugin
/* gsap.registerPlugin(SplitText, ScrollTrigger); */

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, Divider],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements AfterViewInit {
  private destroyRef = inject(DestroyRef);
  // Grab the parent section wrapper
  readonly navbarWrapper = viewChild<ElementRef<HTMLElement>>('navbarWrapper');
  readonly imageContainer = viewChild<ElementRef<HTMLElement>>('imageContainer');
  readonly menuIcon = viewChild<ElementRef<HTMLElement>>('menuIcon');
  readonly closeIcon = viewChild<ElementRef<HTMLElement>>('closeIcon');
  // Text elements for the 3D roll effect
  readonly textDefault = viewChild<ElementRef<HTMLElement>>('textDefault');
  readonly textHover = viewChild<ElementRef<HTMLElement>>('textHover');

  private splitDefault!: SplitText;
  private splitHover!: SplitText;

  private readonly radiusDepth = -12;
  private readonly transformOrigin = `50% 50% ${this.radiusDepth}px`;

  readonly activeImageRevealIndex = signal<number>(0);

  navLinks = [
    { label: 'About', path: '/about', image: 'navbar/lamp.avif' },
    { label: 'Community', path: '/community', image: 'navbar/community.avif' },
    { label: 'Sell', path: '/sell', image: 'navbar/sell.avif' },
  ];

  // Track state to handle opening and closing
  isMenuOpen = signal<boolean>(false);
  private timeline?: gsap.core.Timeline;
  
  constructor() {
    // afterNextRender is SSR-safe and runs only in the browser after the DOM is ready
    afterNextRender(() => {
      const navElement = this.navbarWrapper()?.nativeElement;
      if (!navElement) return;

      // Your GSAP animation logic
      const showAnim = gsap
        .from(navElement, {
          yPercent: -200,
          paused: true,
          duration: 0.2,
        })
        .progress(1);

      // Your ScrollTrigger configuration
      const trigger = ScrollTrigger.create({
        start: 'top top',
        end: 'max',
        onUpdate: (self) => {
          // self.direction === -1 means scrolling UP
          self.direction === -1 ? showAnim.play() : showAnim.reverse();
        },
      });

      // CRITICAL: Clean up GSAP instances when the component is destroyed
      this.destroyRef.onDestroy(() => {
        trigger.kill();
        showAnim.kill();
      });
    });
  }
  ngAfterViewInit(): void {
    const defaultEl = this.textDefault()?.nativeElement;
    const hoverEl = this.textHover()?.nativeElement;

    if (!defaultEl || !hoverEl) return;

    // Use SplitText to break down the strings automatically
    this.splitDefault = new SplitText(defaultEl, { type: 'chars' });
    this.splitHover = new SplitText(hoverEl, { type: 'chars' });

    // Set initial 3D spacing layout on the generated characters
    gsap.set(this.splitDefault.chars, { rotationX: 0, transformOrigin: this.transformOrigin });
    gsap.set(this.splitHover.chars, { rotationX: -90, transformOrigin: this.transformOrigin });
    // Adding a nice image reveal effect on load
    gsap.set(this.imageContainer()?.nativeElement!, { yPercent: 50 });
  }

  toggleMenu(): void {
    const wrapper = this.navbarWrapper()?.nativeElement;
    const menuImg = this.menuIcon()?.nativeElement;
    const closeImg = this.closeIcon()?.nativeElement;
    const imageContainer = this.imageContainer()?.nativeElement;

    if (!wrapper || !menuImg || !closeImg || !imageContainer) return;

    this.isMenuOpen.update((prev) => !prev);

    if (this.isMenuOpen()) {
      this.timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

      this.timeline
        // Expand width
        .to(wrapper, { width: '95%', duration: 0.4 })

        // Elongate height
        .to(wrapper, { height: '80vh', duration: 0.5 })
        // Smoothly blend the body background to #333 at 20% opacity
        .to(
          'body',
          { backgroundColor: 'rgba(51, 51, 51, 0.2)', duration: 0.4, ease: 'linear' },
          '<',
        )
        .to(menuImg, { opacity: 0, rotate: 90, scale: 0.75, duration: 0.4 }, '<')
        .to(closeImg, { opacity: 1, rotate: 0, scale: 1, duration: 0.4 }, '<')
        // Reveal image content
        .to(imageContainer, { yPercent: 0, duration: 0.5 }, '<');
    } else {
      this.timeline = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

      // Check if the current screen matches Tailwind's md breakpoint (768px)
      const isMediumScreen = window.matchMedia('(min-width: 768px)').matches;

      // Determine the target width based on the screen size
      const targetWidth = isMediumScreen ? '60%' : '95%';

      // When closing, we want to reverse the animation steps:
      this.timeline
        .to(wrapper, {
          height: '12vh',
          duration: 0.4,
          onStart: () => {
            wrapper.style.overflow = 'hidden';
          },
        })
        // Reverse Icon back to 2 lines
        .to(menuImg, { opacity: 1, rotate: 0, scale: 1, duration: 0.4 }, '<')
        .to(closeImg, { opacity: 0, rotate: -90, scale: 0.75, duration: 0.4 }, '<')
        .to('body', { backgroundColor: '#f4f6f9', duration: 0.3 }, '<')
        .to(wrapper, {
          width: targetWidth,
          duration: 0.4,
          onComplete: () => {
            // Optional: removes inline width entirely so resizing the browser window won't break things
            gsap.set(wrapper, { clearProps: 'width' });
          },
        })
        .to(this.imageContainer()?.nativeElement!, { yPercent: 50, duration: 0.5, ease: 'linear' });
    }
  }
  onHover(): void {
    gsap.killTweensOf([this.splitDefault.chars, this.splitHover.chars]);

    const tl = gsap.timeline({ defaults: { duration: 0.35, ease: 'power2.out' } });

    // Stagger across the generated SplitText character arrays
    tl.to(this.splitDefault.chars, { rotationX: 90, stagger: 0.03 }).to(
      this.splitHover.chars,
      { rotationX: 0, stagger: 0.03 },
      '<',
    );
  }

  onLeave(): void {
    gsap.killTweensOf([this.splitDefault.chars, this.splitHover.chars]);

    const tl = gsap.timeline({ defaults: { duration: 0.35, ease: 'power2.out' } });

    tl.to(this.splitDefault.chars, { rotationX: 0, stagger: 0.03 }).to(
      this.splitHover.chars,
      { rotationX: -90, stagger: 0.03 },
      '<',
    );
  }
  setImageRevealActiveIndex(index: number): void {
    this.activeImageRevealIndex.set(index);
  }
}
