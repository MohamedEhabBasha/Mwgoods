import {
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { OrbitalButton } from "../../../shared/components/orbital-button/orbital-button";

@Component({
  selector: 'app-home-cta',
  standalone: true,
  imports: [OrbitalButton],
  templateUrl: './home-cta.html',
  styleUrl: './home-cta.css',
})
export class HomeCta implements OnDestroy {
  @ViewChild('carousel', { static: true }) carousel!: ElementRef<HTMLDivElement>;
  @ViewChild('ctaButton') ctaButton!: ElementRef<HTMLDivElement>;

  @ViewChildren('card') cardElements!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChildren('leftImg') leftImgElements!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChildren('rightImg') rightImgElements!: QueryList<ElementRef<HTMLDivElement>>;

  left_images = [
    {
      src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'success stories',
    },
    {
      src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'success stories',
    },
    {
      src: 'https://cdn.pixabay.com/photo/2021/07/05/09/35/man-6388639_1280.jpg',
      alt: 'success stories',
    },
    {
      src: 'https://images.pexels.com/photos/36645466/pexels-photo-36645466.jpeg',
      alt: 'success stories',
    },
    {
      src: 'https://cdn.pixabay.com/photo/2016/11/21/12/42/beard-1845166_1280.jpg',
      alt: 'success stories',
    },
  ];
  right_images = [
    {
      src: 'https://images.unsplash.com/vector-1738293681271-4a36c9ae10c6?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'logo',
    },
    {
      src: 'https://images.unsplash.com/vector-1740203810200-39892b06a0ae?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'logo',
    },
    {
      src: 'https://images.unsplash.com/vector-1762611332940-5c5faac572a2?q=80&w=713&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'logo',
    },
    {
      src: 'https://cdn.pixabay.com/photo/2024/01/25/06/56/ai-generated-8531085_1280.png',
      alt: 'logo',
    },
    {
      src: 'https://images.unsplash.com/vector-1777830637918-1cfefd19c84c?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'logo',
    },
  ];

  radius = 150;
  imgRadius = 400; // Large radius pushes half of the circle off-screen left and right
  progress = { value: 0 };
  private scrollTimeline!: gsap.core.Timeline;
  private hasButtonAppeared = false;

  public scrollAnimation() {
    const totalWords = this.cardElements.length;

    this.scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: this.carousel.nativeElement,
        start: 'top top',
        end: '+=250%',
        pin: true,
        anticipatePin: 1,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    this.scrollTimeline.to({}, { duration: 0.1 });

    this.scrollTimeline.to(this.progress, {
      value: 1,
      ease: 'none',
      onUpdate: () => {
        this.animate();
        this.animateSemicircleGallery(); // Sync image wheel rotation

        if (this.progress.value >= 0.95 && !this.hasButtonAppeared) {
          this.revealButtonPermanently();
        }
      },
    });

    this.scrollTimeline.to({}, { duration: 0.3 });

    // Initial positioning sweeps
    this.animate();
    this.animateSemicircleGallery();
  }

  private animateSemicircleGallery() {
    const leftImages = this.leftImgElements.toArray();
    const rightImages = this.rightImgElements.toArray();
    const total = leftImages.length;

    const processImageTrack = (el: HTMLDivElement, index: number, isLeft: boolean) => {
      // Synchronize index spacing over progress steps
      const theta = index / (total - 1) - this.progress.value;

      // Control how wide the vertical curve spans (Math.PI * 0.8 keeps it slightly flatter)
      const angle = theta * Math.PI * 0.8;

      // Semicircle equations:
      // Left side curves inward rightwards (+X), Right side curves inward leftwards (-X)
      const xOffset = Math.cos(angle) * (this.imgRadius * 0.4);
      const x = isLeft ? -100 + xOffset : 100 - xOffset;
      const y = Math.sin(angle) * this.imgRadius;

      // Add a clean mechanical wheel rotation tilt as images roll on the arc
      const rotationZ = isLeft ? angle * (180 / Math.PI) * 0.3 : -angle * (180 / Math.PI) * 0.3;

      el.style.transform = `translate3d(${x}px, ${y}px, 0px) rotateZ(${rotationZ}deg)`;

      // Handle soft opacity fading as images submerge back into viewport edges
      const fadeBoundary = Math.cos(angle);
      el.style.opacity = gsap.utils.clamp(0, 1, fadeBoundary * 1.5).toString();
    };

    leftImages.forEach((imgRef, i) => processImageTrack(imgRef.nativeElement, i, true));
    rightImages.forEach((imgRef, i) => processImageTrack(imgRef.nativeElement, i, false));
  }

  private revealButtonPermanently() {
    this.hasButtonAppeared = true;
    gsap.to(this.ctaButton.nativeElement, {
      opacity: 1,
      scale: 1,
      pointerEvents: 'auto',
      duration: 0.6,
      ease: 'back.out(1.7)',
    });
  }

  private animate() {
    const cards = this.cardElements.toArray();
    cards.forEach((cardRef, index) => {
      const el = cardRef.nativeElement;
      const theta = index / (cards.length - 1) - this.progress.value;
      const angle = theta * Math.PI * 1.5;

      const y = Math.sin(angle) * this.radius;
      const z = Math.cos(angle) * this.radius;
      const rotationX = -angle * (180 / Math.PI);

      el.style.transform = `translate3d(0px, ${y}px, ${z}px) rotateX(${rotationX}deg)`;

      const zIndex = Math.round(z + this.radius);
      el.style.zIndex = zIndex.toString();

      const depthOpacity = gsap.utils.mapRange(-this.radius * 0.5, this.radius, 0, 1, z);
      el.style.opacity = gsap.utils.clamp(0, 1, depthOpacity).toString();
    });
  }

  ngOnDestroy(): void {
    if (this.scrollTimeline) this.scrollTimeline.kill();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
}
