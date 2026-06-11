import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PixiWeb } from '../../../shared/components/pixi-web/pixi-web';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home-intro',
  imports: [NgClass /* PixiWeb */],
  templateUrl: './home-intro.html',
  styleUrl: './home-intro.css',
})
export class HomeIntro implements AfterViewInit {
  private mainIntroStructure = viewChild.required<ElementRef<HTMLElement>>('mainIntroStructure');
  private rightColumn = viewChild.required<ElementRef<HTMLElement>>('rightColumn');
  private centerColumn = viewChild.required<ElementRef<HTMLElement>>('centerColumn');
  private leftColumn = viewChild.required<ElementRef<HTMLElement>>('leftColumn');
  //private pixiGrid = viewChild.required<PixiWeb>(PixiWeb);
  //private targetLeftImg = viewChild.required<ElementRef<HTMLImageElement>>('targetLeftImg');
  //private targetRightImg = viewChild.required<ElementRef<HTMLImageElement>>('targetRightImg');
  private targetCenterText =
    viewChild.required<ElementRef<HTMLParagraphElement>>('targetCenterText');

  private storylineSvg = viewChild.required<ElementRef<HTMLElement>>('storylineSvg');
  private storylinePath = viewChild.required<ElementRef<SVGPathElement>>('storylinePath');

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

    const svgContainer = this.storylineSvg().nativeElement;
    const rawPath = this.storylinePath().nativeElement;

    // 2. Compute the exact vector perimeter length on load
    const totalPathLength = rawPath.getTotalLength();

    // 1. Initial State Setup to avoid flashes
    gsap.set([mainBg], { yPercent: 100 });
    //gsap.set(pixiGrid, { opacity: 0 });
    gsap.set([left, right], { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(center, { yPercent: 100 });

    gsap.set(rawPath, {
      strokeDasharray: totalPathLength,
      strokeDashoffset: totalPathLength,
    });
    gsap.set(svgContainer, { opacity: 0 });

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
          stagger: 0.1,
        },
        '-=1',
      ) // small delay overlap
      // 5. ✨ BUTTERY LINE DRAW REVEAL
      // This targets your new high-width stroke and unrolls it from 0% to 100% visibility
      .to(
        svgContainer,
        {
          opacity: 1,
          duration: 0.3,
        },
        '-=0.7', // Start drawing precisely while columns expand open
      )
      .to(
        rawPath,
        {
          strokeDashoffset: 0, // Uncoils the path line cleanly from head to tail!
          duration: 1.8,
          ease: 'power2.inOut',
        },
        '<', // Matches execution timing frame with container opacity
      )
      .to(mainBg, { background: '#fff' });
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
