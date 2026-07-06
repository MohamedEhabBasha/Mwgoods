import {
  Component,
  ElementRef,
  viewChildren,
  viewChild,
  input,
  effect,
  signal,
  AfterViewInit,
  inject,
  DestroyRef,
} from '@angular/core';
import gsap from 'gsap';

@Component({
  selector: 'app-orbital-button',
  standalone: true,
  imports: [],
  templateUrl: './orbital-button.html',
  styleUrl: './orbital-button.css',
})
export class OrbitalButton implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  text      = input<string>('EXPLORE');
  ariaLabel = input<string>('');
  color     = input<string>('#333');

  letterElements   = viewChildren<ElementRef<HTMLSpanElement>>('letter');
  containerElement = viewChild<ElementRef<HTMLButtonElement>>('btnContainer');
  textWrapper      = viewChild<ElementRef<HTMLDivElement>>('textWrapper');

  protected chars = signal<string[]>([]);
  private radius = 0;

  private baseChars: string[] = [];
  private currentRepeatCount = 1;
  private readonly minGapPx = 24; // minimum px gap between repeated words around the ring

  private scaleTween?: gsap.core.Tween;
  private idleTween?: gsap.core.Tween;
  private readonly rotationDuration = 10; // seconds per full revolution, tweak to taste

  constructor() {
    effect(() => {
      // Replaces layout-breaking literal text '&nbsp;' with a real Unicode space character
      this.baseChars = this.text().split('').map(c => c === ' ' ? '\u00A0' : c);
      this.currentRepeatCount = 1;
      this.chars.set(this.baseChars);

      // RequestAnimationFrame guarantees the DOM has rendered structural nodes before calculations
      requestAnimationFrame(() => this.calculateRadius());
    });
  }

  ngAfterViewInit() {
    this.calculateRadius();

    const resizeHandler = () => this.calculateRadius();
    window.addEventListener('resize', resizeHandler);

    this.startIdleRotation();

    // Prevent memory leaks completely
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', resizeHandler);
      this.idleTween?.kill();
      this.scaleTween?.kill();
    });
  }

  private calculateRadius() {
    const btn = this.containerElement()?.nativeElement;
    if (!btn) return;

    this.radius = btn.offsetWidth * 0.52;
    this.setup3DLayout();
  }

  /**
   * Measures the word's real rendered width, works out how many copies of it fit
   * evenly around the full circle, and positions every character in 3D space.
   * May run twice: once to measure and (if the repeat count needs to change) rebuild
   * the character list, then again on the next frame to lay out the final set.
   */
  private setup3DLayout() {
    const letters = this.letterElements();
    const wordLength = this.baseChars.length;
    if (!letters.length || !wordLength || !this.radius) return;

    // Batch read to completely prevent Layout Thrashing
    letters.forEach(r => (r.nativeElement.style.position = 'static'));
    const widths = letters.map(r => r.nativeElement.offsetWidth);
    letters.forEach(r => (r.nativeElement.style.position = 'absolute'));

    const oneWordWidth = widths.slice(0, wordLength).reduce((a, b) => a + b, 0);
    if (!oneWordWidth) return;

    const circumference = 2 * Math.PI * this.radius;
    const desiredRepeatCount = Math.max(1, Math.floor(circumference / (oneWordWidth + this.minGapPx)));

    if (desiredRepeatCount !== this.currentRepeatCount) {
      this.currentRepeatCount = desiredRepeatCount;
      this.chars.set(Array(desiredRepeatCount).fill(this.baseChars).flat());
      // Wait for the newly repeated letters to render before laying them out
      requestAnimationFrame(() => this.setup3DLayout());
      return;
    }

    // Spread repeats evenly: divide whatever space is left over into equal gaps
    const gapPerRepeat = (circumference - desiredRepeatCount * oneWordWidth) / desiredRepeatCount;
    const gapAngle = gapPerRepeat / this.radius;

    let cursor = 0;

    letters.forEach((letterRef, index) => {
      const el = letterRef.nativeElement;
      const arcWidth = widths[index] / this.radius;
      const centreAngle = cursor + arcWidth / 2;
      cursor += arcWidth;

      // Convert the angle to degrees for CSS rotation
      const rotationY = centreAngle * (180 / Math.PI);

      // Map out the layout: rotate to face outward, then push back along the Z-axis
      el.style.transform = `rotateY(${rotationY}deg) translateZ(${this.radius}px)`;

      // After finishing a repeat of the word, leave an equal gap before the next one
      const isEndOfRepeat = (index + 1) % wordLength === 0;
      if (isEndOfRepeat) {
        cursor += gapAngle;
      }
    });
  }

  private startIdleRotation(fromRotationY = 0) {
    const wrapper = this.textWrapper()?.nativeElement;
    if (!wrapper) return;

    this.idleTween = gsap.to(wrapper, {
      rotationY: fromRotationY + 360,
      duration: this.rotationDuration,
      ease: 'none',
      repeat: -1,
    });
  }

  onMouseEnter() {
    const container = this.containerElement()!.nativeElement;

    // Just stop the idle spin wherever it currently is
    this.idleTween?.kill();

    this.scaleTween?.kill();
    this.scaleTween = gsap.to(container, {
      scale: 1.08,
      duration: 0.5,
      ease: 'power2.out',
    });
  }

  onMouseLeave() {
    const wrapper = this.textWrapper()!.nativeElement;
    const container = this.containerElement()!.nativeElement;

    // Resume rotating from wherever it stopped
    const current = gsap.getProperty(wrapper, 'rotationY') as number;
    this.startIdleRotation(current);

    this.scaleTween?.kill();
    this.scaleTween = gsap.to(container, {
      scale: 1,
      duration: 0.5,
      ease: 'power2.out',
    });
  }
}