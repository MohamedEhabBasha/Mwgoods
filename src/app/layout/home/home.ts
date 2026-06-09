import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HomeIntro } from './home-intro/home-intro';
import { HomeHero } from './home-hero/home-hero';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  imports: [HomeIntro, HomeHero],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements AfterViewInit {
  private scrollContainer = viewChild.required<ElementRef>('scrollContainer');

  /* MAIN SECTIONS */
  // Hero Section
  private heroSection = viewChild.required<HomeHero>(HomeHero);
  // Intro Section
  private introSection = viewChild.required<HomeIntro>(HomeIntro);

  ngAfterViewInit(): void {
    const scrollContainer = this.scrollContainer().nativeElement;

    // 1. Create the Master Timeline
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: '+=150%',
        scrub: 1.5,
        /* snap: 0.5, */
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
      },
    });

    // 2. Add the hero section animation to the master timeline
    //masterTl.add(this.heroSection().createHeroAnimationTimeline());

    // 3. Add the intro section animation to the master timeline
    masterTl.add(this.introSection().createIntroAnimationTimeline());
  }
}
