import {
  Component,
  ElementRef,
  viewChildren,
  afterNextRender,
  PLATFORM_ID,
  inject,
  input,
  computed,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

export interface ConveyorImage {
  src: string;
  alt: string;
}

@Component({
  selector: 'app-hp-conveyor-scroll',
  standalone: true,
  imports: [],
  templateUrl: './hp-conveyor-scroll.html',
  styleUrl: './hp-conveyor-scroll.css',
})
export class HpConveyorScroll {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  images = input<ConveyorImage[]>([]);
  speed = input<number>(20); 

  readonly frameWidth = 320;
  readonly aspectRatio = 1.4;
  readonly slotRatios = [2, 3, 4, 3, 2];
  readonly windowUnit = 85; 

  readonly slots = computed(() => {
    return this.slotRatios.map((ratio) => {
      const width = ratio * this.windowUnit;
      return { width, height: width / this.aspectRatio };
    });
  });

  strip = computed<ConveyorImage[]>(() => {
    const currentImages = this.images();
    return [...currentImages, ...currentImages];
  });

  private strips = viewChildren<ElementRef<HTMLDivElement>>('conveyorStrip');
  private tweens: gsap.core.Tween[] = [];
  private resizeTimeout: any;

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        // Look at that! No NgZone wrapping required. 
        // In a pure zoneless app, GSAP automatically runs safely on its own thread.
        this.initConveyor();
        
        const debouncedResize = () => {
          clearTimeout(this.resizeTimeout);
          this.resizeTimeout = setTimeout(() => this.initConveyor(), 150);
        };

        window.addEventListener('resize', debouncedResize);

        this.destroyRef.onDestroy(() => {
          window.removeEventListener('resize', debouncedResize);
          clearTimeout(this.resizeTimeout);
          this.tweens.forEach((t) => t.kill());
        });
      }
    });
  }

  private initConveyor() {
    const stripElements = this.strips().map((el) => el.nativeElement);
    if (!stripElements.length || this.images().length === 0) return;

    this.tweens.forEach((t) => t.kill());
    this.tweens = [];

    const imageCount = this.images().length;
    const moveDistance = imageCount * this.frameWidth;
    const duration = moveDistance / this.speed();
    const startingIndices = [3, 4, 0, 1, 2];
    const timePerImage = duration / imageCount;

    stripElements.forEach((strip, index) => {
      const tween = gsap.fromTo(
        strip,
        { x: 0 },
        { x: -moveDistance, duration, ease: 'none', repeat: -1 },
      );

      const targetImageIndex = startingIndices[index] ?? 0;
      tween.time(targetImageIndex * timePerImage);
      this.tweens.push(tween);
    });
  }
}