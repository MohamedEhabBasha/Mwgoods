import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-home-cta',
  standalone: true,
  imports: [],
  templateUrl: './home-cta.html',
  styleUrl: './home-cta.css',
})
export class HomeCta implements AfterViewInit, OnDestroy {
  @ViewChild('carousel', { static: true }) carousel!: ElementRef<HTMLDivElement>;
  @ViewChild('ctaButton') ctaButton!: ElementRef<HTMLDivElement>;
  @ViewChildren('card') cardElements!: QueryList<ElementRef<HTMLDivElement>>;

  radius = 90; 
  progress = { value: 0 };
  private scrollTimeline!: gsap.core.Timeline;
  private hasButtonAppeared = false; // Flag to lock the button once revealed

  ngAfterViewInit(): void {
    // Left empty if you are orchestrating it via the Parent Component!
  }

  public scrollAnimation() {
    const totalWords = this.cardElements.length;

    this.scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: this.carousel.nativeElement,
        start: 'top top',
        end: '+=200%', 
        pin: true,
        scrub: 1, 
        invalidateOnRefresh: true,
      },
    });

    this.scrollTimeline.to(this.progress, {
      value: 1,
      ease: 'none',
      onUpdate: () => {
        this.animate();
        
        // When progress nears completion (the final word "STARTED?" is fully visible)
        if (this.progress.value >= 0.95 && !this.hasButtonAppeared) {
          this.revealButtonPermanently();
        }
      },
    });

    this.animate();
  }

  private revealButtonPermanently() {
    this.hasButtonAppeared = true;
    const btn = this.ctaButton.nativeElement;

    // Separate standalone animation running once on its own timeline context
    gsap.to(btn, {
      opacity: 1,
      scale: 1,
      pointerEvents: 'auto', // Enable clicks safely
      duration: 0.6,
      ease: 'back.out(1.7)'
    });
  }

  private animate() {
    const cards = this.cardElements.toArray();
    cards.forEach((cardRef, index) => {
      const el = cardRef.nativeElement;
      
      const theta = (index / (cards.length - 1)) - this.progress.value;
      const angle = theta * Math.PI * 1.5; 

      const y = Math.sin(angle) * this.radius;
      const z = Math.cos(angle) * this.radius;
      const rotationX = -angle * (180 / Math.PI); 

      el.style.transform = `translate3d(0px, ${y}px, ${z}px) rotateX(${rotationX}deg)`;

      const zIndex = Math.round(z + this.radius);
      el.style.zIndex = zIndex.toString();

      const depthOpacity = gsap.utils.mapRange(
        -this.radius * 0.5,
        this.radius,
        0, 
        1, 
        z
      );
      el.style.opacity = gsap.utils.clamp(0, 1, depthOpacity).toString();
    });
  }

  ngOnDestroy(): void {
    if (this.scrollTimeline) {
      this.scrollTimeline.kill();
    }
    const triggers = ScrollTrigger.getAll();
    triggers.forEach(t => t.kill());
  }
}