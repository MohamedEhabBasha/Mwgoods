import { ChangeDetectionStrategy, Component, ElementRef, viewChild, viewChildren } from '@angular/core';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { OrbitalButton } from '../../../../shared/components/orbital-button/orbital-button';

@Component({
  selector: 'app-hp-steps-showcase',
  imports: [OrbitalButton],
  templateUrl: './hp-steps-showcase.html',
  styleUrl: './hp-steps-showcase.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HPStepsShowcase {
  // Separate Left and Right elements cleanly
  private steps_section = viewChild.required<ElementRef<HTMLElement>>('stepsSection');
  private step_sectionsLeft = viewChildren<ElementRef<HTMLElement>>('stepSectionLeft');
  private step_sectionsRight = viewChildren<ElementRef<HTMLElement>>('stepSectionRight');
  private step_sectionsTopRight = viewChildren<ElementRef<HTMLElement>>('stepSectionTopRight');
  private step_sectionsBottomLeft = viewChildren<ElementRef<HTMLElement>>('stepSectionBottomLeft');

  steps_list = [
    { text: 'DISCOVER', class: 'first', videoURL: 'home/discover video.webm' },
    { text: 'COMMUNITY', class: 'second', videoURL: 'home/community video.webm' },
    { text: 'SELLING', class: 'third', videoURL: 'home/selling video.webm' },
  ];

  public animateStepsSection(): gsap.core.Timeline {
    // 1. DOM Element Retrieval via Angular Signals
    const stepsSection = this.steps_section().nativeElement;
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

    // Corner panels and the "Discover" CTA are `hidden lg:block` in the template — below
    // that breakpoint they're display:none, so skip animating them entirely instead of
    // paying for scrub-linked transform writes nobody can see.
    const isElementVisible = (el: Element | null | undefined): boolean =>
      !!el && (el as HTMLElement).offsetParent !== null;
    const showsCornerPanels = isElementVisible(topRightSections[0]);

    // 2. Query Text and Isolated Button Wrapper Components
    const labelElements = gsap.utils.toArray<HTMLElement>('.step-label');
    const counterElements = gsap.utils.toArray<HTMLElement>('.counter-label');
    const descElements = gsap.utils.toArray<HTMLElement>('.desc-label');
    const orbitalBtnWrappers = gsap.utils.toArray<HTMLElement>('.step-btn-wrapper'); // 🌟 Target Wrapper Divs
    const showsDiscoverButton = isElementVisible(orbitalBtnWrappers[0]);

    // 3D Depth Configurations
    const depth = -12;
    const originOffset = `50% 50% ${depth}px`;
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

    // Apply subpixel rendering fix to background images
    gsap.set('.step-bg', {
      transformOrigin: 'center center',
      scale: 1.015,
      force3D: true,
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
        gsap.set([lOuter, lInner, rOuter, rInner, trOuter, trInner, blOuter, blInner], {
          xPercent: 0,
        });
      } else {
        gsap.set([lOuter, rOuter], { xPercent: 100 });
        gsap.set([lInner, rInner], { xPercent: -100 });
        gsap.set([trOuter, blOuter], { xPercent: -100 });
        gsap.set([trInner, blInner], { xPercent: 100 });
      }
    });

    // Split Text Initialization
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

    // 🌟 Initialize separate clip paths for button wrappers
    gsap.set(orbitalBtnWrappers, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(orbitalBtnWrappers[0], { clipPath: 'inset(0% 0% 0% 0%)' });

    // Main Timeline Configuration
    const stepsTl = gsap.timeline({
      scrollTrigger: {
        trigger: stepsSection,
        start: 'top top',
        end: '+=320%',
        pin: true,
        anticipatePin: 1,
        pinSpacing: true,
        scrub: 1,
        onLeaveBack: () => {
          // Safe global resets when scrolling completely back up
          labelChars.forEach((label, idx) => {
            gsap.killTweensOf(label.chars);
            gsap.set(label.chars, { rotationX: idx === 0 ? 0 : -90 });
          });
          counterChars.forEach((c, idx) => gsap.set(c.chars, { rotationX: idx === 0 ? 0 : -90 }));
          descLines.forEach((d, idx) => gsap.set(d.lines, { rotationX: idx === 0 ? 0 : -90 }));

          // 🌟 Reset the button wrapper clips safely on scroll exit
          orbitalBtnWrappers.forEach((btn, idx) => {
            gsap.killTweensOf(btn);
            gsap.set(btn, { clipPath: idx === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)' });
          });
        },
      },
      defaults: { ease: 'none' },
    });

    // Handle panel loop transitions
    leftSections.forEach((section, index) => {
      if (index === 0) return;

      const lO = leftSections[index].querySelector('.step-outer');
      const lI = leftSections[index].querySelector('.step-inner');
      const rO = rightSections[index].querySelector('.step-outer');
      const rI = rightSections[index].querySelector('.step-inner');

      const revealTargets = [leftSections[index], rightSections[index]];
      if (showsCornerPanels) {
        revealTargets.push(topRightSections[index], bottomLeftSections[index]);
      }
      stepsTl.to(revealTargets, { autoAlpha: 1, duration: 0.1 });

      // Image transitions stay scrubbed to keep scrolling interactive
      stepsTl
        .fromTo(lO, { xPercent: 100 }, { xPercent: 0 }, index)
        .fromTo(lI, { xPercent: -100 }, { xPercent: 0 }, index)
        .fromTo(rO, { xPercent: 100 }, { xPercent: 0 }, index)
        .fromTo(rI, { xPercent: -100 }, { xPercent: 0 }, index);

      if (showsCornerPanels) {
        const trO = topRightSections[index].querySelector('.step-outer');
        const trI = topRightSections[index].querySelector('.step-inner');
        const blO = bottomLeftSections[index].querySelector('.step-outer');
        const blI = bottomLeftSections[index].querySelector('.step-inner');

        stepsTl
          .fromTo(trO, { xPercent: -100 }, { xPercent: 0 }, index)
          .fromTo(trI, { xPercent: 100 }, { xPercent: 0 }, index)
          .fromTo(blO, { xPercent: -100 }, { xPercent: 0 }, index)
          .fromTo(blI, { xPercent: 100 }, { xPercent: 0 }, index);
      }

      // 🌟 3. THE TRIGGERED FLIP TIMELINE (NOT SCRUBBED)
      stepsTl.add(() => {
        const isScrollingDown = stepsTl.scrollTrigger?.direction === 1;

        const activeIdx = isScrollingDown ? index - 1 : index;
        const targetIdx = isScrollingDown ? index : index - 1;

        const splitOut = labelChars[activeIdx];
        const splitIn = labelChars[targetIdx];
        const countOut = counterChars[activeIdx];
        const countIn = counterChars[targetIdx];
        const linesOut = descLines[activeIdx];
        const linesIn = descLines[targetIdx];

        // Isolate button wrappers for current snap tick
        const btnWrapperOut = orbitalBtnWrappers[activeIdx];
        const btnWrapperIn = orbitalBtnWrappers[targetIdx];
        // The "Discover" wrapper (index 0) is hidden below `lg` — skip animating it there
        const animateBtnOut = showsDiscoverButton || activeIdx !== 0;
        const animateBtnIn = showsDiscoverButton || targetIdx !== 0;

        // Clear running animations on text and wrappers to preserve sync states
        gsap.killTweensOf([
          ...splitOut.chars,
          ...splitIn.chars,
          ...countOut.chars,
          ...countIn.chars,
          ...linesOut.lines,
          ...linesIn.lines,
          btnWrapperOut,
          btnWrapperIn,
        ]);

        const flipTl = gsap.timeline();

        if (isScrollingDown) {
          flipTl
            // Spin 3D elements
            .to([splitOut.chars, countOut.chars], {
              rotationX: 90,
              transformOrigin: originOffset,
              stagger: 0.02,
              duration: 0.35,
              ease: 'none',
            })
            .to(
              linesOut.lines,
              {
                rotationX: 90,
                transformOrigin: descOriginOffset,
                stagger: 0.02,
                duration: 0.4,
                ease: 'none',
              },
              0,
            );

          // 🌟 Snap-Wipe Outgoing Button Wrapper UP
          if (animateBtnOut) {
            flipTl.to(
              btnWrapperOut,
              { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.35, ease: 'power1.inOut' },
              0,
            );
          }

          flipTl
            // Bring in incoming elements
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
            .fromTo(
              linesIn.lines,
              { rotationX: -90 },
              {
                rotationX: 0,
                transformOrigin: descOriginOffset,
                stagger: 0.02,
                duration: 0.4,
                ease: 'none',
              },
              '<0.05',
            );

          // 🌟 Snap-Wipe Incoming Button Wrapper UP from bottom
          if (animateBtnIn) {
            flipTl.fromTo(
              btnWrapperIn,
              { clipPath: 'inset(100% 0% 0% 0%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.35, ease: 'power1.inOut' },
              '<0.05',
            );
          }
        } else {
          flipTl
            // Spin 3D elements in reverse
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
            );

          // 🌟 Snap-Wipe Outgoing Button Wrapper DOWN
          if (animateBtnOut) {
            flipTl.to(
              btnWrapperOut,
              { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.35, ease: 'power1.inOut' },
              0,
            );
          }

          flipTl
            // Bring back previous elements
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

          // 🌟 Snap-Wipe Incoming Button Wrapper DOWN from top
          if (animateBtnIn) {
            flipTl.fromTo(
              btnWrapperIn,
              { clipPath: 'inset(0% 0% 100% 0%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.35, ease: 'power1.inOut' },
              '<0.05',
            );
          }
        }
      }, index - 0.2);
    });

    stepsTl.to({}, { duration: 0.5 });

    return stepsTl;
  }
}