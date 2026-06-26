import { AfterViewInit, Component, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  protected readonly title = signal('mega-project');
  private footer = viewChild<Footer>(Footer);

  ngAfterViewInit(): void {
    // A small operational frame macro-task delay ensures
    // the active sub-routes inside <router-outlet> are fully drawn.
    setTimeout(() => {
      const footerInstance = this.footer();
      if (footerInstance) {
        // Run the trigger generation sequence
        footerInstance.footerAnimation();

        // Instantly force GSAP to sweep the real page height and fix its math
        ScrollTrigger.refresh();
      }
    }, 150); // 150ms is the sweet spot for router template rendering
  }
}
