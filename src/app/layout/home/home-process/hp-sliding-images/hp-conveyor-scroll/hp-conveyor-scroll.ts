import {
  Component,
  ElementRef,
  viewChildren,
  afterNextRender,
  PLATFORM_ID,
  inject,
  input,
  computed,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

export interface ConveyorImage {
  src: string;
  alt: string;
}

@Component({
  selector: 'app-hp-conveyor-scroll',
  imports: [],
  templateUrl: './hp-conveyor-scroll.html',
  styleUrl: './hp-conveyor-scroll.css',
})
export class HpConveyorScroll {
  private platformId = inject(PLATFORM_ID);

  images = input<ConveyorImage[]>([]);
  speed = input<number>(20); // px per second — identical for every slot now

  // every frame is this fixed width, no matter which slot it's viewed through
  readonly frameWidth = 320;
  readonly aspectRatio = 1.4;

  // visible WINDOW width per slot size — this is what makes them look like
  // different rectangles, while the strip behind them is identical
  readonly slotRatios = [2, 3, 4, 3, 2];
  readonly windowUnit = 85; // px — slot visible width = ratio * windowUnit

  strip = computed<ConveyorImage[]>(() => {
    const currentImages = this.images();
    return [...currentImages, ...currentImages];
  });

  private strips = viewChildren<ElementRef<HTMLDivElement>>('conveyorStrip');
  private tweens: gsap.core.Tween[] = [];

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.initConveyor();
        window.addEventListener('resize', this.onResize);
      }
    });
  }

  windowWidth(ratio: number): number {
    return ratio * this.windowUnit;
  }

  windowHeight(ratio: number): number {
    return this.windowWidth(ratio) / this.aspectRatio;
  }

  private initConveyor() {
    const stripElements = this.strips().map((el) => el.nativeElement);
    if (!stripElements.length || this.images().length === 0) return;

    this.tweens.forEach((t) => t.kill());
    this.tweens = [];

    const imageCount = this.images().length;
    const moveDistance = imageCount * this.frameWidth;
    const duration = moveDistance / this.speed();

    // The precise image index each slot should start displaying:
    const startingIndices = [3, 4, 0, 1, 2];

    // Time taken for a single image to pass through the window view
    const timePerImage = duration / imageCount;

    stripElements.forEach((strip, index) => {
      const tween = gsap.fromTo(
        strip,
        { x: 0 },
        { x: -moveDistance, duration, ease: 'none', repeat: -1 },
      );

      // Get the designated index for this slot, fallback safely if index array mismatches
      const targetImageIndex = startingIndices[index] ?? 0;

      // Fast-forward the tween timeline to perfectly align the targeted image frame at start
      tween.time(targetImageIndex * timePerImage);

      this.tweens.push(tween);
    });
  }

  private onResize = () => this.initConveyor();

  trackByImg(index: number, img: ConveyorImage): string {
    return `${img.src}-${index}`;
  }
}
