import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { PixiWeb } from '../../shared/components/pixi-web/pixi-web';
import { SellTimeline } from './sell-timeline/sell-timeline';
import { ThreejsSceneService } from '../../core/services/threejs-scene';
import { SellFAQ } from "./sell-faq/sell-faq";
import { ScrollTriggerReadyService } from '../../core/services/scroll-trigger-ready';

@Component({
  selector: 'app-sell',
  imports: [PixiWeb, SellTimeline, SellFAQ],
  templateUrl: './sell.html',
  styleUrl: './sell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sell {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasService = inject(ThreejsSceneService);
  private readonly readyService = inject(ScrollTriggerReadyService);

  private readonly sellingParagraphRef =
    viewChild.required<ElementRef<HTMLElement>>('sellingParagraph');
  private readonly sellingParagraphCopyRef =
    viewChild.required<ElementRef<HTMLElement>>('sellingParagraphCopy');
  private readonly pinnedSection = viewChild.required<ElementRef<HTMLElement>>('pinnedSection');
  private readonly timelineHeader = viewChild.required<ElementRef<HTMLElement>>('timelineHeader');
  private readonly sellTimeline = viewChild.required<SellTimeline>(SellTimeline);
  private readonly sellFAQ = viewChild.required<SellFAQ>(SellFAQ);

  private readonly sellingWordRef = viewChild.required<ElementRef<HTMLElement>>('sellingWord');
  private readonly toolsWordRef = viewChild.required<ElementRef<HTMLElement>>('toolsWord');

  private headerTimelineTrigger?: ScrollTrigger;
  private sellingSplit?: SplitText;
  private toolsSplit?: SplitText;

  constructor() {
    afterNextRender(() => {
      this.headerTimelineReveal();
      this.sellTimeline().initTimeline();
      this.sellFAQ().initHeroReveal();
      this.readyService.signal();
    });

    this.destroyRef.onDestroy(() => {
      this.headerTimelineTrigger?.kill();
      this.sellingSplit?.revert();
      this.toolsSplit?.revert();
      this.canvasService.setRenderingEnabled(true);
    });
  }

  private headerTimelineReveal(): void {
    const pinnedSection = this.pinnedSection().nativeElement;
    const headerTimeline = this.timelineHeader().nativeElement;
    const sellingWordEl = this.sellingWordRef().nativeElement;
    const toolsWordEl = this.toolsWordRef().nativeElement;

    const paragraphEl = this.sellingParagraphRef().nativeElement;
    const paragraphCopyEl = this.sellingParagraphCopyRef().nativeElement;
    const paragraphText = paragraphCopyEl.textContent?.trim() ?? '';

    // one word, one element, one SplitText call each — no cross-word
    // line-detection to collide with the flex layout.
    this.sellingSplit = new SplitText(sellingWordEl, { type: 'chars', charsClass: 'char' });
    this.toolsSplit = new SplitText(toolsWordEl, { type: 'chars', charsClass: 'char' });

    // each span IS a single line now, so overflow/perspective go directly on
    // it — no intermediate .line wrapper needed like the old lines+chars split.
    gsap.set([sellingWordEl, toolsWordEl], {
      display: 'inline-block',
      overflow: 'hidden',
      perspective: 600,
    });

    const chars = [...this.sellingSplit.chars, ...this.toolsSplit.chars];
    gsap.set(chars, {
      display: 'inline-block',
      yPercent: 120,
      rotateX: -100,
      opacity: 0,
      filter: 'blur(6px)',
      transformOrigin: '50% 100%',
      willChange: 'transform, filter, opacity',
    });

    gsap.set(headerTimeline, { yPercent: 100 });
    gsap.set(paragraphEl, {
      opacity: 0,
      y: 16,
      filter: 'blur(4px)',
      willChange: 'transform, filter, opacity',
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinnedSection,
        start: 'top top',
        end: '+=250%',
        scrub: true,
        pin: true,
        pinSpacing: true,
        onLeave: () => this.canvasService.setRenderingEnabled(false),
        onEnterBack: () => this.canvasService.setRenderingEnabled(true),
      },
    });

    tl.to(headerTimeline, {
      yPercent: 0,
      duration: 0.8,
      ease: 'power3.out',
    })
      .to(
        chars,
        {
          yPercent: 0,
          rotateX: 0,
          opacity: 1,
          filter: 'blur(0px)',
          stagger: 0.025,
          duration: 0.9,
          ease: 'power4.out',
        },
        '-=0.35',
      )
      .to(
        paragraphEl,
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: 'power2.out',
          clearProps: 'willChange',
        },
        '-=0.3',
      )
      .to(
        paragraphCopyEl,
        {
          duration: 1.2,
          scrambleText: {
            text: paragraphText,
            chars: '!<>-_\\/[]{}—=+*^?#',
            revealDelay: 0.2,
            speed: 0.4,
            tweenLength: false, // keeps the paragraph's box width stable during decode
          },
          ease: 'none',
        },
        '<',
      )
      .to({}, { duration: 1 });

    this.headerTimelineTrigger = tl.scrollTrigger;
  }
}
