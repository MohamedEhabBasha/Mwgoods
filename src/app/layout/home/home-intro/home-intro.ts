import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PixiWeb } from '../../../shared/components/pixi-web/pixi-web';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home-intro',
  imports: [NgClass, /* PixiWeb */],
  templateUrl: './home-intro.html',
  styleUrl: './home-intro.css',
})
export class HomeIntro implements AfterViewInit {
  private mainIntroStructure = viewChild.required<ElementRef<HTMLElement>>('mainIntroStructure');
  private rightColumn = viewChild.required<ElementRef<HTMLElement>>('rightColumn');
  private centerColumn = viewChild.required<ElementRef<HTMLElement>>('centerColumn');
  private leftColumn = viewChild.required<ElementRef<HTMLElement>>('leftColumn');
  //private pixiGrid = viewChild.required<PixiWeb>(PixiWeb);
  private targetLeftImg = viewChild.required<ElementRef<HTMLImageElement>>('targetLeftImg');
  private targetRightImg = viewChild.required<ElementRef<HTMLImageElement>>('targetRightImg');
  private targetCenterText = viewChild.required<ElementRef<HTMLParagraphElement>>('targetCenterText');

  ngAfterViewInit(): void {
    // Implementation for after view initialization
  }

  /**
   * Main orchestrator method called by the parent Master Timeline
   */
  public createIntroAnimationTimeline(): gsap.core.Timeline {
    return window.innerWidth <= 768 ? this.createMobileTimeline() : this.createDesktopTimeline();
  }
  /**
   * Desktop Timeline: Center slides up first, followed by Left and Right architectural drops
   */
  private createDesktopTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });

    const mainBg = this.mainIntroStructure().nativeElement;
    const center = this.centerColumn().nativeElement;
    const left = this.leftColumn().nativeElement;
    const right = this.rightColumn().nativeElement;
    //const pixiGrid = this.pixiGrid().gridCanvas().nativeElement;

    // 1. Initial State Setup to avoid flashes
    gsap.set([mainBg], { yPercent: 100 });
    //gsap.set(pixiGrid, { opacity: 0 });
    gsap.set([left, right], { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(center, { yPercent: 100 });

    // 2. Animate the Middle Column coming from bottom to top
    tl.to(mainBg, { yPercent: 0, ease: 'none' })
      .to(center, {
        yPercent: 0,
        duration: 1.2,
      })

      // 3. Reveal Left Column (using premium structural clip-path reveal)
      .to(
        [left, right],
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          stagger: 0.1
        },
        '-=1',
      ) // small delay overlap
      .fromTo(
        this.targetLeftImg().nativeElement,
        {
          rotateZ: 30,
          opacity: 0,
          duration: 1.2,
        },
        {
          rotateZ: 0,
          opacity: 1,
          ease: 'elastic.out(1, 0.75)',
          duration: 1.2,
        },
      )
      .to(mainBg, {background: '#fff'}, '<')
      //.to(pixiGrid, { opacity: 1, ease: 'none' }, '-=0.9')
      // 4. Reveal Right Column
      .fromTo(
        this.targetRightImg().nativeElement,
        {
          xPercent: -20,
          opacity: 0,
        },
        {
          xPercent: 0,
          opacity: 1,
          ease: 'power2.out',
          duration: 1.2
        }
      )
      
      //.to([left, center, right], { backgroundColor: 'transparent', ease: 'power2.out' }); // Sync the grid rise with the main background

    return tl;
  }
  /**
   * Mobile Timeline: Retains your slide-up structure smoothly
   */
  private createMobileTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(
      this.mainIntroStructure().nativeElement,
      {
        yPercent: 100,
      },
      {
        yPercent: 0,
        duration: 1.5,
      },
    );

    return tl;
  }
}
