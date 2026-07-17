import {
  afterNextRender,
  AfterViewInit,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { filter, skip, take } from 'rxjs';
import { ScrollTriggerReadyService } from './core/services/scroll-trigger-ready';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Preloader } from './layout/preloader/preloader';
import { PreLoaderReady } from './core/services/pre-loader-ready';
import { ThreeCanvasHost } from './shared/components/three-canvas-host/three-canvas-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, Navbar, Preloader, ThreeCanvasHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('mega-project');
  protected readonly showPreloader = signal(true);
  private readonly preloaderReady = inject(PreLoaderReady);

  private footer = viewChild.required<Footer>(Footer);
  private router = inject(Router);
  private readyService = inject(ScrollTriggerReadyService);

  constructor() {
    afterNextRender(() => {
      this.footer().initLinkScramble();
      window.scrollTo(0, 0);
    });

    this.readyService.onReady$().subscribe(() => {
      requestAnimationFrame(() => {
        this.footer().initMorphAnimation();
        this.footer().initDropChainAnimation();
        ScrollTrigger.refresh();
      });
    });
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        skip(1),
      )
      .subscribe(() => {
        ScrollTrigger.refresh();
      });
  }
  protected onPreloaderFinished(): void {
    this.showPreloader.set(false);
    this.preloaderReady.signal();
  }
}
