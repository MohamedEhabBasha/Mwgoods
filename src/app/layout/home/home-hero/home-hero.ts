import { AfterViewInit, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { PixiWeb } from '../../../shared/components/pixi-web/pixi-web';
import { OrbitalButton } from "../../../shared/components/orbital-button/orbital-button";

gsap.registerPlugin(SplitText);

@Component({
  selector: 'app-home-hero',
  imports: [NgClass, PixiWeb, OrbitalButton],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.css',
})
export class HomeHero implements AfterViewInit {
  private targetHeading = viewChild.required<ElementRef<HTMLElement>>('targetHeading');
  private targetSubtitle = viewChild.required<ElementRef<HTMLElement>>('targetSubtitle');
  private targetParagraph = viewChild.required<ElementRef<HTMLElement>>('targetParagraph');
  private targetBtn = viewChild.required<ElementRef<HTMLElement>>('targetBtn');

  ngAfterViewInit(): void {
    this.createHeroAnimationTimeline();
  }

  public createHeroAnimationTimeline(): gsap.core.Timeline {
    // 1. Instantiate the SplitText engines on our raw copy
    const headingSplit = new SplitText(this.targetHeading().nativeElement, {
      type: 'words',
      wordsClass: 'inline-block translate-y-[110%]', // Generates the clean clip mask automatically
    });

    const subtitleSplit = new SplitText(this.targetSubtitle().nativeElement, {
      type: 'lines',
      linesClass: 'inline-block translate-y-[110%]',
    });

    const paragraphSplit = new SplitText(this.targetParagraph().nativeElement, {
      type: 'lines',
      linesClass: 'inline-block',
    });

    // Quick structural CSS fix: force parent wrapper blocks to hide the overflow text cleanly
    const wrappers = [this.targetHeading(), this.targetSubtitle(), this.targetParagraph()];
    wrappers.forEach((wrap) => {
      wrap.nativeElement.style.overflow = 'hidden';
    });

    // 2. Build the cohesive master timeline
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out', duration: 1.4 },
    });

    // Step 1: Split main headlines glide up out of thin air
    tl.to(headingSplit.words, {
      y: '0%',
      //stagger: 0.1,
    })

      // Step 2: Subtitle cascades up right underneath
      .to(
        subtitleSplit.lines,
        {
          y: '0%',
          stagger: 0.05,
        },
        '<',
      )

      // Step 3: Meta-paragraph breaks down into lines and glides up
      .fromTo(
        paragraphSplit.lines,
        {
          yPercent: -400,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          stagger: 0.05,
          duration: 1.0,
        },
        '-=0.9',
      )

      // Step 4: The anchor button snaps cleanly into layout framing
      .fromTo(
        this.targetBtn().nativeElement,
        { yPercent: -100, opacity: 0 },
        { yPercent: 0, duration: 1.0, opacity: 1 },
        '<',
      );

    return tl;
  }
}
