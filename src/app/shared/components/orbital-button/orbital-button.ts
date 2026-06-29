import {
  Component,
  ElementRef,
  viewChildren,
  input,
  effect,
  signal,
  AfterViewInit,
} from '@angular/core';
import gsap from 'gsap';

@Component({
  selector: 'app-orbital-button',
  imports: [],
  templateUrl: './orbital-button.html',
  styleUrl: './orbital-button.css',
})
export class OrbitalButton implements AfterViewInit {
  text      = input<string>('EXPLORE');
  ariaLabel = input<string>('');
  color = input<string>('#333');

  letterElements   = viewChildren<ElementRef<HTMLSpanElement>>('letter');
  containerElement = viewChildren<ElementRef<HTMLButtonElement>>('btnContainer');

  protected chars = signal<string[]>([]);

  private rotationProgress = { value: 0 };
  private radius           = 0;
  private letterAngles: number[] = [];   // centre angle for each letter
  private animationTimeline?: gsap.core.Timeline;

  constructor() {
    effect(() => {
      this.chars.set(this.text().split(''));
      setTimeout(() => this.calculateRadius(), 0);
    });
  }

  ngAfterViewInit() {
    this.calculateRadius();
    window.addEventListener('resize', () => this.calculateRadius());
  }

  private calculateRadius() {
    const btn = this.containerElement()?.[0]?.nativeElement;
    if (!btn) return;
    this.radius = btn.offsetWidth * 0.52;
    this.computeLetterAngles();
    this.update3DPositions();
  }

  /**
   * Compute the centre angle for every letter based on its real rendered width.
   *
   * Each letter subtends an arc of  width / radius  radians on the orbit circle.
   * We accumulate those arcs and centre the whole string around angle 0, so the
   * text is always visually centred on the front face of the sphere — regardless
   * of how many characters or what font metrics they have.
   */
  private computeLetterAngles() {
    const letters = this.letterElements();
    if (!letters.length) return;

    // Temporarily make letters static so the browser reports real offsetWidth
    letters.forEach(r => (r.nativeElement.style.position = 'static'));
    const widths = letters.map(r => r.nativeElement.offsetWidth);
    letters.forEach(r => (r.nativeElement.style.position = 'absolute'));

    const arcAngles  = widths.map(w => w / this.radius);
    const totalAngle = arcAngles.reduce((a, b) => a + b, 0);
    let   cursor     = -totalAngle / 2;

    this.letterAngles = arcAngles.map(a => {
      const centre = cursor + a / 2;
      cursor += a;
      return centre;
    });
  }

  private update3DPositions() {
    const letters = this.letterElements();
    if (!letters.length || !this.letterAngles.length) return;

    letters.forEach((letterRef, index) => {
      const el        = letterRef.nativeElement;
      const baseAngle = this.letterAngles[index];
      const angle     = baseAngle + this.rotationProgress.value * Math.PI * 2;

      const x         = Math.sin(angle) * this.radius;
      const z         = Math.cos(angle) * this.radius;
      const rotationY = angle * (180 / Math.PI);

      el.style.transform = `translate3d(${x}px, 0px, ${z}px) rotateY(${rotationY}deg)`;
      el.style.zIndex    = String(Math.round(z + this.radius));

      const depthOpacity = gsap.utils.mapRange(
        -this.radius * 0.1, this.radius, 0.85, 1, z,
      );
      el.style.opacity = gsap.utils.clamp(0.85, 1, depthOpacity).toString();
    });
  }

  onMouseEnter() {
    if (this.animationTimeline) this.animationTimeline.kill();

    this.animationTimeline = gsap.timeline({
      onUpdate: () => this.update3DPositions(),
    });

    this.animationTimeline.to(
      this.containerElement()?.[0]?.nativeElement,
      { scale: 1.08, duration: 0.5, ease: 'power2.out' },
      0,
    );

    this.animationTimeline.to(
      this.rotationProgress,
      { value: 1, duration: 0.6, ease: 'power2.Out' },
      0,
    );
  }

  onMouseLeave() {
    if (this.animationTimeline) this.animationTimeline.kill();

    this.animationTimeline = gsap.timeline({
      onUpdate: () => this.update3DPositions(),
      onComplete: () => { this.rotationProgress.value = 0; },
    });

    this.animationTimeline.to(
      this.containerElement()?.[0]?.nativeElement,
      { scale: 1, duration: 0.5, ease: 'power2.out' },
      0,
    );

    this.animationTimeline.to(
      this.rotationProgress,
      { value: 0, duration: 0.6, ease: 'power2.out' },
      0,
    );
  }
}