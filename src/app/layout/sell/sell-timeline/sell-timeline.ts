import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// GSAP plugins (ScrollTrigger, SplitText, ...) are registered once in app.config.ts

interface TimelineStep {
  header: string;
  description: string;
  image: string;
}

interface CardData {
  el: HTMLElement;
  titleLines: Element[];
  bodyLines: Element[];
  imageEl: HTMLImageElement | null;
}

interface CurveRefs {
  svg: SVGSVGElement | null;
  path: SVGPathElement | null;
  pathLength: number;
}

@Component({
  selector: 'app-sell-timeline',
  templateUrl: './sell-timeline.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellTimeline {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps: TimelineStep[] = [
    {
      header: 'Build Your Storefront',
      description:
        'Create a professional seller profile, showcase your brand, and present your products with rich details that inspire buyer confidence.',
      image: '/sell/sell-sticker-1.avif',
    },
    {
      header: 'Connect with Your Customers',
      description:
        'Reply to questions, participate in product discussions, and respond to customer feedback to build trust and strengthen your reputation.',
      image: '/sell/sell-sticker-2.avif',
    },
    {
      header: 'Manage Products with Ease',
      description:
        'Add new products, organize inventory, update pricing and details, and keep your catalog accurate with simple management tools.',
      image: '/sell/sell-sticker-3.avif',
    },
  ];
  protected readonly dots = this.steps.map((_, i) => i);

  private readonly timelineRef = viewChild.required<ElementRef<HTMLElement>>('timeline');
  private readonly progressLineRef = viewChild.required<ElementRef<SVGLineElement>>('progressLine');
  private readonly dotRefs = viewChildren<ElementRef<HTMLDivElement>>('dot');
  private readonly cardRefs = viewChildren<ElementRef<HTMLElement>>('card');
  private readonly imageRefs = viewChildren<ElementRef<HTMLImageElement>>('image');

  private scrollTrigger?: ScrollTrigger;
  private readonly cardSplits: SplitText[] = [];

  // Guards against double execution. initTimeline() is invoked explicitly by
  // the parent Sell component (to sequence it after the header reveal), so it
  // must never also self-trigger here. A second run would create a second
  // ScrollTrigger on the same trigger element and re-split already-split DOM
  // — two competing updaters writing conflicting progress values into the
  // same stroke-dashoffset, which is what produced the "line resets on
  // scroll-back" bug. This flag makes any accidental future double-call a
  // harmless no-op instead of a silent duplicate.
  private initialized = false;

  constructor() {
    // No self-triggering afterNextRender here — Sell.headerTimelineReveal()
    // calls initTimeline() explicitly, after its own header animation is set
    // up, so the two stay in a single deterministic sequence.
    this.destroyRef.onDestroy(() => this.teardown());
  }

  public initTimeline(): void {
    if (this.initialized) return;
    this.initialized = true;

    const timelineEl = this.timelineRef().nativeElement;
    const { line, length } = this.setupProgressLine();
    const { first, second } = this.setupCurvedLines(timelineEl);
    const dots = this.dotRefs();
    const dotPositions = dots.map((dot) => dot.nativeElement.offsetTop);
    const cardData = this.setupCards();

    dots.forEach((dot) => gsap.set(dot.nativeElement, { '--glow': 0 }));

    this.animateCurve(first, 1.2);
    this.animateCurve(second, 1);

    this.scrollTrigger = ScrollTrigger.create({
      trigger: timelineEl,
      start: 'top 80%',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const draw = self.progress * length;
        this.updateProgressLine(line, length, draw);
        this.updateDots(dots, dotPositions, draw);
        this.updateCards(cardData, dotPositions, draw);
      },
    });
  }

  // ---- setup ---------------------------------------------------------------

  private setupProgressLine(): { line: SVGLineElement; length: number } {
    const line = this.progressLineRef().nativeElement;
    const length = line.getTotalLength();
    gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
    return { line, length };
  }

  private setupCurvedLines(timelineEl: HTMLElement): { first: CurveRefs; second: CurveRefs } {
    const readCurve = (svgId: string, pathId: string): CurveRefs => {
      const svg = timelineEl.querySelector<SVGSVGElement>(svgId);
      const path = svg?.querySelector<SVGPathElement>(pathId) ?? null;
      const pathLength = path?.getTotalLength() ?? 0;
      if (path) gsap.set(path, { strokeDasharray: pathLength });
      return { svg, path, pathLength };
    };

    return {
      first: readCurve('#sell-timeline-curve-1', '#sell-timeline-curve-1-path'),
      second: readCurve('#sell-timeline-curve-2', '#sell-timeline-curve-2-path'),
    };
  }

  private animateCurve(curve: CurveRefs, scrub: number): void {
    if (!curve.svg || !curve.path) return;

    gsap.fromTo(
      curve.path,
      { strokeDashoffset: curve.pathLength },
      {
        strokeDashoffset: 0,
        duration: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: curve.svg,
          start: 'top 70%',
          end: 'bottom bottom',
          scrub,
        },
      },
    );
  }

  private setupCards(): CardData[] {
    const cards = this.cardRefs();
    const images = this.imageRefs();

    return cards.map((card, i) => {
      const el = card.nativeElement;
      const title = el.querySelector('.card-title')!;
      const body = el.querySelector('.card-body')!;

      const titleSplit = new SplitText(title, { type: 'lines', linesClass: 'line' });
      const bodySplit = new SplitText(body, { type: 'lines', linesClass: 'line' });
      this.cardSplits.push(titleSplit, bodySplit);

      gsap.set([...titleSplit.lines, ...bodySplit.lines], {
        display: 'block',
        overflow: 'hidden',
        yPercent: 100,
        opacity: 0,
      });

      const imageEl = images[i]?.nativeElement ?? null;
      if (imageEl) gsap.set(imageEl, { opacity: 0, y: 40, scale: 0.96 });

      return { el, titleLines: titleSplit.lines, bodyLines: bodySplit.lines, imageEl };
    });
  }

  // ---- per-frame updates -----------------------------------------------------

  private updateProgressLine(line: SVGLineElement, length: number, draw: number): void {
    gsap.set(line, { strokeDashoffset: length - draw });
  }

  private updateDots(
    dots: readonly ElementRef<HTMLDivElement>[],
    dotPositions: number[],
    draw: number,
  ): void {
    dots.forEach((dot, i) => {
      const active = dotPositions[i] < draw;
      gsap.to(dot.nativeElement, {
        '--glow': active ? 1 : 0,
        duration: 1.5,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }

  private updateCards(cardData: CardData[], dotPositions: number[], draw: number): void {
    cardData.forEach((card, i) => {
      const active = dotPositions[i] < draw;
      active ? this.activateCard(card) : this.deactivateCard(card);
    });
  }

  private activateCard(card: CardData): void {
    gsap.to(card.el, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' });
    gsap.to(card.titleLines, {
      yPercent: 0,
      opacity: 1,
      stagger: 0.08,
      duration: 0.8,
      ease: 'power3.out',
    });
    gsap.to(card.bodyLines, {
      yPercent: 0,
      opacity: 1,
      stagger: 0.06,
      delay: 0.25,
      duration: 0.5,
      ease: 'power3.out',
    });
    if (card.imageEl) {
      gsap.to(card.imageEl, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' });
    }
    card.el.classList.add('is-active');
  }

  private deactivateCard(card: CardData): void {
    gsap.to([...card.titleLines, ...card.bodyLines], { yPercent: 100, opacity: 0, duration: 0.5 });
    gsap.to(card.el, { opacity: 0, duration: 0.5 });
    if (card.imageEl) {
      gsap.to(card.imageEl, { opacity: 0, duration: 0.5 });
    }
    card.el.classList.remove('is-active');
  }

  // ---- teardown --------------------------------------------------------------

  private teardown(): void {
    this.scrollTrigger?.kill();
    this.cardSplits.forEach((split) => split.revert());
  }
}