import { Component, ElementRef, inject, viewChild } from '@angular/core';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThreejsSceneService } from '../../../../core/services/threejs-scene';
gsap.registerPlugin(SplitText, ScrollTrigger);

@Component({
  selector: 'app-hp-header',
  imports: [],
  templateUrl: './hp-header.html',
  styleUrl: './hp-header.css',
})
export class HPHeader {
  private canvasService = inject(ThreejsSceneService);
  private storylineSvg = viewChild.required<ElementRef<HTMLElement>>('storylineSvg');
  private storylinePath = viewChild.required<ElementRef<SVGPathElement>>('storylinePath');

  public initScrollAnimation() {
    const splitHow = new SplitText('#animate-how', { type: 'chars' });
    const splitStart = new SplitText('#animate-start', { type: 'chars' });
    const splitTo = new SplitText('#animate-to', { type: 'chars' });

    if (splitTo.chars.length < 2) return;
    const letterT = splitTo.chars[0];
    const letterO = splitTo.chars[1];

    const svgContainer = this.storylineSvg().nativeElement;
    const rawPath = this.storylinePath().nativeElement;
    const totalPathLength = rawPath.getTotalLength();

    // 1. Setup global initial states
    gsap.set(rawPath, {
      strokeDasharray: totalPathLength,
      strokeDashoffset: -totalPathLength,
    });
    gsap.set(svgContainer, { opacity: 0 });
    gsap.set([letterO, letterT], { opacity: 0, scale: 0.5 });

    const cachedModel = this.canvasService.getModel();
    if (!cachedModel) {
      // Fallback if model isn't ready yet
      this.canvasService.modelLoaded$.subscribe((vase) =>
        this.createBoundTriggers(
          vase,
          splitHow,
          splitStart,
          letterT,
          letterO,
          svgContainer,
          rawPath,
        ),
      );
    } else {
      this.createBoundTriggers(
        cachedModel,
        splitHow,
        splitStart,
        letterT,
        letterO,
        svgContainer,
        rawPath,
      );
    }
  }

  private createBoundTriggers(
    vase: THREE.Group,
    splitHow: any,
    splitStart: any,
    letterT: any,
    letterO: any,
    svgContainer: any,
    rawPath: any,
  ) {
    // 2. CREATE THE MASTER SCROLLTRIGGER WITHOUT AN ATTACHED TIMELINE
    ScrollTrigger.create({
      trigger: '#trigger-section',
      start: 'top 35%',
      invalidateOnRefresh: true,

      // 🏎️ WHEN SCROLLING DOWN: Run everything smoothly and sequentially
      onEnter: () => {
        const enterTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        if (window.innerWidth >= 1024 && window.innerWidth <= 1296) {
          enterTl
            .to(vase.position, { x: 0, y: 4, z: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
            .to(vase.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: 'power2.inOut' }, '<');
        } else if (window.innerWidth > 1296) {
          enterTl
            .to(vase.position, { x: 0, y: 4.5, z: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
            .to(vase.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: 'power2.inOut' }, '<');
        }

        const firstDuration: number = 0.6;
        const secondDuration: number = 0.8;

        enterTl
          .to(splitHow.chars, { yPercent: 100, stagger: 0.05, duration: firstDuration }, 0)
          .to(letterT, { yPercent: 100, duration: firstDuration, opacity: 1, scale: 1 }, '<')
          .to(splitStart.chars, { yPercent: -100, stagger: 0.05, duration: firstDuration }, '<')
          .to(letterO, { yPercent: -100, duration: firstDuration, opacity: 1, scale: 1 }, '<')
          .to(['#howCover', '#startCover'], { opacity: 0, duration: 0 })
          .to(splitHow.chars, {
            yPercent: 0,
            duration: secondDuration,
            ease: 'power4.inOut',
            stagger: 0.02,
          })
          .to(letterT, { yPercent: 0, duration: secondDuration, ease: 'power4.inOut' }, '<')
          .to(
            splitStart.chars,
            { yPercent: 0, duration: secondDuration, ease: 'power4.inOut', stagger: 0.02 },
            '<',
          )
          .to(letterO, { yPercent: 0, duration: secondDuration, ease: 'power4.inOut' }, '<')
          .to(svgContainer, { opacity: 1, duration: 0.3 }, '<')
          .to(rawPath, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, '<');
      },

      // ⚡ WHEN SCROLLING BACK UP: Collapse everything simultaneously and FAST
      onLeaveBack: () => {
        // Clear out running forward animations to avoid conflicts
        gsap.killTweensOf([
          vase.position,
          splitHow.chars,
          splitStart.chars,
          letterT,
          letterO,
          svgContainer,
          rawPath,
        ]);

        gsap.set([letterO, letterT], { opacity: 0, scale: 0.5 });

        const exitTl = gsap.timeline({ defaults: { ease: 'power1.inOut' } });

        // Return the 3D object to its home position in a swift 0.4 seconds
        if (window.innerWidth >= 1024) {
          exitTl.to(vase.position, { x: 0, y: -1, z: 0, duration: 0.4 }, 0);
        }

        // Reset text variables and hide the SVG container all at once
        exitTl
          .to(
            [splitHow.chars, splitStart.chars, letterT, letterO],
            { yPercent: 0, duration: 0.3 },
            0,
          )
          .to(svgContainer, { opacity: 0, duration: 0.2 }, 0)
          .to(rawPath, { strokeDashoffset: -rawPath.getTotalLength(), duration: 0.3 }, 0)
          .to(['#howCover', '#startCover'], { opacity: 1, duration: 0.1 }, '<');
      },
    });
  }
}
