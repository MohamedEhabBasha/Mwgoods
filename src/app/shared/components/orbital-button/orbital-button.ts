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
  private animationTimeline?: gsap.core.Timeline;

  constructor() {
    effect(() => {
      // Replaces layout-breaking literal text '&nbsp;' with a real Unicode space character
      const processedChars = this.text().split('').map(c => c === ' ' ? '\u00A0' : c);
      this.chars.set(processedChars);
      
      // RequestAnimationFrame guarantees the DOM has rendered structural nodes before calculations
      requestAnimationFrame(() => this.calculateRadius());
    });
  }

  ngAfterViewInit() {
    this.calculateRadius();
    
    const resizeHandler = () => this.calculateRadius();
    window.addEventListener('resize', resizeHandler);
    
    // Prevent memory leaks completely
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', resizeHandler);
      this.animationTimeline?.kill();
    });
  }

  private calculateRadius() {
    const btn = this.containerElement()?.nativeElement;
    if (!btn) return;
    
    this.radius = btn.offsetWidth * 0.52;
    this.setup3DLayout();
  }

  /**
   * Run EXACTLY ONCE on initialization or resize.
   * Positions every character in true 3D space permanently.
   */
  private setup3DLayout() {
    const letters = this.letterElements();
    if (!letters.length) return;

    // Batch read to completely prevent Layout Thrashing
    letters.forEach(r => (r.nativeElement.style.position = 'static'));
    const widths = letters.map(r => r.nativeElement.offsetWidth);
    letters.forEach(r => (r.nativeElement.style.position = 'absolute'));

    const arcAngles  = widths.map(w => w / this.radius);
    const totalAngle = arcAngles.reduce((a, b) => a + b, 0);
    let cursor = -totalAngle / 2;

    letters.forEach((letterRef, index) => {
      const el = letterRef.nativeElement;
      const arcWidth = arcAngles[index];
      const centreAngle = cursor + arcWidth / 2;
      cursor += arcWidth;

      // Convert the angle to degrees for CSS rotation
      const rotationY = centreAngle * (180 / Math.PI);

      // Map out the layout: rotate to face outward, then push back along the Z-axis
      el.style.transform = `rotateY(${rotationY}deg) translateZ(${this.radius}px)`;
    });
  }

  onMouseEnter() {
    this.animationTimeline?.kill();

    const wrapper:HTMLDivElement = this.textWrapper()!.nativeElement;
    const container = this.containerElement()!.nativeElement;

    this.animationTimeline = gsap.timeline();

    // Scale up the overall container block smoothly
    this.animationTimeline.to(container, {
      scale: 1.08,
      duration: 0.5,
      ease: 'power2.out'
    }, 0);

    // Spin the entire turntable on its Y-axis using native GPU composition
    this.animationTimeline.fromTo(wrapper, 
      { rotationY: 0 },
      { rotationY: 360, duration: 0.8, ease: 'power2.out' },
      0
    );
  }

  onMouseLeave() {
    this.animationTimeline?.kill();

    const wrapper = this.textWrapper()!.nativeElement;
    const container = this.containerElement()!.nativeElement;

    this.animationTimeline = gsap.timeline();

    this.animationTimeline.to(container, {
      scale: 1,
      duration: 0.5,
      ease: 'power2.out'
    }, 0);

    // Rewind back to starting position smoothly
    this.animationTimeline.to(wrapper, {
      rotationY: 0,
      duration: 0.6,
      ease: 'power2.out'
    }, 0);
  }
}