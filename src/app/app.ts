import { AfterViewInit, Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { filter, skip, take } from 'rxjs';
import { ScrollTriggerReadyService } from './core/services/scroll-trigger-ready';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnInit {
  protected readonly title = signal('mega-project');
  private footer = viewChild.required<Footer>(Footer);
  private router = inject(Router);
  private readyService = inject(ScrollTriggerReadyService);

  constructor() {
    this.readyService
      .onReady$()
      .pipe(
        take(1), // exactly once
      )
      .subscribe(() => {
        this.footer().footerAnimation();
        this.footer().initLinkScramble();
        ScrollTrigger.refresh();
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

  ngAfterViewInit(): void {
  }
}
