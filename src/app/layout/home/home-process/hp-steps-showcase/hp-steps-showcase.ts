import { Component, ElementRef, viewChild, viewChildren } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText, ScrollTrigger);

@Component({
  selector: 'app-hp-steps-showcase',
  imports: [],
  templateUrl: './hp-steps-showcase.html',
  styleUrl: './hp-steps-showcase.css',
})
export class HPStepsShowcase {
  // Separate Left and Right elements cleanly
  private steps_section = viewChild<ElementRef<HTMLElement>>('stepsSection');
  private step_sectionsLeft = viewChildren<ElementRef<HTMLElement>>('stepSectionLeft');
  private step_sectionsRight = viewChildren<ElementRef<HTMLElement>>('stepSectionRight');
  private step_sectionsTopRight = viewChildren<ElementRef<HTMLElement>>('stepSectionTopRight');
  private step_sectionsBottomLeft = viewChildren<ElementRef<HTMLElement>>('stepSectionBottomLeft');

  steps_list = [
    { text: 'DISCOVER', class: 'first' },
    { text: 'COMMUNITY', class: 'second' },
    { text: 'SELLING', class: 'third' },
  ];

  public animateStepsSection(): gsap.core.Timeline {
    const stepsSection = this.steps_section()?.nativeElement;
    const leftSections = this.step_sectionsLeft().map((s) => s.nativeElement);
    const rightSections = this.step_sectionsRight().map((s) => s.nativeElement);
    const topRightSections = this.step_sectionsTopRight().map((s) => s.nativeElement);
    const bottomLeftSections = this.step_sectionsBottomLeft().map((s) => s.nativeElement);

    const allSections = [
      ...leftSections,
      ...rightSections,
      ...topRightSections,
      ...bottomLeftSections,
    ];

    const labelElements = gsap.utils.toArray<HTMLElement>('.step-label');
    const counterElements = gsap.utils.toArray<HTMLElement>('.counter-label');
    const descElements = gsap.utils.toArray<HTMLElement>('.desc-label');

    const depth = -12;
    const originOffset = `50% 50% ${depth}`;

    const descDepth = -20;
    const descOriginOffset = `50% 50% ${descDepth}px`;

    // Apply 3D perspective to the parent container blocks
    gsap.set([labelElements, counterElements, descElements], {
      perspective: 700,
      transformStyle: 'preserve-3d',
    });

    // Initial Layout States for image panels
    gsap.set(allSections, { autoAlpha: 0 });
    gsap.set([leftSections[0], rightSections[0], topRightSections[0], bottomLeftSections[0]], {
      autoAlpha: 1,
    });

    // Set initial masking offsets for every loop list individually
    leftSections.forEach((_, idx) => {
      const lOuter = leftSections[idx].querySelector('.step-outer');
      const lInner = leftSections[idx].querySelector('.step-inner');
      const rOuter = rightSections[idx].querySelector('.step-outer');
      const rInner = rightSections[idx].querySelector('.step-inner');
      const trOuter = topRightSections[idx].querySelector('.step-outer');
      const trInner = topRightSections[idx].querySelector('.step-inner');
      const blOuter = bottomLeftSections[idx].querySelector('.step-outer');
      const blInner = bottomLeftSections[idx].querySelector('.step-inner');

      if (idx === 0) {
        // First frame is completely unmasked across the board
        gsap.set([lOuter, lInner, rOuter, rInner, trOuter, trInner, blOuter, blInner], {
          xPercent: 0,
        });
      } else {
        // Standard Flow (Left & Right loops): Slide right-to-left
        gsap.set([lOuter, rOuter], { xPercent: 100 });
        gsap.set([lInner, rInner], { xPercent: -100 });

        // Opposite Flow (Top Right & Bottom Left loops): Slide left-to-right
        gsap.set([trOuter, blOuter], { xPercent: -100 });
        gsap.set([trInner, blInner], { xPercent: 100 });
      }
    });

    // 2. Split characters once globally (DO NOT REVERT LATER)
    const labelChars = Array.from(labelElements).map(
      (label) => new SplitText(label, { type: 'chars', charsClass: 'char' }),
    );
    const counterChars = Array.from(counterElements).map(
      (el) => new SplitText(el, { type: 'chars', charsClass: 'char' }),
    );
    const descLines = Array.from(descElements).map(
      (el) => new SplitText(el, { type: 'lines', linesClass: 'desc-line' }),
    );

    // Set initial 3D positions for the split characters
    labelChars.forEach((label, idx) => {
      gsap.set(label.chars, {
        rotationX: idx === 0 ? 0 : -90,
        transformOrigin: originOffset,
        backfaceVisibility: 'hidden',
      });
    });
    counterChars.forEach((counter, idx) => {
      gsap.set(counter.chars, {
        rotationX: idx === 0 ? 0 : -90,
        transformOrigin: originOffset,
        backfaceVisibility: 'hidden',
      });
    });
    descLines.forEach((d, idx) => {
      gsap.set(d.lines, {
        rotationX: idx === 0 ? 0 : -90,
        transformOrigin: descOriginOffset,
        backfaceVisibility: 'hidden',
      });
    });

    // Add this right where you initialize your layout states (Step 1 in your TS file)
    gsap.set('.step-bg', {
      transformOrigin: 'center center',
      scale: 1.01, // 🌟 Forces a tiny bleed margin to mask subpixel rounding gaps
      force3D: true, // 🌟 Keeps elements locked into GPU rendering mode
    });

    const stepsTl = gsap.timeline({
      scrollTrigger: {
        trigger: stepsSection,
        start: 'top top',
        end: '+=250%',
        pin: true,
        scrub: 1,
        onLeaveBack: () => {
          // Safe global reset when returning to the Hero section
          labelChars.forEach((label, idx) => {
            gsap.killTweensOf(label.chars);
            gsap.set(label.chars, { rotationX: idx === 0 ? 0 : -90 });
          });
          counterChars.forEach((c, idx) => gsap.set(c.chars, { rotationX: idx === 0 ? 0 : -90 }));
          descLines.forEach((d, idx) => gsap.set(d.lines, { rotationX: idx === 0 ? 0 : -90 }));
        },
      },
      defaults: { ease: 'none' },
    });

    // Handle panel loop transitions
    leftSections.forEach((section, index) => {
      if (index === 0) return;

      // Isolate targeted components dynamically from their index anchors
      const lO = leftSections[index].querySelector('.step-outer');
      const lI = leftSections[index].querySelector('.step-inner');
      const rO = rightSections[index].querySelector('.step-outer');
      const rI = rightSections[index].querySelector('.step-inner');
      const trO = topRightSections[index].querySelector('.step-outer');
      const trI = topRightSections[index].querySelector('.step-inner');
      const blO = bottomLeftSections[index].querySelector('.step-outer');
      const blI = bottomLeftSections[index].querySelector('.step-inner');

      // Fade-in the container blocks
      stepsTl.to(
        [
          leftSections[index],
          rightSections[index],
          topRightSections[index],
          bottomLeftSections[index],
        ],
        { autoAlpha: 1, duration: 0.1 },
      );

      // Execute synchronized sliding animations
      stepsTl
        // Left and Right Loops (Slide right-to-left)
        .fromTo(lO, { xPercent: 100 }, { xPercent: 0 }, index)
        .fromTo(lI, { xPercent: -100 }, { xPercent: 0 }, index)
        .fromTo(rO, { xPercent: 100 }, { xPercent: 0 }, index)
        .fromTo(rI, { xPercent: -100 }, { xPercent: 0 }, index)

        // Top Right Loop (Slides left-to-right)
        .fromTo(trO, { xPercent: -100 }, { xPercent: 0 }, index)
        .fromTo(trI, { xPercent: 100 }, { xPercent: 0 }, index)
        .fromTo(blO, { xPercent: -100 }, { xPercent: 0 }, index)
        .fromTo(blI, { xPercent: 100 }, { xPercent: 0 }, index);

      // 3. THE 3D SCROLL CYLINDER LOOP
      stepsTl.add(() => {
        const isScrollingDown = stepsTl.scrollTrigger?.direction === 1;

        // Identify active elements based on scroll direction
        const activeIdx = isScrollingDown ? index - 1 : index;
        const targetIdx = isScrollingDown ? index : index - 1;

        const splitOut = labelChars[activeIdx];
        const splitIn = labelChars[targetIdx];

        const countOut = counterChars[activeIdx];
        const countIn = counterChars[targetIdx];

        // 🌟 Extract paragraph layout active line nodes
        const linesOut = descLines[activeIdx];
        const linesIn = descLines[targetIdx];

        // Kill running tweens to prevent scroll clipping overrides
        gsap.killTweensOf([
          ...splitOut.chars,
          ...splitIn.chars,
          ...countOut.chars,
          ...countIn.chars,
          ...linesOut.lines,
          ...linesIn.lines,
        ]);

        const flipTl = gsap.timeline();

        if (isScrollingDown) {
          flipTl
            // Spin character components
            .to([splitOut.chars, countOut.chars], {
              rotationX: 90,
              transformOrigin: originOffset,
              stagger: 0.03,
              duration: 0.35,
              ease: 'none',
            })
            // 🌟 Spin outgoing description lines
            .to(
              linesOut.lines,
              {
                rotationX: 90,
                transformOrigin: descOriginOffset,
                stagger: 0.05,
                duration: 0.4,
                ease: 'none',
              },
              0,
            )

            // Spin incoming character components
            .fromTo(
              [splitIn.chars, countIn.chars],
              { rotationX: -90 },
              {
                rotationX: 0,
                transformOrigin: originOffset,
                stagger: 0.03,
                duration: 0.35,
                ease: 'none',
              },
              '<0.12',
            )
            // 🌟 Spin incoming description lines
            .fromTo(
              linesIn.lines,
              { rotationX: -90 },
              {
                rotationX: 0,
                transformOrigin: descOriginOffset,
                stagger: 0.05,
                duration: 0.4,
                ease: 'none',
              },
              '<0.05',
            );
        } else {
          flipTl
            .to([splitOut.chars, countOut.chars], {
              rotationX: -90,
              transformOrigin: originOffset,
              stagger: 0.03,
              duration: 0.35,
              ease: 'none',
            })
            .to(
              linesOut.lines,
              {
                rotationX: -90,
                transformOrigin: descOriginOffset,
                stagger: 0.05,
                duration: 0.4,
                ease: 'none',
              },
              0,
            )

            .fromTo(
              [splitIn.chars, countIn.chars],
              { rotationX: 90 },
              {
                rotationX: 0,
                transformOrigin: originOffset,
                stagger: 0.03,
                duration: 0.35,
                ease: 'none',
              },
              '<0.12',
            )
            .fromTo(
              linesIn.lines,
              { rotationX: 90 },
              {
                rotationX: 0,
                transformOrigin: descOriginOffset,
                stagger: 0.05,
                duration: 0.4,
                ease: 'none',
              },
              '<0.05',
            );
        }
      }, index - 0.2);
    });

    return stepsTl;
  }
}
