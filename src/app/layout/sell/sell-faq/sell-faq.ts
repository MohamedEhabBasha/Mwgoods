import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface FaqItem {
  readonly question: string;
  readonly answer: string;
}
@Component({
  selector: 'app-sell-faq',
  imports: [NgOptimizedImage],
  templateUrl: './sell-faq.html',
  styleUrl: './sell-faq.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellFAQ {
  private readonly destroyRef = inject(DestroyRef);

  private readonly heroRef = viewChild.required<ElementRef<HTMLElement>>('hero');
  private readonly frequentlyRef = viewChild.required<ElementRef<HTMLElement>>('frequentlyWord');
  private readonly askedRef = viewChild.required<ElementRef<HTMLElement>>('askedWord');
  private readonly questionsRef = viewChild.required<ElementRef<HTMLElement>>('questionsWord');

  // Only one panel open at a time. First question open by default.
  protected readonly openIndex = signal<number | null>(0);

  protected readonly faqs: readonly FaqItem[] = [
    {
      question: 'How do I list a product for sale on MWgoods?',
      answer:
        'Open the Sell page, add photos, a title, a description and your price, then publish. Your listing goes live instantly across the marketplace and the community feed.',
    },
    {
      question: 'What fees does MWgoods take when I sell an item?',
      answer:
        'MWgoods only takes a small commission once your item actually sells, there are no upfront or listing fees. The exact rate is always shown before you confirm.',
    },
    {
      question: 'Can buyers message me before they decide to buy?',
      answer:
        'Yes. Every listing connects straight to your community chat, so buyers can ask questions, negotiate, or request more photos before committing.',
    },
    {
      question: 'How does community feedback affect my listings?',
      answer:
        'Reviews and comments left by other members show on your product and your seller profile, helping new buyers trust your listings and decide faster.',
    },
    {
      question: 'Can I edit or take down a listing after publishing?',
      answer:
        'Yes, anytime. Open the item from your seller dashboard to update photos, pricing, or availability, or remove it from sale completely.',
    },
  ];

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }

  public initHeroReveal(): void {
    // The split "Frequently / Asked / Questions" composition is desktop-only
    // breakpoint rather than animating hidden elements.
    if (window.innerWidth < 1024) {
      return;
    }

    const frequently = this.frequentlyRef().nativeElement;
    const asked = this.askedRef().nativeElement;
    const questions = this.questionsRef().nativeElement;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      gsap.set([frequently, asked, questions], { opacity: 1, x: 0, y: 0 });
      return;
    }

    gsap.set(frequently, { opacity: 0, x: -40 });
    gsap.set(asked, { opacity: 0, x: 40 });
    gsap.set(questions, { opacity: 0, y: 30 });

    const timeline = gsap
      .timeline({
        scrollTrigger: {
          trigger: this.heroRef().nativeElement,
          start: 'top 85%',
          once: true,
        },
      })
      .to(frequently, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' })
      .to(asked, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, '<')
      .to(questions, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');

    // Safety net: if the component is destroyed before the ScrollTrigger
    // fires, kill both the trigger and the timeline explicitly.
    this.destroyRef.onDestroy(() => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    });
  }
}
